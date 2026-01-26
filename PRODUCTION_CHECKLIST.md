# PRODUCTION_CHECKLIST

## Pre-Deploy
- [ ] Alle Tests grün
- [ ] Security Fixes (SEC-001/SEC-002) angewendet
- [ ] Retry/Timeout im LLM Client aktiv
- [ ] Logs/Cost Tracking aktiv
- [ ] Contracts verifiziert (`CONTRACT_VERIFICATION.md`)

## Secrets
- [ ] Alle Secrets in Prod gesetzt (HF/NOVITA/ANTHROPIC optional)
- [ ] Keine Secrets im Repo

## Data
- [ ] Redis Backup/Restore Plan vorhanden
- [ ] Migration Plan (falls Postgres)

## Deploy
- [ ] Deploy ausgeführt
- [ ] Smoke Test: `/health`
- [ ] Smoke Test: Team create + status

## Post-Deploy
- [ ] Monitoring: Error Rate / 429 Rate / Latency
- [ ] Budget/Cost Report geprüft
- [ ] Incident Owner benannt
