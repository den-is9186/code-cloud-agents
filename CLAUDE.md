# Claude CLI Regeln für Code Cloud Agents

---

## PFLICHT BEI SESSION-START

**STOPP! Bevor du IRGENDETWAS tust, lies diese Dateien:**

```bash
cat ops/POLICY.md
cat MASTER_RUNBOOK.md
cat capabilities.yml
cat PRODUCTION_CHECKLIST.md
cat CONTRACTS/api_contract.md
cat CONTRACTS/data_contract.md
cat PROJECT_STATE.md
```

**Erst nach dem Lesen darfst du arbeiten!**

---

## Projekt-Spezifische Regeln

### Contracts-First
- API/DB Änderung → ZUERST Contract in `CONTRACTS/` updaten → DANN Code

### Branch-Namen
- Features: `feature/beschreibung`
- Fixes: `fix/beschreibung`
- Hotfixes: `hotfix/beschreibung`

### Merge-Strategie
- feature → develop: **Squash**
- develop → main: **Merge Commit**

### Tests
- Jede Funktion → in `capabilities.yml` registrieren
- Keine Funktion ohne Test

### GitHub Actions
- Workflow-Änderungen nur nach Tests in Feature Branch
- Secrets NIEMALS in Workflow-Files

---

## Verbotene Aktionen

❌ Pflicht-Dateien löschen
❌ Contracts still ändern
❌ Code ohne Tests
❌ Production ohne Checklist
❌ Merge ohne Review
❌ Force Push zu main/develop
❌ API Keys im Code

---

## Wichtige Pfade

- **Workflows:** `.github/workflows/`
- **Contracts:** `CONTRACTS/`
- **Policies:** `ops/POLICY.md`
- **Tests:** `tests/`
- **Source:** `src/`

---

## Workflow bei Features

1. Branch erstellen: `git checkout -b feature/my-feature`
2. Contract updaten (falls API/DB Änderung)
3. Code schreiben
4. Tests schreiben
5. `capabilities.yml` updaten
6. Commit + Push
7. PR erstellen
8. Nach Merge: Branch löschen

---

## Bei Unsicherheiten

- Frage den User
- Dokumentiere in `ops/OPEN_QUESTIONS.md`
- Niemals raten oder annehmen
