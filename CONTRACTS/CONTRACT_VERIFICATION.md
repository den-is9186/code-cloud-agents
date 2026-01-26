# CONTRACT_VERIFICATION

## Zweck
Pflicht-Check, dass:
- Frontend ↔ Backend
- Backend ↔ Storage
- Orchestrator ↔ API
kontraktkonform sind.

---

## 1) API Envelope
- **Success (Single):** `{ "data": <object> }`
- **Success (List):** `{ "data": <array>, "pagination": { ... } }`
- **Error:** `{ "error": { "code": string, "message": string, "details"?: any } }`

---

## 2) Statuscodes
- 200/201 für Success
- 400 für Validation Fehler
- 401/403 Auth
- 404 Not Found
- **409 Wrong Phase / State Machine Violation**
- 429 Rate Limit
- 500 Internal

---

## 3) Workflow Verification
- `POST /api/teams` → phase initial korrekt
- `GET /api/teams/:id/status` enthält:
  - `phase`
  - `available_actions`
- `approve/reject/partial/skip-premium`:
  - nur in `AWAITING_APPROVAL` erlaubt
  - sonst 409

---

## 4) Storage Verification
- Team/Build/Run Keys existieren nach einem Build
- Build Logs sind abrufbar
- Cost Aggregation konsistent (Summe AgentRuns)

---

## 5) Realtime Verification (falls aktiv)
- WS/SSE sendet:
  - agent_run_started
  - agent_run_completed
  - approval_required
  - build_completed

---

## 6) Dokumentation
- `README.md` Setup stimmt mit tatsächlichen Env Vars überein.
