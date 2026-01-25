# Production Checklist

> **PFLICHT:** Alle Punkte müssen ✅ sein vor Merge zu `main`

---

## Security

- [ ] Rate Limiting aktiv
- [ ] CORS konfiguriert
- [ ] Input Validation überall
- [ ] Secrets in GitHub Secrets (nicht im Code)
- [ ] `.env` in `.gitignore`
- [ ] Keine API Keys im Code
- [ ] Dependencies aktuell (keine known vulnerabilities)

---

## API Documentation

- [ ] OpenAPI/Swagger Spec vollständig
- [ ] Alle Endpoints dokumentiert
- [ ] Request/Response Schemas definiert
- [ ] Error Responses dokumentiert
- [ ] `/api-docs` erreichbar (falls Backend)

---

## Error Handling

- [ ] Graceful Error Handling
- [ ] Strukturiertes Logging (JSON)
- [ ] Keine Stack Traces in Production
- [ ] 4xx/5xx Errors mit JSON Response
- [ ] Timeout Handling

---

## Monitoring & Health

- [ ] Health Check Endpoint (`/health`)
- [ ] DB Connection Check
- [ ] Structured Logging aktiv
- [ ] Error Tracking (z.B. Sentry) konfiguriert (optional)
- [ ] Uptime Monitoring (optional)

---

## Testing

- [ ] Alle Unit Tests grün
- [ ] Alle Integration Tests grün
- [ ] E2E Tests grün (falls UI)
- [ ] Code Coverage ≥ 80%
- [ ] Regression Tests durchlaufen

---

## Contracts

- [ ] `CONTRACTS/api_contract.md` vollständig
- [ ] `CONTRACTS/data_contract.md` vollständig
- [ ] Keine offenen TODOs in Contracts
- [ ] Frontend ↔ Backend Contracts identisch
- [ ] Backend ↔ Database Contracts identisch

---

## Configuration

- [ ] `.env.example` vollständig
- [ ] Alle ENV vars dokumentiert
- [ ] Production ENV vars gesetzt
- [ ] Secrets rotiert (falls leaked)
- [ ] CORS Origins konfiguriert

---

## Deployment

- [ ] Deployment-Script getestet
- [ ] Rollback-Plan vorhanden
- [ ] Database Migrations erfolgreich
- [ ] Smoke Test gegen Live-URL
- [ ] Build erfolgreich

---

## Documentation

- [ ] README.md aktuell
- [ ] PROJECT_STATE.md aktuell
- [ ] MASTER_RUNBOOK.md befolgt
- [ ] Changelog aktualisiert
- [ ] API Docs deployed

---

## Final Check

- [ ] Code Review abgeschlossen
- [ ] Keine `console.log` / `print()` im Code
- [ ] Keine `TODO` / `FIXME` ohne Ticket
- [ ] Performance Check durchgeführt
- [ ] Breaking Changes dokumentiert

---

**✅ Alle Punkte abgehakt?** → Merge zu `main` erlaubt!
