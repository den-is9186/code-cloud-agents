# Operational Policy - Code Cloud Agents

---

## Branch Strategy

| Branch | Purpose | Merge Strategy |
|--------|---------|----------------|
| `main` | Production-ready code | Merge Commit from develop |
| `develop` | Integration branch | Squash from features |
| `feature/*` | New features | Squash to develop |
| `fix/*` | Bug fixes | Squash to develop |
| `hotfix/*` | Production fixes | Direct to main + develop |

---

## Commit Conventions

```
type(scope): message

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- test: Tests
- refactor: Code refactoring
- chore: Maintenance

Example:
feat(workflow): add auto-build with aider
```

---

## Merge Rules

### Feature → Develop
- **Strategie:** Squash
- **Review:** Required
- **Tests:** Must pass

### Develop → Main
- **Strategie:** Merge Commit
- **Review:** Required
- **Checklist:** PRODUCTION_CHECKLIST.md must be complete

---

## Forbidden Actions

❌ Force push to `main` or `develop`
❌ Direct commits to `main`
❌ Merge without tests passing
❌ Deploy without PRODUCTION_CHECKLIST.md
❌ Commit secrets or API keys
❌ Delete Pflicht-Dateien

---

## Contract-First Rule

**PFLICHT:** Bei API oder DB Änderungen:

1. **ERST** Contract aktualisieren (`CONTRACTS/*.md`)
2. **DANN** Code implementieren
3. **NIEMALS** Contract still ändern

Konsequenz: CI schlägt fehl wenn Contract-Change nicht dokumentiert.

---

## Versioning

Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking Changes
- **MINOR**: New Features (backwards-compatible)
- **PATCH**: Bug Fixes

---

## Security

- Secrets nur via GitHub Secrets
- `.env` files NIEMALS committen
- API Keys rotieren bei Leak
- Dependency Updates wöchentlich prüfen

---

## CI/CD

- Alle PRs durchlaufen CI
- Tests müssen grün sein
- Code Coverage min. 80%
- Security Scan (Dependabot)
