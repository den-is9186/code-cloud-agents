# MASTER RUNBOOK

> Step-by-Step Anleitung von Idee bis Production.

**Regeln:**
- **Contracts sind Gesetz** - Keine stillen Änderungen
- **1 Step pro Antwort** - Bei AI-Coding
- **Tests für jeden Step** - Kein Step ohne grüne Tests

---

## Step 0 — Projekt-Setup & Entscheidungen

### 0.1 PROJECT_STATE.md ausfüllen
- [ ] Projekt-Ziel definiert (1-2 Sätze)
- [ ] MVP-Features gelistet
- [ ] Phase 2 Features gelistet
- [ ] Tech-Stack Entscheidungen:
  - Deployment: Vercel / Render / Fly / Docker / K8s
  - DB: PostgreSQL / SQLite / MongoDB
  - Auth: JWT / Session / OAuth / MagicLink
  - UI: Next.js / React / Vue / Admin-only

### 0.2 Contracts definieren
- [ ] `CONTRACTS/api_contract.md` - Alle Endpoints
- [ ] `CONTRACTS/data_contract.md` - Alle DB Tabellen

### 0.3 Capabilities registrieren
- [ ] `capabilities.yml` - Alle Funktionen mit Test-Anforderungen

**Tests:** PROJECT_STATE.md existiert und ist ausgefüllt.

---

## Step 1 — Repo & Basis-Struktur

- [ ] README.md angepasst
- [ ] .gitignore erstellt (node_modules, .env, etc.)
- [ ] .env.example erstellt
- [ ] Ordnerstruktur nach Template
- [ ] Lizenz hinzugefügt

**Tests:** `test -f .gitignore && test -f .env.example && echo "OK"`

---

## Step 2 — Backend Skeleton + /health

- [ ] Server startet ohne Fehler
- [ ] `GET /health` → `{"status":"ok","timestamp":"...","db":{"status":"connected"}}`
- [ ] Strukturiertes Logging aktiv (pino/winston)
- [ ] Graceful Shutdown implementiert

**Tests:**
```bash
curl http://localhost:8080/health | jq .
# Erwarte: status: "ok", db.status: "connected"
```

---

## Step 3 — Database Schema + Migration

- [ ] DB Verbindung funktioniert
- [ ] Schema/Migration erstellt
- [ ] init.sql oder Migration-Tool
- [ ] Indizes für häufige Queries

**Tests:** DB Connection Test, Schema existiert.

---

## Step 4 — Security Basics (PFLICHT)

### 4.1 Authentication
- [ ] Auth-Middleware implementiert
- [ ] Token-Validierung
- [ ] Login/Register Endpoints (falls nötig)

### 4.2 Rate Limiting (PFLICHT)
- [ ] Rate Limiter aktiv
- [ ] Konfigurierbar via ENV
- [ ] Fehler-Response: 429 + JSON

### 4.3 CORS (PFLICHT)
- [ ] CORS konfiguriert
- [ ] Erlaubte Origins via ENV
- [ ] Credentials-Handling

### 4.4 Input Validation (PFLICHT)
- [ ] Alle Inputs validiert
- [ ] Type-Checks
- [ ] Length-Limits
- [ ] Sanitization bei Bedarf

**Tests:** Auth-Flow Test, Rate Limit Test, Invalid Input Test.

---

## Step 5 — API Documentation (PFLICHT)

- [ ] OpenAPI/Swagger Spec erstellt (`swagger.json`)
- [ ] Swagger UI unter `/api-docs`
- [ ] Alle Endpoints dokumentiert
- [ ] Request/Response Schemas definiert
- [ ] Error-Responses dokumentiert

**Tests:** `curl http://localhost:8080/api-docs` erreichbar.

---

## Step 6 — Core Features

Pro Feature aus `capabilities.yml`:

1. [ ] Contract prüfen (api_contract.md)
2. [ ] Endpoint implementieren
3. [ ] Input Validation
4. [ ] Error Handling
5. [ ] Logging
6. [ ] Tests schreiben (Unit + Integration)
7. [ ] Swagger aktualisieren

**Tests:** Alle Tests für dieses Feature grün.

---

## Step 7 — Frontend (falls vorhanden)

- [ ] UI mit Contracts verbunden
- [ ] Error-Handling im UI
- [ ] Loading States
- [ ] Responsive Design
- [ ] E2E Tests

**Tests:** E2E Journey Tests grün.

---

## Step 7.5 — Contract Verification (PFLICHT)

> **STOPP!** Bevor QA beginnt, prüfe ob alle Komponenten zusammenpassen.
> **Lies:** `docs/CONTRACT_VERIFICATION.md`

- [ ] Contracts finalisiert (keine offenen TODOs)
- [ ] Frontend ↔ Backend: API-Pfade identisch
- [ ] Frontend ↔ Backend: Request/Response Felder identisch
- [ ] Backend ↔ Database: Queries matchen Schema

### Prüfung

```bash
# Frontend API Calls
grep -rn "fetch\|axios" src/frontend/

# Backend Routes
grep -rn "app.get\|app.post\|router" src/backend/

# Vergleiche mit CONTRACTS/api_contract.md
```

**Tests:** Alle Pfade und Felder stimmen überein.

---

## Step 8 — QA & Regression

- [ ] Alle Unit Tests grün
- [ ] Alle Integration Tests grün
- [ ] Alle E2E Tests grün
- [ ] Scorecard (eval/scorecard.yaml) durchlaufen
- [ ] Regression Tests (eval/regression_tests.yaml) grün
- [ ] Code Review abgeschlossen

**Tests:** `npm test` / `pytest` komplett grün.

---

## Step 9 — Production Checklist (PFLICHT)

**Siehe `PRODUCTION_CHECKLIST.md` - ALLES muss abgehakt sein!**

Kurzfassung:
- [ ] Rate Limiting aktiv
- [ ] CORS konfiguriert
- [ ] Input Validation überall
- [ ] Swagger Docs vollständig
- [ ] Strukturiertes Logging
- [ ] Health Check mit DB
- [ ] Error Handler (keine Stack Traces in Prod)
- [ ] Graceful Shutdown
- [ ] Secrets in ENV (nicht im Code)
- [ ] .env.example vollständig

---

## Step 10 — Deployment

- [ ] Secrets konfiguriert
- [ ] ENV Variables gesetzt
- [ ] Deploy ausgeführt
- [ ] Smoke Test gegen Live-URL
- [ ] Health Check grün
- [ ] Monitoring aktiv

**Tests:**
```bash
curl https://your-app.com/health | jq .
# Erwarte: status: "ok"
```

---

## Checkliste (Kurzform)

```
SETUP:
[ ] PROJECT_STATE.md ausgefüllt
[ ] Contracts definiert
[ ] capabilities.yml erstellt

BACKEND:
[ ] /health funktioniert
[ ] Auth implementiert
[ ] Rate Limiting aktiv
[ ] CORS konfiguriert
[ ] Validation überall
[ ] Swagger Docs

INTEGRATION:
[ ] CONTRACT_VERIFICATION.md komplett  ← Nach Step 7, vor Step 8
[ ] Frontend ↔ Backend passt
[ ] Backend ↔ Database passt

QUALITY:
[ ] Unit Tests
[ ] Integration Tests
[ ] E2E Tests (falls UI)
[ ] Code Review

PRODUCTION:
[ ] PRODUCTION_CHECKLIST.md komplett   ← Nach Step 8, vor Step 10
[ ] Smoke Test grün
[ ] Monitoring aktiv
```

---

## Wann welche Datei lesen?

| Step | Datei | Zweck |
|------|-------|-------|
| Step 0 | `PROJECT_STATE.md` | Projekt definieren |
| Step 0 | `CONTRACTS/*.md` | API + DB festlegen |
| Step 0 | `capabilities.yml` | Features + Tests registrieren |
| Step 6 | `capabilities.yml` | Features implementieren |
| **Step 7.5** | **`docs/CONTRACT_VERIFICATION.md`** | **Komponenten passen zusammen?** |
| Step 8 | `eval/scorecard.yaml` | Qualität prüfen |
| **Step 9** | **`PRODUCTION_CHECKLIST.md`** | **Production-ready?** |
| Step 10 | `ops/RUNBOOK_SUPERVISOR.md` | Deployment überwachen |
