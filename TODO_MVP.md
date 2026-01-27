# 🎯 MVP TODO Liste

**Status**: Pre-MVP Phase
**Ziel**: Funktionsfähiges MVP für Launch

---

## 🔴 CRITICAL - MVP BLOCKER (MUSS vor Launch)

### 1. Agent Orchestrator Mock entfernen
- [ ] **Status**: Pending
- **Aufwand**: 2 Tage
- **Datei**: `src/services/agent-orchestrator.ts:519-621`
- **Problem**: System führt nur Mock aus, keine echten Agents!
- **Was tun**:
  - [ ] SupervisorAgent Instanz erstellen und ausführen
  - [ ] CodeAgent Instanz erstellen und ausführen
  - [ ] TestAgent Instanz erstellen und ausführen
  - [ ] Alle anderen Agents integrieren
  - [ ] Mock Code komplett entfernen
  - [ ] Integration Tests für echte Agents

**Priority**: 🔴 HIGHEST - Ohne das funktioniert das System nicht!

---

### 2. Rate Limiter In-Memory Fallback
- [ ] **Status**: Pending
- **Aufwand**: 0.5 Tage
- **Datei**: `src/middleware/rate-limit.ts:76-84`
- **Problem**: Bei Redis-Ausfall keine Rate Limits → DoS möglich
- **Was tun**:
  - [ ] PR #25 Code integrieren (falls noch nicht gemerged)
  - [ ] In-Memory Rate Limiter als Fallback
  - [ ] Tests für Fallback Scenario
  - [ ] Logging wenn Fallback aktiv ist

**Priority**: 🔴 HIGH - Security Risk in Production

---

### 3. JWT Secret Production Fix
- [ ] **Status**: Pending
- **Aufwand**: 2 Stunden
- **Datei**: `src/services/auth-service.ts:12`
- **Problem**: Server-Restart loggt alle User aus
- **Was tun**:
  - [ ] Error werfen wenn JWT_SECRET nicht gesetzt
  - [ ] Environment Variable Validation beim Start
  - [ ] .env.example mit JWT_SECRET hinzufügen
  - [ ] Deployment Docs updaten

**Priority**: 🔴 HIGH - Production Breaking

---

## 🟡 NICE-TO-HAVE (Sollte vor Launch)

### 4. MultiRepoAgent Error Handling
- [ ] **Status**: Pending
- **Aufwand**: 4 Stunden
- **Datei**: `src/agents/multi-repo.ts:295-306`
- **Problem**: JSON Parse Errors werden verschluckt
- **Was tun**:
  - [ ] Error werfen statt leeres Array zurückgeben
  - [ ] Bessere Error Messages für User
  - [ ] Logging für Debug

**Priority**: 🟡 MEDIUM - Better UX

---

### 5. LLM Client Model Fallback Fix
- [ ] **Status**: Pending
- **Aufwand**: 2 Stunden
- **Datei**: `src/llm/client.ts:155-164`
- **Problem**: Silent Fallback auf lokales Model
- **Was tun**:
  - [ ] Error werfen bei unbekanntem Model
  - [ ] Liste verfügbarer Models dokumentieren
  - [ ] Bessere Error Message

**Priority**: 🟡 MEDIUM - Unexpected Behavior

---

### 6. Integration Tests für MVP
- [ ] **Status**: Pending
- **Aufwand**: 1 Tag
- **Was tun**:
  - [ ] Auth Flow Test (Register → Login → API Call)
  - [ ] Team Creation Flow Test
  - [ ] Build Start Flow Test
  - [ ] Agent State Management Test
  - [ ] Error Handling Tests

**Priority**: 🟡 MEDIUM - QA vor Launch

---

## ✅ ERLEDIGT (Kann später)

### 7. TypeScript Migration (api-server.js)
- [ ] **Status**: Nach MVP
- **Aufwand**: 1-2 Tage
- **Siehe**: `POST_MVP_TASKS.md` Phase 1

### 8. Skills Refactoring & Agent Profile Programming
- [ ] **Status**: Nach MVP
- **Aufwand**: 2-3 Tage
- **Siehe**: `POST_MVP_TASKS.md` Phase 1

### 9. API Server Refactoring
- [ ] **Status**: Nach MVP
- **Aufwand**: 1-2 Tage
- **Siehe**: `POST_MVP_TASKS.md` Phase 1

### 10. Branches Cleanup
- [ ] **Status**: Nach MVP
- **Was**: 4 merged Branches löschen
  - copilot/fix-bug
  - feature/express-5-upgrade
  - feature/global-error-handlers
  - feature/multi-repo-agents

---

## 📊 MVP Progress Tracker

| Task | Status | Aufwand | Priority | Assignee |
|------|--------|---------|----------|----------|
| Agent Orchestrator Fix | ⏳ Pending | 2 Tage | 🔴 CRITICAL | - |
| Rate Limiter Fallback | ⏳ Pending | 0.5 Tage | 🔴 HIGH | - |
| JWT Secret Fix | ⏳ Pending | 2h | 🔴 HIGH | - |
| MultiRepo Error Handling | ⏳ Pending | 4h | 🟡 MEDIUM | - |
| LLM Fallback Fix | ⏳ Pending | 2h | 🟡 MEDIUM | - |
| Integration Tests | ⏳ Pending | 1 Tag | 🟡 MEDIUM | - |

**Gesamt CRITICAL**: 3 Tasks (2.5 Tage)
**Gesamt NICE-TO-HAVE**: 3 Tasks (1.5 Tage)
**MVP ETA**: 4-5 Tage

---

## 🚀 MVP Launch Checklist

Vor Production Deploy:

- [ ] Alle 🔴 CRITICAL Tasks erledigt
- [ ] Mindestens 🟡 Error Handling Tasks erledigt
- [ ] Integration Tests laufen durch
- [ ] Redis Connection funktioniert
- [ ] Environment Variables gesetzt (.env.example als Vorlage)
- [ ] JWT_SECRET in Production gesetzt
- [ ] Rate Limiting getestet (Redis + Fallback)
- [ ] LLM API Keys konfiguriert
- [ ] Health Check Endpoint funktioniert (`/health`)
- [ ] Build-Pipeline einmal komplett durchgelaufen
- [ ] Logs funktionieren (Winston Logger)
- [ ] Error Handling funktioniert
- [ ] Staging Deploy erfolgreich

---

## 📝 Notizen

**Letzte Aktualisierung**: 2026-01-27

**Nächster Schritt**: Agent Orchestrator Mock entfernen (CRITICAL!)

**Blockers**: Keine

**Risiken**:
- Agent Orchestrator könnte komplexer sein als erwartet (2-3 Tage statt 2)
- Integration Tests könnten weitere Bugs aufdecken

**Dependencies**:
- Redis muss laufen
- LLM API Keys müssen gesetzt sein
- Alle Agents müssen implementiert sein (sind sie)

---

**Siehe auch**:
- `POST_MVP_TASKS.md` - Alle Optimierungen nach MVP Launch
- `PROJECT_STATE.md` - Projekt Status
- `PRODUCTION_CHECKLIST.md` - Production Deployment Checklist
