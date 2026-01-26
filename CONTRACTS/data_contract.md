# DATA_CONTRACT

## Zweck
Dieses Dokument definiert die Datenobjekte und Persistenz als Vertrag zwischen:
- Backend API
- Workflow/Agent Orchestrator
- Storage (Redis, optional PostgreSQL)

---

## 1) Identifiers
- `team_id`: string (z.B. `team_123`)
- `build_id`: string (z.B. `build_456`)
- `agent_run_id`: string (z.B. `run_789`)

---

## 2) Core Entities

### 2.1 Team
- id: string
- name: string
- repo: string
- preset: string
- workflow:
  - phase: string
  - iteration: number
  - created_at: string (ISO)
  - updated_at: string (ISO)

### 2.2 Build
- id: string
- team_id: string
- preset: string
- status: queued | running | succeeded | failed | cancelled
- started_at: string (ISO)
- finished_at?: string (ISO)

### 2.3 AgentRun
- id: string
- build_id: string
- agent: supervisor | architect | coach | code | review | test | docs | vision
- model: string
- status: queued | running | succeeded | failed
- started_at: string (ISO)
- finished_at?: string (ISO)
- usage:
  - input_tokens: number
  - output_tokens: number
  - total_tokens: number
  - cost_usd: number

---

## 3) Redis Schema (Minimum)

### 3.1 Keys
- `team:{team_id}` → Team JSON
- `team:{team_id}:builds` → list/set build_ids
- `build:{build_id}` → Build JSON
- `build:{build_id}:runs` → list/set agent_run_ids
- `run:{agent_run_id}` → AgentRun JSON

### 3.2 Indizes (optional)
- `teams` → set team_ids
- `builds` → set build_ids

---

## 4) Consistency Rules
- Team.phase darf nur über State Machine Übergänge geändert werden.
- Ein Build gehört genau zu einem Team.
- AgentRuns gehören genau zu einem Build.

---

## 5) API Mapping Hinweise
Siehe `config/api_contract.md` für Response-Envelope und Statuscodes.
