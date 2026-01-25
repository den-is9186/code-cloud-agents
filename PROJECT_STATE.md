# Project State - Code Cloud Agents

> **Single Source of Truth** für den aktuellen Projektstatus

**Letzte Aktualisierung:** 2026-01-25

---

## Projekt-Ziel

Autonomes Code-Generation-System, das auf GitHub Actions läuft und via Aider AI + Claude Sonnet 4 Software basierend auf natürlichsprachlichen Aufgaben erstellt.

---

## Current Phase

**Phase:** Setup & Foundation
**Status:** 🟡 In Progress
**Sprint:** 1

---

## MVP Features (Must-Have)

- [ ] GitHub Actions Workflow für Auto-Build
- [ ] Aider Integration mit Claude Sonnet 4
- [ ] Task-Input via Workflow Dispatch
- [ ] Automatische Commits & Pushes
- [ ] Basic Error Handling
- [ ] Workflow-Logs als Output

---

## Phase 2 Features (Nice-to-Have)

- [ ] Scheduled Builds (Cron)
- [ ] Multi-Agent Koordination
- [ ] Coach Agent für Task-Planung
- [ ] Architect Agent für Design
- [ ] Developer Agent für Implementation
- [ ] QA Agent für Testing
- [ ] Build-Artefakt-Tracking
- [ ] Slack/Discord Notifications

---

## Tech Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| **CI/CD** | GitHub Actions | ✅ Planned |
| **AI Engine** | Aider + Claude Sonnet 4 | ✅ Planned |
| **Version Control** | Git/GitHub | ✅ Configured |
| **Language** | Python (Aider), Node.js (App) | 🟡 TBD |
| **Testing** | Jest/Pytest | 🔴 Not Started |
| **Deployment** | GitHub Pages / Vercel | 🔴 Not Started |

---

## Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| GitHub Actions als CI | Bereits integriert, kostenlos für Public Repos | 2026-01-25 |
| Aider als AI Agent | Bewiesen, unterstützt Auto-Commits | 2026-01-25 |
| Claude Sonnet 4 | Beste Code-Qualität | 2026-01-25 |
| Public Repo | Für GitHub Actions Free Tier | 2026-01-25 |

---

## Open Questions

- [ ] Welche Language für Business Logic? (Node.js vs Python)
- [ ] Wie strukturieren wir Multi-Agent Kommunikation?
- [ ] Brauchen wir State-Persistence zwischen Builds?

---

## Blockers

Keine aktuellen Blocker.

---

## Next Steps

1. GitHub Repo erstellen als `den-is9186/code-cloud-agents`
2. Workflow-Datei `.github/workflows/auto-build.yml` erstellen
3. Anthropic API Key als Secret hinzufügen
4. Ersten Test-Build triggern
5. Contracts definieren (API + Data)
