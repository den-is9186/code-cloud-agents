# 🚀 START IMPLEMENTATION NOW!

**Datum:** 2026-01-26
**Status:** ✅ ALLE ENTSCHEIDUNGEN GETROFFEN - BEREIT ZUM START!

---

## ✅ ALLE ENTSCHEIDUNGEN GETROFFEN

### 1. Auth-Methode: **Hybrid** ✅
- Email + Password Login
- OAuth GitHub Integration
- OAuth Google (optional)
- 2FA (TOTP + Backup Codes)
- Zeit: ~7h

### 2. Security Fixes: **SOFORT** ✅
- Phase 0 startet JETZT
- Vor allen anderen Features
- SEC-001, SEC-002, BUG-001 bis BUG-005
- Zeit: ~3h

### 3. Database: **Redis + PostgreSQL (Hybrid)** ✅
- Redis: Real-time State, Sessions, Cache, Pub/Sub
- PostgreSQL: Users, Teams, Builds (history), Cost Analytics
- Write-Behind Sync + Read-Through Cache
- Kosten: ~€25/Monat

### 4. Scout Local: **Drittanbieter API** ✅
- User hostet auf Drittserver
- User stellt API Endpoint bereit
- Custom Agent Profil wird erstellt
- Benötigt: API URL + Key

### 5. Vision: **Screenshot → Code** ✅
- Feature wird implementiert
- Preset V (Qwen3 Omni) + IQ (Scout Local)
- Zeit: ~12h

### 6. GitHub Secrets: **Später** ✅
- User richtet ein vor Queue Processor
- HF_API_KEY, NOVITA_API_KEY, GITHUB_CLIENT_ID, etc.

---

## 📋 ALLE DOKUMENTE ERSTELLT

### Heute erstellt (14 Dateien):
1. ✅ **NEUE_INFORMATIONEN_GEFUNDEN.md** - 14 neue Topics aus FINAL files
2. ✅ **DASHBOARD_IMPLEMENTATION_TASKS.md** - 20 Tasks (49h)
3. ✅ **ÄNDERUNGEN_ZUSAMMENFASSUNG.md** - Complete overview
4. ✅ **REVIEW_CHECKLISTE.md** - Systematic review
5. ✅ **USER_MANAGEMENT_SPEC.md** - Auth + 2FA (6h)
6. ✅ **VISION_SCREENSHOT_TO_CODE_SPEC.md** - Vision feature (12h)
7. ✅ **IMPLEMENTATION_START_READY.md** - Complete roadmap
8. ✅ **ops/OPEN_QUESTIONS.md** - All decisions tracker
9. ✅ **CONTRACTS/CONTRACT_VERIFICATION.md** - Contract rules
10. ✅ **CONTRACTS/DATA_CONTRACT.md** - Data structures
11. ✅ **DATABASE_ARCHITECTURE.md** - Redis + PostgreSQL architecture
12. ✅ **DOCUMENTATION_INDEX.md** - Central docs index
13. ✅ **SECURITY.md** - Threat model + fixes
14. ✅ **PROJECT_STATE.md** - Project state template

### Aktualisiert:
- ✅ **MASTER_RUNBOOK.md** - v2.0 Multi-Agent System
- ✅ **capabilities.yml** - v2.0 (11 neue Capabilities)
- ✅ **PRODUCTION_CHECKLIST.md** - Deployment checklist

---

## 🎯 IMPLEMENTATION PLAN

### **PHASE 0: Security Fixes (3h) ← JETZT!**

#### SEC-001: Path Traversal Fix
**File:** `src/tools/index.ts`
```typescript
// BEFORE (VULNERABLE)
const filePath = path.join(BASE_DIR, userInput);
fs.readFileSync(filePath);  // ❌ Path traversal möglich

// AFTER (SECURE)
function validatePath(userPath: string): string {
  const resolved = path.resolve(BASE_DIR, userPath);
  if (!resolved.startsWith(path.resolve(BASE_DIR))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

const safePath = validatePath(userInput);
fs.readFileSync(safePath);  // ✅ Sicher
```

#### SEC-002: Command Injection Fix
**File:** `src/tools/index.ts`
```typescript
// BEFORE (VULNERABLE)
exec(`git commit -m "${userMessage}"`, callback);  // ❌ Shell injection!

// AFTER (SECURE)
execFile('git', ['commit', '-m', userMessage], callback);  // ✅ Sicher
```

#### BUG-001: JSON Schema Validation
**Files:** `src/agents/*.ts`
```typescript
// BEFORE (UNSAFE)
const result = JSON.parse(llmResponse);
const runbook = result.runbook;  // ❌ Kann crashen

// AFTER (SAFE)
import { z } from 'zod';

const RunbookSchema = z.object({
  runbook: z.string(),
  steps: z.array(z.object({
    name: z.string(),
    commands: z.array(z.string())
  }))
});

function safeJsonParse<T>(json: string, schema: z.ZodSchema<T>): T {
  const parsed = JSON.parse(json);
  return schema.parse(parsed);
}

const result = safeJsonParse(llmResponse, RunbookSchema);  // ✅ Sicher
```

#### BUG-002: Supervisor Error Handling
**File:** `src/agents/supervisor.ts`
```typescript
// BEFORE (UNSAFE)
const agent = this.agents.get(agentName)!;  // ❌ Kann undefined sein

// AFTER (SAFE)
function getAgent(agentName: string): Agent {
  const agent = this.agents.get(agentName);
  if (!agent) {
    throw new Error(`Agent not found: ${agentName}`);
  }
  return agent;
}
```

#### BUG-003: Race Condition Fix
**File:** `src/agents/supervisor.ts`
```typescript
// BEFORE (UNSAFE)
let results = [];
agents.forEach(async (agent) => {
  const result = await agent.run();
  results.push(result);  // ❌ Unsafe mutation!
});

// AFTER (SAFE)
const results = await Promise.all(
  agents.map(agent => agent.run())
);  // ✅ Sicher
```

#### BUG-004: LLM Client Retry/Timeout
**File:** `src/llm/client.ts`
```typescript
// BEFORE (NO RETRY)
const response = await fetch(API_URL, options);  // ❌ Kein Retry

// AFTER (WITH RETRY)
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  timeout = 60000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const result = await fn();
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      if (err.status === 429 || err.status >= 500) {
        const backoff = Math.min(2 ** i * 1000, 30000);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### BUG-005: Chat History Pruning
**File:** `src/chat/assistant.ts`
```typescript
// BEFORE (UNBOUNDED)
this.messages.push(message);  // ❌ Kontext wächst unbegrenzt

// AFTER (SLIDING WINDOW)
const MAX_MESSAGES = 50;

function addMessage(message: Message): void {
  this.messages.push(message);
  if (this.messages.length > MAX_MESSAGES) {
    this.messages = [
      this.messages[0],  // Keep system message
      ...this.messages.slice(-(MAX_MESSAGES - 1))
    ];
  }
}
```

---

### **PHASE 1: Backend Foundation (11h)**
- Task 1: Team CRUD API Endpoints (2h)
- Task 2: Workflow State Machine (4h)
- Task 3: Approval/Reject Endpoints (2h)
- Task 4: Redis Schema implementieren (2h)
- Task 5: Preset Konfiguration laden (1h)

### **PHASE 1.5: User Management + 2FA (7h)**
- User Model + bcrypt (1h)
- JWT Service (1h)
- Auth Routes (Email + Password) (2h)
- OAuth GitHub Integration (2h)
- 2FA Implementation (TOTP + Backup Codes) (1h)

### **PHASE 2: Agent System (9h)**
- Task 6: Agent Orchestrator (4h)
- Task 7: Build Tracking (3h)
- Task 8: Kosten-Tracking (2h)

### **PHASE 2.5: IQ Preset Integration (4h)**
- Model Registry erweitern (1h)
- LLM Client: HuggingFace Support (1h)
- LLM Client: Local LLM Support (1h)
- Agent Defaults (1h)

### **PHASE 3: Dashboard UI (7h)**
- Task 9: Team Dashboard UI (4h)
- Task 10: Team Settings UI (3h)

### **PHASE 3.5: Auth UI (3h)**
- Login Component (1h)
- Enable 2FA Component (1h)
- Protected Routes (1h)

### **PHASE 4: Workflow UI (8h)**
- Task 11: Approval Dialog UI (3h)
- Task 12: Build Progress UI (3h)
- Task 13: Log Streaming (SSE/WS) (2h)

### **PHASE 4.5: Vision Feature (12h)**
- Screenshot Upload API (2h)
- Vision Agent (3h)
- Code Generator Agent (3h)
- UI Components (2h)
- Testing (2h)

### **PHASE 5: Polish (14h)**
- Task 14-20: Notifications, Refactor, Merge, Multi-Repo, Tool Builder, Budget Alerts, Reports

### **PHASE 5.5: Queue Automation (2h)**
- queue-task.sh + queue-processor.yml

### **PHASE 6: Documentation (3h)**
- Scout Local Setup Guide
- Deployment Guide
- Security Audit

---

## ⏱️ ZEITPLAN

### Minimal MVP (ohne Vision):
```
Phase 0: Security Fixes       3h
Phase 1: Backend              11h
Phase 1.5: User Management     7h
Phase 2: Agent System          9h
Phase 2.5: IQ Preset           4h
Phase 3: Dashboard UI          7h
Phase 3.5: Auth UI             3h
────────────────────────────────
TOTAL:                        44h (~ 5-6 Tage)
```

### Full MVP (mit Vision):
```
Minimal MVP                   44h
Phase 4: Workflow UI           8h
Phase 4.5: Vision             12h
────────────────────────────────
TOTAL:                        64h (~ 8 Tage)
```

### Complete System:
```
Full MVP                      64h
Phase 5: Polish               14h
Phase 5.5: Queue               2h
Phase 6: Docs                  3h
────────────────────────────────
TOTAL:                        83h (~ 10 Tage)
```

---

## 🛠️ BENÖTIGTE DEPENDENCIES

```bash
# Backend
npm install bcrypt jsonwebtoken speakeasy qrcode zod
npm install passport passport-github2 passport-google-oauth20
npm install pg redis ioredis
npm install ws server-sent-events

# Dev Dependencies
npm install --save-dev @types/bcrypt @types/jsonwebtoken @types/speakeasy @types/qrcode
npm install --save-dev @types/passport @types/passport-github2 @types/passport-google-oauth20
npm install --save-dev @types/pg @types/redis
npm install --save-dev @types/ws
```

---

## 🔧 ENV VARIABLES SETUP

```.env
# Required
NOVITA_API_KEY=...
HF_API_KEY=...
JWT_SECRET=...
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/code_cloud_agents

# OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# Optional
ANTHROPIC_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
IQUEST_ENDPOINT=...
LOCAL_LLM_ENDPOINT=http://localhost:11434
LOG_API_CALLS=true
```

---

## 📦 GITHUB SECRETS (SPÄTER)

**Vor Queue Processor aktivieren:**
- `HF_API_KEY`
- `NOVITA_API_KEY`
- `ANTHROPIC_API_KEY` (optional)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

---

## 🚀 NÄCHSTER SCHRITT

**JETZT STARTEN MIT:**

### Phase 0: Security Fixes (3h)
1. SEC-001: Path Traversal Fix (src/tools/index.ts)
2. SEC-002: Command Injection Fix (src/tools/index.ts)
3. BUG-001: JSON Schema Validation (src/agents/*.ts)
4. BUG-002: Supervisor Error Handling (src/agents/supervisor.ts)
5. BUG-003: Race Condition Fix (src/agents/supervisor.ts)
6. BUG-004: LLM Client Retry/Timeout (src/llm/client.ts)
7. BUG-005: Chat History Pruning (src/chat/assistant.ts)

**Danach:**
- Commit & Push Security Fixes
- Tests laufen lassen
- Phase 1 Backend starten

---

## ✅ ERFOLGSKRITERIEN PHASE 0

- [ ] Alle Security Fixes implementiert
- [ ] Alle Bug Fixes implementiert
- [ ] ESLint Errors behoben
- [ ] TypeScript Errors behoben
- [ ] Tests grün
- [ ] Git committed & pushed

---

**STATUS: 🟢 BEREIT ZUM START!**

**LOS GEHT'S! 🔥**

---

**Erstellt:** 2026-01-26
**Autor:** Claude Code (Sonnet 4.5)
**Alle Entscheidungen:** ✅ GETROFFEN

