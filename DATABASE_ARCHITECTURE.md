# 🗄️ DATABASE ARCHITECTURE

**Datum:** 2026-01-26
**Entscheidung:** Redis + PostgreSQL (Hybrid)
**Status:** Geplant

---

## 🎯 ENTSCHEIDUNG: BEIDES (Redis + PostgreSQL)

**User-Antwort:** "optimalere" → Hybrid Lösung

### Warum Hybrid?
- **Redis:** Speed für Real-time State, Sessions, Cache
- **PostgreSQL:** Relations, Complex Queries, Persistence, History

---

## 📊 RESPONSIBILITY SPLIT

### Redis (In-Memory, Fast)
**Zuständig für:**
- Team State (current phase, status)
- Build State (running, queued)
- User Sessions (JWT tokens)
- Agent Run State (real-time progress)
- Cache (API responses, computed data)
- Pub/Sub (WebSocket/SSE events)

**Data:**
```typescript
// Keys
team:{team_id}                    → Team JSON (current state)
team:{team_id}:current_build      → build_id
build:{build_id}                  → Build JSON (current state)
build:{build_id}:runs             → [agent_run_ids]
run:{agent_run_id}                → AgentRun JSON (current state)
session:{session_id}              → Session JSON
user:{user_id}:sessions           → [session_ids]

// Pub/Sub Channels
team:{team_id}:events             → State changes
build:{build_id}:events           → Agent run events
```

**TTL (Time-to-Live):**
- Sessions: 7 days
- Cache: 1 hour
- State: No TTL (persisted to PostgreSQL periodically)

---

### PostgreSQL (Relational, Persistent)
**Zuständig für:**
- Users (persistent, relations)
- Teams (persistent, history)
- Builds (history, analytics)
- Agent Runs (cost tracking, analytics)
- Cost History (monthly aggregates)
- Audit Logs

**Schema:**
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  twofa_enabled BOOLEAN DEFAULT FALSE,
  twofa_secret TEXT,
  backup_codes TEXT[], -- encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  repo VARCHAR(500) NOT NULL,
  preset VARCHAR(50) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Current State (synced from Redis)
  current_phase VARCHAR(50),
  current_iteration INT DEFAULT 1,

  CONSTRAINT teams_unique_repo UNIQUE (owner_id, repo)
);

CREATE INDEX idx_teams_owner ON teams(owner_id);
CREATE INDEX idx_teams_repo ON teams(repo);

-- Team Members (for multi-user teams)
CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- owner, admin, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (team_id, user_id)
);

-- Builds (History)
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  preset VARCHAR(50) NOT NULL,
  phase VARCHAR(50) NOT NULL, -- prototype, premium
  status VARCHAR(50) NOT NULL, -- queued, running, succeeded, failed, cancelled
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_cost_usd DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_builds_team ON builds(team_id);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_created ON builds(created_at DESC);

-- Agent Runs (Cost Tracking)
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  agent VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- queued, running, succeeded, failed
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  -- Usage
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_build ON agent_runs(build_id);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent);

-- Cost History (Monthly Aggregates)
CREATE TABLE cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- 2026-01
  total_builds INT DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cost_history_unique_month UNIQUE (team_id, month)
);

CREATE INDEX idx_cost_history_team ON cost_history(team_id);
CREATE INDEX idx_cost_history_month ON cost_history(month DESC);

-- Audit Logs (Optional)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- team.created, build.approved, etc.
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_team ON audit_logs(team_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

## 🔄 SYNC STRATEGY

### Redis → PostgreSQL (Write-Behind)
**Trigger:** Agent Run completes, Build finishes

```typescript
// When Build finishes in Redis
async function syncBuildToPostgres(buildId: string) {
  const buildState = await redis.hgetall(`build:${buildId}`);
  const agentRuns = await redis.lrange(`build:${buildId}:runs`, 0, -1);

  // Insert/Update Build in PostgreSQL
  await db.query(`
    INSERT INTO builds (id, team_id, preset, phase, status, started_at, finished_at, total_cost_usd)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      finished_at = EXCLUDED.finished_at,
      total_cost_usd = EXCLUDED.total_cost_usd
  `, [buildState.id, buildState.team_id, buildState.preset, buildState.phase,
      buildState.status, buildState.started_at, buildState.finished_at, buildState.total_cost]);

  // Sync Agent Runs
  for (const runId of agentRuns) {
    const run = await redis.hgetall(`run:${runId}`);
    await db.query(`
      INSERT INTO agent_runs (id, build_id, agent, model, status, started_at, finished_at,
                               input_tokens, output_tokens, total_tokens, cost_usd)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        finished_at = EXCLUDED.finished_at,
        cost_usd = EXCLUDED.cost_usd
    `, [run.id, run.build_id, run.agent, run.model, run.status, run.started_at, run.finished_at,
        run.input_tokens, run.output_tokens, run.total_tokens, run.cost_usd]);
  }
}
```

### PostgreSQL → Redis (Read-Through Cache)
**Trigger:** API request for historical data

```typescript
// Get Team history (from PostgreSQL)
async function getTeamBuilds(teamId: string, page = 1, limit = 10) {
  const cacheKey = `cache:team:${teamId}:builds:page:${page}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from PostgreSQL
  const builds = await db.query(`
    SELECT * FROM builds
    WHERE team_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [teamId, limit, (page - 1) * limit]);

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(builds.rows));

  return builds.rows;
}
```

---

## 🔧 MIGRATION STRATEGY

### Phase 1: Redis Only (MVP)
- Implementiere alle Features mit Redis
- Einfach, schnell zu entwickeln
- Data loss bei Redis crash (akzeptabel für MVP)

### Phase 2: Add PostgreSQL (Production)
- Erstelle PostgreSQL Schema
- Implementiere Write-Behind Sync
- Behalte Redis für Real-time State
- PostgreSQL für Persistence & Analytics

### Phase 3: Optimize (Scale)
- Read-Through Cache für häufige Queries
- Materialized Views für Analytics
- Partitioning für große Tabellen

---

## 📈 PERFORMANCE EXPECTATIONS

### Redis
- **Read:** < 1ms
- **Write:** < 2ms
- **Pub/Sub:** < 5ms latency

### PostgreSQL
- **Simple Query:** < 10ms
- **Complex Join:** < 50ms
- **Aggregation:** < 100ms

### Hybrid Queries
- **Get Team Current State:** Redis only → < 1ms
- **Get Team History:** PostgreSQL + Cache → 10-50ms
- **Cost Analytics:** PostgreSQL → 50-100ms

---

## 🛠️ IMPLEMENTATION TASKS

### Phase 1: Redis Setup (Week 1)
- [ ] Redis Connection Pool
- [ ] Redis Schema (Keys, TTLs)
- [ ] Basic CRUD for Team/Build/Run
- [ ] Pub/Sub for Events

### Phase 2: PostgreSQL Setup (Week 2)
- [ ] PostgreSQL Connection Pool (pg/Prisma)
- [ ] Schema Migration (Drizzle/Knex)
- [ ] Write-Behind Sync
- [ ] Read-Through Cache

### Phase 3: Integration (Week 3)
- [ ] Unified Service Layer
- [ ] Cache Invalidation Strategy
- [ ] Backup & Recovery Plan
- [ ] Monitoring & Alerts

---

## ✅ VORTEILE DER HYBRID-LÖSUNG

1. **Best of Both Worlds**
   - Redis: Real-time State, Speed
   - PostgreSQL: Relations, Analytics, History

2. **Skalierbar**
   - Redis kann horizontal skalieren (Cluster)
   - PostgreSQL kann vertikal skalieren (Read Replicas)

3. **Ausfallsicher**
   - Redis crash → PostgreSQL hat History
   - PostgreSQL slow → Redis hat Current State

4. **Flexibel**
   - Neue Features können Redis-only starten
   - Später zu PostgreSQL migrieren wenn nötig

---

## 📊 KOSTEN

### Redis (Hetzner Cloud)
- **CPX11:** 2 vCPU, 2GB RAM, €4.15/Monat
- **CPX21:** 3 vCPU, 4GB RAM, €8.21/Monat (Empfohlen)

### PostgreSQL (Hetzner Cloud)
- **CPX31:** 4 vCPU, 8GB RAM, €16.13/Monat (Empfohlen)
- **CPX41:** 8 vCPU, 16GB RAM, €31.92/Monat (bei Wachstum)

**Total:** ~€25/Monat für Start

---

## 🚀 NÄCHSTE SCHRITTE

1. ✅ Entscheidung getroffen: Redis + PostgreSQL
2. **Jetzt:** Phase 0 Security Fixes
3. **Dann:** Phase 1 Backend mit Redis
4. **Später:** PostgreSQL Integration (Phase 2)

---

**Erstellt:** 2026-01-26
**Status:** ✅ Entschieden, bereit zur Implementation

