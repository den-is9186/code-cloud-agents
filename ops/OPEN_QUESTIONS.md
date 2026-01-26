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

## ❓ OFFEN (NEU)

### Frage 5: User Management - Welche Auth-Methode?
**Datum:** 2026-01-26
**Priorität:** 🔴 KRITISCH (blockiert Phase 1)
**Kontext:** User Management ist entschieden, aber welche Auth?

**Optionen:**
1. **Email + Password (Simple)**
   - ✅ Schnell zu implementieren
   - ✅ Keine externen Dependencies
   - ❌ User muss Account erstellen
   - Zeit: ~3h

2. **OAuth (GitHub/Google)**
   - ✅ Bessere UX (kein neues Passwort)
   - ✅ Passt zu Developer-Tool
   - ❌ OAuth Setup nötig
   - Zeit: ~5h

3. **Hybrid (Email + OAuth)**
   - ✅ Beste UX
   - ❌ Mehr Komplexität
   - Zeit: ~7h

**Empfehlung:** Option 2 (OAuth via GitHub) - passt perfekt zu Developer-Tool

**Benötigt:** User-Entscheidung

---

### Frage 6: Security Fixes - Wann implementieren?
**Datum:** 2026-01-26
**Priorität:** 🔴 KRITISCH
**Kontext:** SEC-001 (Path Traversal) + SEC-002 (Command Injection) gefunden

**Optionen:**
1. **SOFORT (vor allen anderen Tasks)**
   - ✅ Verhindert Security Issues
   - ❌ Verzögert Dashboard um ~3h

2. **Parallel zu Phase 1**
   - ✅ Kein Delay
   - ❌ Security Risk bleibt temporär

3. **Nach MVP**
   - ❌ Gefährlich!
   - ❌ Nicht empfohlen

**Empfehlung:** Option 1 (SOFORT) - Security geht vor Features

**Benötigt:** User-Bestätigung

---

### Frage 7: Scout Local Setup - Welche Methode?
**Datum:** 2026-01-26
**Priorität:** 🟡 HOCH (für Preset IQ notwendig)
**Kontext:** IQ Preset braucht Scout Local für Docs/Vision

**Optionen:**
1. **Ollama (Einfach)**
   - ✅ Einfachste Installation
   - ✅ Gute Performance
   - ❌ Weniger Konfiguration
   - Zeit: ~30min

2. **vLLM (Production)**
   - ✅ Beste Performance
   - ✅ Skalierbar
   - ❌ Komplexere Setup
   - Zeit: ~2h

3. **llama.cpp (Lightweight)**
   - ✅ Minimal Dependencies
   - ❌ Weniger Features
   - Zeit: ~1h

**Empfehlung:** Option 1 (Ollama) für Entwicklung, später Option 2 für Production

**Benötigt:** User-Entscheidung + Server-Info (24GB+ VRAM?)

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
**Kontext:** MASTER_RUNBOOK erwähnt "optional PostgreSQL"

**Optionen:**
1. **Nur Redis**
   - ✅ Einfacher
   - ✅ Schneller für Prototyp
   - ❌ Keine komplexe Queries
   - ❌ Keine Relations

2. **Redis + PostgreSQL**
   - ✅ Best of both (Speed + Relations)
   - ✅ Skalierbar
   - ❌ Mehr Setup
   - ❌ 2 DBs managen

3. **Nur PostgreSQL**
   - ✅ Einfaches Schema
   - ✅ Relations
   - ❌ Langsamer für State

**Empfehlung:** Option 1 (nur Redis) für MVP, später Option 2 wenn nötig

**Benötigt:** User-Entscheidung

---

### Frage 10: CI/CD - Secrets Management
**Datum:** 2026-01-26
**Priorität:** 🟡 HOCH (für Queue Processor)
**Kontext:** Queue Processor braucht HF_API_KEY, NOVITA_API_KEY, etc.

**Secrets benötigt:**
- `ANTHROPIC_API_KEY` (optional)
- `NOVITA_API_KEY` (required)
- `HF_API_KEY` (required für IQ Preset)
- `LOCAL_LLM_ENDPOINT` (optional)
- `IQUEST_ENDPOINT` (optional)

**Frage:** Sind diese Secrets bereits als GitHub Secrets hinterlegt?

**Benötigt:** User-Info + ggf. Setup

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

