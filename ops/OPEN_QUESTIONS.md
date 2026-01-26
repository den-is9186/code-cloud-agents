# 📋 OFFENE FRAGEN & ENTSCHEIDUNGEN

**Datum:** 2026-01-26
**Projekt:** Code Cloud Agents
**Status:** Aktiv

---

## ✅ BEANTWORTET

### Frage 1: Welches Preset verwenden?
**Datum:** 2026-01-26
**Status:** ✅ Entschieden
**Antwort:** **Preset IQ (IQuest Hybrid)**
- **Cost:** $10/build
- **Quality:** 78/100
- **Begründung:**
  - IQuest Loop für Code/Test (günstig & iterativ)
  - DeepSeek R1 für Reasoning
  - Scout Local für Docs/Vision
  - Gutes Preis-Leistungs-Verhältnis

### Frage 2: User Management notwendig?
**Datum:** 2026-01-26
**Status:** ✅ Entschieden
**Antwort:** **JA, User Management ist notwendig**
- Teams müssen Usern gehören
- Approval Actions brauchen Authentifizierung
- Build Logs nur für Teammitglieder sichtbar
- Cost Tracking pro User/Team

**Implementation:**
- **Phase 1 (Minimal):** Login/Logout + JWT + User-Team Zuordnung
- **Phase 2 (Erweitert):** Team Roles (Owner/Admin/Member) + Permissions

### Frage 3: Screenshot → Code (Vision Preset)
**Datum:** 2026-01-26
**Status:** ✅ Erklärt
**Antwort:**
Vision Preset (V) ermöglicht:
- Screenshot von UI Design → AI generiert Code
- Beispiel: Figma Screenshot → React/Flutter Code
- Nutzt Vision-Modelle (Qwen3 Omni oder Scout Local)
- Cost: $15/build

### Frage 4: Implementation Reihenfolge
**Datum:** 2026-01-26
**Status:** ✅ Bestätigt
**Antwort:**
```
Phase 1: Backend Foundation (11h) → KRITISCH
Phase 2: Agent System (9h) → HOCH
Phase 3: Dashboard UI (7h) → HOCH
Phase 4: Workflow UI (8h) → MITTEL
Phase 5: Polish (14h) → NIEDRIG (ABER AUCH MACHEN!)
```
User bestätigte: "ja logishc und phase 5 auch ja"

---

## ✅ BEANTWORTET (NEU) - 2026-01-26 Update

### Frage 5: User Management - Welche Auth-Methode?
**Datum:** 2026-01-26
**Priorität:** 🔴 KRITISCH (blockiert Phase 1)
**Status:** ✅ **ENTSCHIEDEN: Option 3 (Hybrid)**
**User-Antwort:** "hybrid"

**Gewählte Lösung:**
- Email + Password Login
- OAuth GitHub Integration
- OAuth Google Integration (optional)
- Zeit: ~7h

**Nächste Schritte:**
- OAuth App bei GitHub erstellen
- GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET als Secrets
- OAuth Callback Route implementieren

---

### Frage 6: Security Fixes - Wann implementieren?
**Datum:** 2026-01-26
**Priorität:** 🔴 KRITISCH
**Status:** ✅ **ENTSCHIEDEN: Option 1 (SOFORT)**
**User-Antwort:** "ja"

**Gewählte Lösung:**
- Security Fixes VOR allen anderen Features
- Phase 0: Security Fixes (3h) startet JETZT
- Dann erst Phase 1: Backend Foundation

**Tasks:**
- SEC-001: Path Traversal Fix
- SEC-002: Command Injection Fix
- BUG-001 bis BUG-005

---

### Frage 7: Scout Local Setup - Welche Methode?
**Datum:** 2026-01-26
**Priorität:** 🟡 HOCH (für Preset IQ notwendig)
**Status:** ✅ **ENTSCHIEDEN: Drittanbieter API**
**User-Antwort:** "ichc hoste auf dritt serverv und gebe dir eine api du erstelllst agenten profil"

**Gewählte Lösung:**
- User hostet auf Drittanbieter-Server (z.B. Replicate, RunPod, etc.)
- User stellt API Endpoint bereit
- Ich erstelle Custom Agent Profil für diese API

**Benötigt:**
- API Endpoint URL
- API Key (falls nötig)
- Model Name
- API Format (OpenAI-compatible? Custom?)

---

## ❓ OFFEN (KLÄRUNG BENÖTIGT)

---

### Frage 8: Queue Automation - Jetzt oder später?
**Datum:** 2026-01-26
**Priorität:** 🟢 MITTEL
**Kontext:** Queue Processor (.task-queue.txt + GH Actions) gefunden

**Optionen:**
1. **Jetzt (Teil von Phase 1)**
   - ✅ Automation von Anfang an
   - ❌ +2h zu Phase 1

2. **Phase 5 (Polish)**
   - ✅ Kein Delay
   - ❌ Manuelle Tasks bis dahin

3. **Nach MVP**
   - ❌ Später schwerer einzubauen

**Empfehlung:** Option 2 (Phase 5) - nicht kritisch für MVP

**Benötigt:** User-Entscheidung

---

### Frage 9: Database - Nur Redis oder auch PostgreSQL?
**Datum:** 2026-01-26
**Priorität:** 🟡 HOCH (blockiert Schema Design)
**Status:** ✅ **ENTSCHIEDEN: Redis + PostgreSQL (Hybrid)**
**User-Antwort:** "optimalere"

**Gewählte Lösung:**
- **Redis:** Real-time State, Sessions, Cache, Pub/Sub
- **PostgreSQL:** Users, Teams (persistent), Builds (history), Cost Analytics

**Responsibility Split:**
- Redis: Team State (current phase), Build State (running), Sessions
- PostgreSQL: Users, Teams, Builds (history), Agent Runs, Cost History, Audit Logs

**Sync Strategy:**
- Write-Behind: Redis → PostgreSQL (when Build finishes)
- Read-Through Cache: PostgreSQL → Redis (for frequent queries)

**Dokumentation:** `DATABASE_ARCHITECTURE.md`

**Kosten:** ~€25/Monat (Redis €8 + PostgreSQL €16)

---

### Frage 10: CI/CD - Secrets Management
**Datum:** 2026-01-26
**Priorität:** 🟡 HOCH (für Queue Processor)
**Status:** ✅ **ENTSCHIEDEN: Später**
**User-Antwort:** "mach ich später"

**Secrets benötigt (wenn Queue Processor aktiviert wird):**
- `ANTHROPIC_API_KEY` (optional)
- `NOVITA_API_KEY` (required)
- `HF_API_KEY` (required für IQ Preset)
- `LOCAL_LLM_ENDPOINT` (optional)
- `IQUEST_ENDPOINT` (optional)
- `GITHUB_CLIENT_ID` (für OAuth)
- `GITHUB_CLIENT_SECRET` (für OAuth)

**Action:**
User richtet Secrets ein bevor Queue Processor aktiviert wird

---

## 🔍 RESEARCH NEEDED

### Research 1: IQuest API Details
**Datum:** 2026-01-26
**Priorität:** 🟡 HOCH
**Was:** IQuest Loop Model API-Spec
**Warum:** Für LLM Client Implementation
**Resources:**
- HuggingFace Inference API Docs
- IQuest Model Card (falls self-hosted)

### Research 2: Cost Calculation Formula
**Datum:** 2026-01-26
**Priorität:** 🟢 MITTEL
**Was:** Exakte Formel für Token → Cost
**Warum:** Task 8 (Kosten-Tracking)
**Formula:**
```
cost = (input_tokens / 1_000_000) * input_price +
       (output_tokens / 1_000_000) * output_price
```

---

## 📝 TODO: DOKUMENTATION

### Doc 1: USER_MANAGEMENT_SPEC.md
**Priorität:** 🔴 KRITISCH
**Inhalt:**
- Auth-Methode
- User Schema
- Team-User Relations
- Permissions Model

### Doc 2: SECURITY_AUDIT.md
**Priorität:** 🔴 KRITISCH
**Inhalt:**
- SEC-001 Fix Details
- SEC-002 Fix Details
- Testing für Security Fixes
- Weitere potenzielle Vulnerabilities

### Doc 3: DEPLOYMENT_GUIDE.md
**Priorität:** 🟢 MITTEL
**Inhalt:**
- Scout Local Setup (Ollama/vLLM)
- Redis Setup
- Environment Variables
- Health Checks

---

## 🎯 AKTIONEN ERFORDERLICH

### Aktion 1: Security Fixes SOFORT
**Wer:** Claude
**Was:** SEC-001 + SEC-002 implementieren
**Wann:** JETZT (vor allen anderen Features)
**Warum:** Security geht vor

### Aktion 2: User Management Spec
**Wer:** User
**Was:** Entscheidung: Email/OAuth/Hybrid
**Wann:** Heute
**Blockiert:** Phase 1 (Backend Foundation)

### Aktion 3: Scout Local Setup
**Wer:** User
**Was:** Server-Info (VRAM?) + Methode wählen
**Wann:** Diese Woche
**Blockiert:** IQ Preset Nutzung

### Aktion 4: Secrets Setup
**Wer:** User
**Was:** GitHub Secrets hinterlegen
**Wann:** Vor Queue Processor
**Blockiert:** CI/CD Automation

---

## 📊 ENTSCHEIDUNGS-MATRIX

| Frage | Priorität | Blockiert | Empfehlung | Status |
|-------|-----------|-----------|------------|--------|
| Preset Auswahl | 🔴 | Phase 1 | IQ | ✅ Entschieden |
| User Management | 🔴 | Phase 1 | JA | ✅ Entschieden |
| Auth-Methode | 🔴 | Phase 1 | OAuth (GitHub) | ❓ Offen |
| Security Fixes | 🔴 | Alle | SOFORT | ❓ Offen |
| Scout Setup | 🟡 | IQ Preset | Ollama | ❓ Offen |
| Queue Automation | 🟢 | - | Phase 5 | ❓ Offen |
| Database | 🟡 | Schema | Nur Redis | ❓ Offen |
| CI Secrets | 🟡 | Queue | Setup | ❓ Offen |

---

## 🚀 NÄCHSTE SCHRITTE

### SOFORT (Heute):
1. ✅ User-Entscheidung: Auth-Methode (Email/OAuth/Hybrid)
2. ✅ User-Bestätigung: Security Fixes SOFORT
3. ✅ User-Info: Server (VRAM für Scout Local)
4. ✅ User-Info: GitHub Secrets Status

### DIESE WOCHE:
1. Security Fixes implementieren (SEC-001, SEC-002)
2. User Management Spec schreiben
3. Scout Local Setup testen
4. Phase 1 Backend starten

### NÄCHSTE WOCHE:
1. Phase 2-3 (Agent System + Dashboard)
2. Phase 4 (Workflow UI)
3. Phase 5 (Polish)

---

## 📞 FRAGEN AN USER

**Bitte beantworte diese 4 Fragen:**

1. **Auth-Methode:** Email/Password, OAuth (GitHub), oder Hybrid?
2. **Security Fixes:** Darf ich SOFORT starten (vor Dashboard)?
3. **Server:** Hast du Server mit 24GB+ VRAM für Scout Local?
4. **GitHub Secrets:** Sind HF_API_KEY + NOVITA_API_KEY bereits hinterlegt?

**Danach können wir mit Phase 1 starten!**

---

**Letzte Aktualisierung:** 2026-01-26 (nach Analyse der FINAL Dateien)

