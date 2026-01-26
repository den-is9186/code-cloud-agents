# MASTER RUNBOOK

> Step-by-Step Anleitung von Idee bis Production.

**Regeln:**
- **Contracts sind Gesetz** - Keine stillen Änderungen
- **1 Step pro Antwort** - Bei AI-Coding
- **Tests für jeden Step** - Kein Step ohne grüne Tests
- **Multi-Agent System** - Team-basierter Workflow mit Approval Gates

---

## Step 0 — Projekt-Setup & Entscheidungen

### 0.1 PROJECT_STATE.md ausfüllen
- [ ] Projekt-Ziel definiert (1-2 Sätze)
- [ ] MVP-Features gelistet
- [ ] Phase 2 Features gelistet
- [ ] Tech-Stack Entscheidungen:
  - Deployment: Vercel / Render / Fly / Docker / K8s
  - DB: Redis / PostgreSQL / SQLite / MongoDB
  - Auth: JWT / Session / OAuth / MagicLink
  - UI: Next.js / React / Vue / Dashboard
  - **Multi-Agent Preset:** A (Budget) / B (Optimal) / C (Premium) / D (Smart)

### 0.2 Contracts definieren
- [ ] `CONTRACTS/api_contract.md` - Alle Endpoints (inkl. Team-APIs)
- [ ] `CONTRACTS/data_contract.md` - Alle DB Tabellen (Teams, Builds, Agent Runs)

### 0.3 Capabilities registrieren
- [ ] `capabilities.yml` - Alle Funktionen mit Test-Anforderungen
- [ ] Multi-Agent Capabilities (Team Management, Workflow Control, Build Management)

### 0.4 Multi-Agent System Setup (NEU)
- [ ] Preset-Konfiguration wählen (siehe `config/presets.yml`)
- [ ] Team erstellen via `POST /api/teams`
- [ ] Agent-Modelle konfigurieren (DeepSeek, Claude, etc.)

**Tests:** PROJECT_STATE.md existiert und ist ausgefüllt.

---

## Step 1 — Repo & Basis-Struktur

- [ ] README.md angepasst
- [ ] .gitignore erstellt (node_modules, .env, etc.)
- [ ] .env.example erstellt
- [ ] Ordnerstruktur nach Template
- [ ] Lizenz hinzugefügt
- [ ] **NEU:** Team dem Repo zuweisen via API

**Tests:** `test -f .gitignore && test -f .env.example && test -f LICENSE && echo "OK"`

---

## Step 2 — Backend Skeleton + /health

- [ ] Server startet ohne Fehler (Express/Fastify/etc.)
- [ ] `GET /health` → `{"status":"ok","timestamp":"...","db":{"status":"connected"}}`
- [ ] Strukturiertes Logging aktiv (Winston/Pino)
- [ ] Graceful Shutdown implementiert
- [ ] **NEU:** Redis Connection für Team State

**Tests:**
```bash
curl http://localhost:8080/health | jq .
# Erwarte: status: "ok", db.status: "connected"
```

---

## Step 3 — Database Schema + Migration

- [ ] DB Verbindung funktioniert (Redis + optional PostgreSQL)
- [ ] Schema/Migration erstellt
  - Teams (id, name, repo, preset, workflow_state)
  - Builds (id, team_id, preset, phase, status, cost)
  - Agent Runs (id, build_id, agent, model, tokens, cost)
- [ ] init.sql oder Migration-Tool
- [ ] Indizes für häufige Queries

**Tests:** DB Connection Test, Schema existiert.

---

## Step 4 — Security Basics (PFLICHT)

### 4.1 Authentication
- [ ] Auth-Middleware implementiert
- [ ] Token-Validierung
- [ ] Login/Register Endpoints (falls nötig)
- [ ] Team-Access-Control (User kann nur eigene Teams sehen)

### 4.2 Rate Limiting (PFLICHT)
- [ ] Rate Limiter aktiv
- [ ] Konfigurierbar via ENV
- [ ] Fehler-Response: 429 + JSON
- [ ] **NEU:** Agent API Calls rate-limited (Token Bucket)

### 4.3 CORS (PFLICHT)
- [ ] CORS konfiguriert
- [ ] Erlaubte Origins via ENV
- [ ] Credentials-Handling

### 4.4 Input Validation (PFLICHT)
- [ ] Alle Inputs validiert (Zod/Joi)
- [ ] Type-Checks
- [ ] Length-Limits
- [ ] Sanitization bei Bedarf

**Tests:** Auth-Flow Test, Rate Limit Test, Invalid Input Test.

---

## Step 5 — API Documentation (PFLICHT)

- [ ] OpenAPI/Swagger Spec erstellt (`swagger.json`)
- [ ] Swagger UI unter `/api-docs`
- [ ] Alle Endpoints dokumentiert (inkl. Team/Build/Workflow APIs)
- [ ] Request/Response Schemas definiert
- [ ] Error-Responses dokumentiert

**Tests:** `curl http://localhost:8080/api-docs` erreichbar.

---

## Step 6 — Core Features: Multi-Agent System

### 6.1 Team Management (KRITISCH)
- [ ] `POST /api/teams` - Team erstellen
- [ ] `GET /api/teams` - Alle Teams auflisten
- [ ] `GET /api/teams/:id` - Team Details
- [ ] `PUT /api/teams/:id` - Team aktualisieren
- [ ] `DELETE /api/teams/:id` - Team löschen

### 6.2 Workflow Control (KRITISCH)
- [ ] Workflow State Machine implementieren
  - TEAM_CREATED → PROTOTYPE_RUNNING → AWAITING_APPROVAL
  - AWAITING_APPROVAL → APPROVED → PREMIUM_RUNNING → COMPLETED
  - AWAITING_APPROVAL → REJECTED → PROTOTYPE_RUNNING (neue Iteration)
- [ ] `GET /api/teams/:id/status` - Workflow-Status abrufen
- [ ] `POST /api/teams/:id/approve` - Prototyp bestätigen → Premium Build starten
- [ ] `POST /api/teams/:id/reject` - Prototyp ablehnen → Neu bauen
- [ ] `POST /api/teams/:id/partial` - Teilweise bestätigen → Anpassen
- [ ] `POST /api/teams/:id/skip-premium` - Premium überspringen

### 6.3 Preset Configuration
- [ ] `config/presets.yml` laden (A/B/C/D Varianten)
- [ ] `config/models.yml` laden (DeepSeek, Claude, etc.)
- [ ] `GET /api/teams/:id/preset` - Aktuelles Preset abrufen
- [ ] `PUT /api/teams/:id/preset` - Preset ändern
- [ ] `GET /api/teams/:id/agents` - Agent-Konfiguration abrufen
- [ ] `PUT /api/teams/:id/agents/:agent` - Einzelnen Agent ändern

### 6.4 Build Management
- [ ] `GET /api/teams/:id/builds` - Alle Builds eines Teams
- [ ] `GET /api/teams/:id/builds/:buildId` - Build Details
- [ ] `GET /api/teams/:id/builds/:buildId/logs` - Build Logs (Streaming)
- [ ] `GET /api/teams/:id/builds/:buildId/cost` - Kosten-Breakdown

### 6.5 Agent Orchestration (KRITISCH)
- [ ] Supervisor Agent orchestriert Ablauf
- [ ] Sequential Execution: Architect → Coach → Code → Review → Test → Docs
- [ ] Agent Runs in DB tracken (tokens, cost, status)
- [ ] Error Handling & Fallbacks

**Tests:** Alle Tests für diese Features grün.

---

## Step 7 — Frontend: Dashboard & UI

### 7.1 Team Dashboard
- [ ] Team-Liste anzeigen
- [ ] Team Status visualisieren (PROTOTYPE_RUNNING, AWAITING_APPROVAL, etc.)
- [ ] Kosten pro Team anzeigen
- [ ] Neues Team erstellen

### 7.2 Team Settings
- [ ] Preset auswählen (A/B/C/D)
- [ ] Custom Agent-Konfiguration
- [ ] Kosten-Schätzung anzeigen
- [ ] Einstellungen speichern

### 7.3 Approval Dialog
- [ ] Prototyp-Ergebnis anzeigen (Dateien, Tests, Score)
- [ ] Aktionen: Approve / Reject / Partial / Skip
- [ ] Kommentar-Feld für Feedback
- [ ] Modifications-Liste für Anpassungen

### 7.4 Build Progress
- [ ] Live-Fortschritt anzeigen (Progress Bar)
- [ ] Agent-Status visualisieren (completed, running, pending)
- [ ] Live-Log-Stream (WebSocket/SSE)
- [ ] Kosten-Tracking live

### 7.5 Build Details
- [ ] Dateien-Änderungen anzeigen
- [ ] Test-Ergebnisse visualisieren
- [ ] PR-Link öffnen
- [ ] Kosten-Breakdown

**Tests:** E2E Journey Tests grün (User erstellt Team → Build → Approval → Premium).

---

## Step 7.5 — Contract Verification (PFLICHT)

> **STOPP!** Bevor QA beginnt, prüfe ob alle Komponenten zusammenpassen.
> **Lies:** `docs/CONTRACT_VERIFICATION.md`

- [ ] Contracts finalisiert (keine offenen TODOs)
- [ ] Frontend ↔ Backend: API-Pfade identisch
  - `/api/teams` im Frontend = `/api/teams` im Backend
  - Request/Response Schemas matchen
- [ ] Backend ↔ Database: Queries matchen Schema
  - Redis Keys korrekt (team:{id}, build:{id})
  - Felder in DB = Felder im Code

### Prüfung

```bash
# Frontend API Calls
grep -rn "fetch\|axios" src/frontend/ | grep "/api/"

# Backend Routes
grep -rn "app.get\|app.post\|router" src/backend/ | grep "/api/"

# Vergleiche mit CONTRACTS/api_contract.md
diff <(grep "^### " CONTRACTS/api_contract.md) <(grep -h "router\." src/backend/*.ts)
```

**Tests:** Alle Pfade und Felder stimmen überein.

---

## Step 8 — QA & Regression

- [ ] Alle Unit Tests grün
  - Team CRUD Tests
  - Workflow State Machine Tests
  - Agent Orchestration Tests
  - Cost Calculation Tests
- [ ] Alle Integration Tests grün
  - Full Build Flow Test (A → C)
  - Approval Gate Test
  - Multi-Agent Execution Test
- [ ] Alle E2E Tests grün
  - User Journey: Team erstellen → Prototyp → Approval → Premium → Completed
- [ ] Scorecard (eval/scorecard.yaml) durchlaufen
- [ ] Regression Tests (eval/regression_tests.yaml) grün
- [ ] Code Review abgeschlossen

**Tests:** `npm test` / `pytest` komplett grün.

---

## Step 9 — Production Checklist (PFLICHT)

**Siehe `PRODUCTION_CHECKLIST.md` - ALLES muss abgehakt sein!**

Kurzfassung:
- [ ] Rate Limiting aktiv (API + Agent Calls)
- [ ] CORS konfiguriert
- [ ] Input Validation überall
- [ ] Swagger Docs vollständig (inkl. Team/Build APIs)
- [ ] Strukturiertes Logging (Winston/Pino)
- [ ] Health Check mit DB (Redis + optional PostgreSQL)
- [ ] Error Handler (keine Stack Traces in Prod)
- [ ] Graceful Shutdown
- [ ] Secrets in ENV (nicht im Code)
  - ANTHROPIC_API_KEY
  - OPENROUTER_API_KEY
  - REDIS_URL
  - DATABASE_URL (optional)
- [ ] .env.example vollständig
- [ ] **NEU:** Budget Alerts konfiguriert
- [ ] **NEU:** Kosten-Export funktioniert

---

## Step 10 — Deployment

- [ ] Secrets konfiguriert
  - API Keys (Anthropic, OpenRouter)
  - Redis URL
  - GitHub Token
- [ ] ENV Variables gesetzt
- [ ] Deploy ausgeführt
- [ ] Smoke Test gegen Live-URL
  - `GET /health` grün
  - `POST /api/teams` funktioniert
  - Dashboard erreichbar
- [ ] Monitoring aktiv
  - Logs aggregiert (Datadog/CloudWatch)
  - Error Tracking (Sentry)
  - Uptime Monitor (Better Uptime)

**Tests:**
```bash
curl https://your-app.com/health | jq .
# Erwarte: status: "ok", db.status: "connected"

curl -X POST https://your-app.com/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","repo":"github.com/user/test","preset":"A","task":"Test build"}'
# Erwarte: 201 Created, team_id zurück
```

---

## Checkliste (Kurzform)

```
SETUP:
[ ] PROJECT_STATE.md ausgefüllt
[ ] Contracts definiert (inkl. Team/Build APIs)
[ ] capabilities.yml erstellt (inkl. Multi-Agent)
[ ] Preset konfiguriert (A/B/C/D)

BACKEND:
[ ] /health funktioniert
[ ] Auth implementiert
[ ] Rate Limiting aktiv (API + Agents)
[ ] CORS konfiguriert
[ ] Validation überall (Zod/Joi)
[ ] Swagger Docs (inkl. Team APIs)

MULTI-AGENT SYSTEM:
[ ] Team CRUD APIs
[ ] Workflow State Machine
[ ] Approval/Reject/Skip Endpoints
[ ] Agent Orchestration
[ ] Build Tracking
[ ] Cost Tracking

DASHBOARD:
[ ] Team Dashboard UI
[ ] Team Settings UI
[ ] Approval Dialog UI
[ ] Build Progress UI
[ ] Build Details UI

INTEGRATION:
[ ] CONTRACT_VERIFICATION.md komplett  ← Nach Step 7, vor Step 8
[ ] Frontend ↔ Backend passt
[ ] Backend ↔ Database passt

QUALITY:
[ ] Unit Tests (Team, Workflow, Agents)
[ ] Integration Tests (Full Build Flow)
[ ] E2E Tests (User Journey)
[ ] Code Review

PRODUCTION:
[ ] PRODUCTION_CHECKLIST.md komplett   ← Nach Step 8, vor Step 10
[ ] Smoke Test grün
[ ] Monitoring aktiv
[ ] Budget Alerts konfiguriert
```

---

## Wann welche Datei lesen?

| Step | Datei | Zweck |
|------|-------|-------|
| Step 0 | `PROJECT_STATE.md` | Projekt definieren |
| Step 0 | `CONTRACTS/*.md` | API + DB festlegen |
| Step 0 | `capabilities.yml` | Features + Tests registrieren |
| Step 0 | `config/presets.yml` | Multi-Agent Preset wählen |
| Step 6 | `capabilities.yml` | Features implementieren |
| Step 6 | `config/models.yml` | Agent-Modelle konfigurieren |
| **Step 7.5** | **`docs/CONTRACT_VERIFICATION.md`** | **Komponenten passen zusammen?** |
| Step 8 | `eval/scorecard.yaml` | Qualität prüfen |
| **Step 9** | **`PRODUCTION_CHECKLIST.md`** | **Production-ready?** |
| Step 10 | `ops/RUNBOOK_SUPERVISOR.md` | Deployment überwachen |

---

## Multi-Agent System Workflow

```
USER erstellt Team
    ↓
TEAM_CREATED
    ↓ (auto)
PROTOTYPE_RUNNING (Preset A)
    ↓ Supervisor orchestriert:
    ├─ Architect (DeepSeek R1)
    ├─ Coach (DeepSeek V3.2)
    ├─ Code (DeepSeek V3.2)
    ├─ Review (DeepSeek V3.2)
    ├─ Test (DeepSeek V3.2)
    └─ Docs (DeepSeek V3.2)
    ↓
AWAITING_APPROVAL
    ↓ User entscheidet:
    ├─ APPROVE → PREMIUM_RUNNING (Preset C)
    ├─ REJECT → PROTOTYPE_RUNNING (neue Iteration)
    ├─ PARTIAL → PROTOTYPE_RUNNING (mit Anpassungen)
    └─ SKIP → COMPLETED (Prototyp reicht)
    ↓
PREMIUM_RUNNING (Preset C)
    ↓ Supervisor orchestriert:
    ├─ Architect (Claude Opus 4)
    ├─ Coach (DeepSeek R1)
    ├─ Code (Claude Sonnet 4.5)
    ├─ Review (Claude Opus 4)
    ├─ Test (DeepSeek R1)
    └─ Docs (Claude Sonnet 4.5)
    ↓
COMPLETED ✅
```

---

**Version:** 2.0 (Multi-Agent System)
**Letzte Änderung:** 2026-01-26
**Status:** Aktualisiert mit Dashboard & Workflow
