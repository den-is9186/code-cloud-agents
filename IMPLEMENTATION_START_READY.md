# 🚀 BEREIT ZUM START - IMPLEMENTATION PLAN

**Datum:** 2026-01-26
**Status:** ✅ Alle Entscheidungen getroffen, bereit zum Start!

---

## ✅ ENTSCHEIDUNGEN GETROFFEN

### 1. Preset: **IQ (IQuest Hybrid)**
- Cost: $10/build
- Quality: 78/100
- IQuest Loop für Code/Test
- DeepSeek R1 für Reasoning
- Scout Local für Docs/Vision

### 2. User Management: **Minimal + 2FA**
- Login/Logout
- JWT Token
- Two-Factor Authentication (TOTP)
- Backup Codes
- User-Team Zuordnung

### 3. Vision Feature: **Screenshot → Code**
- Upload Screenshot
- AI analysiert Layout
- Generiert React/Flutter/HTML Code
- Preset V (Qwen3 Omni) oder IQ (Scout Local)

### 4. Implementation Reihenfolge: **Bestätigt**
- Phase 1: Backend Foundation (11h)
- Phase 2: Agent System (9h)
- Phase 3: Dashboard UI (7h)
- Phase 4: Workflow UI (8h)
- Phase 5: Polish (14h) ✅ **AUCH MACHEN**

---

## 📋 NEUE DOKUMENTE ERSTELLT

### 1. ✅ NEUE_INFORMATIONEN_GEFUNDEN.md
**Inhalt:** Alle 14 neuen Themen aus FINAL Dateien:
- IQ Preset Details
- Scout Local Setup (Ollama/vLLM/llama.cpp)
- Queue/Automation (.task-queue.txt + GH Actions)
- Security Fixes (SEC-001, SEC-002)
- Bug Fixes (BUG-001 bis BUG-005)
- Contract Verification
- Incident Runbooks
- Observability (SSE/WS)
- 14 Agent Engine Tasks (T1-T14)

### 2. ✅ ops/OPEN_QUESTIONS.md
**Inhalt:** Alle Fragen + Antworten:
- ✅ Preset Auswahl → IQ
- ✅ User Management → JA + 2FA
- ✅ Implementation Reihenfolge → Bestätigt
- ❓ Auth-Methode → Offen (Email/OAuth/Hybrid)
- ❓ Security Fixes → SOFORT oder später?
- ❓ Scout Local Setup → Ollama/vLLM/llama.cpp?
- ❓ Database → Nur Redis oder + PostgreSQL?

### 3. ✅ VISION_SCREENSHOT_TO_CODE_SPEC.md
**Inhalt:** Vollständige Spec für Screenshot → Code:
- API Endpoints (POST/GET/WS)
- Vision Agent (QR Code Analyse)
- Code Generator Agent
- UI Components (Upload, Progress)
- Preset Integration (V + IQ)
- Testing + Rollout Plan (12h)

### 4. ✅ USER_MANAGEMENT_SPEC.md
**Inhalt:** Vollständige Spec für User Management + 2FA:
- Database Schema (Redis)
- Authentication Flow (Login/2FA/Backup Codes)
- Implementation (UserService, JWTService, Auth Routes)
- UI Components (Login, Enable2FA)
- Testing
- Zeit: ~6h

---

## 🔴 OFFENE FRAGEN (BENÖTIGEN USER-ANTWORT)

### Frage 1: Auth-Methode
**Optionen:**
1. Email + Password (Simple, 3h)
2. OAuth GitHub (Empfohlen, 5h)
3. Hybrid (Best UX, 7h)

**Empfehlung:** OAuth GitHub (passt zu Developer-Tool)

### Frage 2: Security Fixes Timing
**Optionen:**
1. SOFORT (vor allen Features) → +3h, aber sicher
2. Parallel zu Phase 1 → kein Delay, temporäres Risk
3. Nach MVP → NICHT EMPFOHLEN

**Empfehlung:** SOFORT

### Frage 3: Scout Local Setup
**Optionen:**
1. Ollama (Einfach, 30min)
2. vLLM (Production, 2h)
3. llama.cpp (Lightweight, 1h)

**Empfehlung:** Ollama für Dev, vLLM für Production

**Zusatzfrage:** Hast du Server mit 24GB+ VRAM?

### Frage 4: Database
**Optionen:**
1. Nur Redis (Einfach, schnell)
2. Redis + PostgreSQL (Relations, komplex)
3. Nur PostgreSQL (Relations, langsamer)

**Empfehlung:** Nur Redis für MVP

### Frage 5: GitHub Secrets
**Status:** Sind diese Secrets bereits hinterlegt?
- `HF_API_KEY` (für IQuest)
- `NOVITA_API_KEY` (für DeepSeek)
- `ANTHROPIC_API_KEY` (optional für Claude)
- `LOCAL_LLM_ENDPOINT` (optional)

---

## 🎯 IMPLEMENTATION ROADMAP

### PHASE 0: Security Fixes (3h) 🔴 KRITISCH
**Wenn User sagt "SOFORT":**
- [ ] SEC-001: Path Traversal Fix (src/tools/index.ts)
- [ ] SEC-002: Command Injection Fix (src/tools/index.ts)
- [ ] BUG-001: JSON Schema Validation (src/agents/*.ts)
- [ ] BUG-002: Supervisor Error Handling
- [ ] BUG-003: Race Condition Fix
- [ ] BUG-004: LLM Client Retry/Timeout
- [ ] BUG-005: Chat History Pruning

### PHASE 1: Backend Foundation (11h) 🔴 KRITISCH
- [ ] Task 1: Team CRUD API Endpoints (2h)
- [ ] Task 2: Workflow State Machine (4h)
- [ ] Task 3: Approval/Reject Endpoints (2h)
- [ ] Task 4: Redis Schema implementieren (2h)
- [ ] Task 5: Preset Konfiguration laden (1h)

### PHASE 1.5: User Management (6h) 🔴 KRITISCH
- [ ] User Model + bcrypt (1h)
- [ ] JWT Service (1h)
- [ ] Auth Routes (Login/Register/Logout) (2h)
- [ ] 2FA Implementation (TOTP + Backup Codes) (2h)

### PHASE 2: Agent System (9h) 🟡 HOCH
- [ ] Task 6: Agent Orchestrator (4h)
- [ ] Task 7: Build Tracking (3h)
- [ ] Task 8: Kosten-Tracking (2h)

### PHASE 2.5: IQ Preset Integration (4h) 🟡 HOCH
- [ ] Model Registry erweitern (IQuest + Scout) (1h)
- [ ] LLM Client: HuggingFace Support (1h)
- [ ] LLM Client: Local LLM Support (1h)
- [ ] Agent Defaults (Code/Test → IQuest, Docs/Vision → Scout) (1h)

### PHASE 3: Dashboard UI (7h) 🟡 HOCH
- [ ] Task 9: Team Dashboard UI (4h)
- [ ] Task 10: Team Settings UI (3h)

### PHASE 3.5: Auth UI (3h) 🟡 HOCH
- [ ] Login Component (1h)
- [ ] Enable 2FA Component (1h)
- [ ] Protected Routes (1h)

### PHASE 4: Workflow UI (8h) 🟢 MITTEL
- [ ] Task 11: Approval Dialog UI (3h)
- [ ] Task 12: Build Progress UI (3h)
- [ ] Task 13: Log Streaming (SSE/WS) (2h)

### PHASE 4.5: Vision Feature (12h) 🟢 MITTEL
- [ ] Screenshot Upload API (2h)
- [ ] Vision Agent (Screenshot Analyse) (3h)
- [ ] Code Generator Agent (3h)
- [ ] UI Components (Upload + Progress) (2h)
- [ ] Testing (2h)

### PHASE 5: Polish (14h) 🔵 NIEDRIG (ABER MACHEN!)
- [ ] Task 14: Notification System (3h)
- [ ] Task 15: Refactor Agents (2h)
- [ ] Task 16: Merge Agents (2h)
- [ ] Task 17: Multi-Repo Agents (2h)
- [ ] Task 18: Tool Builder Agents (2h)
- [ ] Task 19: Budget Alerts (2h)
- [ ] Task 20: Export/Reports (1h)

### PHASE 5.5: Queue Automation (2h) 🔵 NIEDRIG
- [ ] queue-task.sh Script (30min)
- [ ] .github/workflows/queue-processor.yml (1h)
- [ ] Secrets Setup (30min)

### PHASE 6: Documentation (3h) 🔵 NIEDRIG
- [ ] Scout Local Setup Guide (1h)
- [ ] Deployment Guide (1h)
- [ ] Security Audit Doc (1h)

---

## ⏱️ ZEITSCHÄTZUNG

### Minimal MVP (ohne Vision, ohne Queue):
```
Phase 0 (Security):        3h
Phase 1 (Backend):        11h
Phase 1.5 (User Mgmt):     6h
Phase 2 (Agents):          9h
Phase 2.5 (IQ Preset):     4h
Phase 3 (Dashboard):       7h
Phase 3.5 (Auth UI):       3h
─────────────────────────────
TOTAL:                    43h
```

### Full MVP (mit Vision, ohne Queue):
```
Minimal MVP:              43h
Phase 4 (Workflow UI):     8h
Phase 4.5 (Vision):       12h
─────────────────────────────
TOTAL:                    63h
```

### Complete System (alles):
```
Full MVP:                 63h
Phase 5 (Polish):         14h
Phase 5.5 (Queue):         2h
Phase 6 (Docs):            3h
─────────────────────────────
TOTAL:                    82h
```

---

## 🎯 NÄCHSTE AKTION

**Du musst jetzt 5 Fragen beantworten:**

1. **Auth-Methode:** Email/Password, OAuth GitHub, oder Hybrid?
2. **Security Fixes:** SOFORT starten (vor allem anderen)?
3. **Scout Local:** Hast du Server mit 24GB+ VRAM? Welche Methode (Ollama/vLLM)?
4. **Database:** Nur Redis oder auch PostgreSQL?
5. **GitHub Secrets:** Sind HF_API_KEY + NOVITA_API_KEY schon hinterlegt?

**Dann kann ich starten mit:**
- Phase 0 (Security Fixes) - falls SOFORT
- Phase 1 (Backend Foundation)

---

## 📦 DEPENDENCIES ZU INSTALLIEREN

```bash
# Backend
npm install bcrypt jsonwebtoken speakeasy qrcode zod
npm install --save-dev @types/bcrypt @types/jsonwebtoken @types/speakeasy @types/qrcode

# Vision (wenn Phase 4.5)
npm install multer sharp  # File Upload + Image Processing
npm install --save-dev @types/multer @types/sharp
```

---

## 🔧 ENV VARIABLES SETUP

```.env
# Required
NOVITA_API_KEY=...
HF_API_KEY=...
JWT_SECRET=...
REDIS_URL=redis://localhost:6379

# Optional
ANTHROPIC_API_KEY=...
IQUEST_ENDPOINT=...
LOCAL_LLM_ENDPOINT=http://localhost:11434
LOG_API_CALLS=true
```

---

**STATUS: 🟢 BEREIT ZUM START**

**Warte auf User-Antworten zu den 5 Fragen, dann kann es losgehen!**

