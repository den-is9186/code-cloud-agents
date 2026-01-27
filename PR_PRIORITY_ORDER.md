# 📋 PR Priority Order - Code Cloud Agents

**Erstellt:** 2026-01-27
**Aktualisiert:** 2026-01-27 10:20 UTC
**Status:** Development Phase
**Branch Strategy:** Siehe `ops/POLICY.md`

---

## 🎯 Übersicht: Aktuelle PRs

**Anzahl offener PRs:** 5 (excluding this PR #40)
**Anzahl offener Issues:** Mehrere (siehe GitHub Issues)

---

## ✅ ERLEDIGTE PRs (CLOSED/MERGED)

Die folgenden PRs wurden bereits geschlossen/gemerged:
- ✅ **PR #31** - Fix Git hooks for Husky v9 compatibility (CLOSED)
- ✅ **PR #34** - Fix pre-push hook merge conflict (CLOSED)
- ✅ **PR #35** - Resolve package-lock.json merge conflict (CLOSED)

---

## 🔴 HOHE PRIORITÄT (DIESE WOCHE)

### 1️⃣ **PR #27** - TypeScript Migration with Jest Support
**Priorität:** 🔴 HOCH
**Grund:** Technical Debt + Issue #6 + Issue #22 - Foundation for code quality
**Status:** Open (NOT WIP)
**Erstellt:** 2026-01-26
**Bezug:** 
- Issue #6: Migrate JavaScript files to TypeScript
- Issue #22: TODO TypeScript Migration (66% done)
**Aktion:**
- Review migration progress (10/15 files done)
- Fix remaining TypeScript errors
- Ensure all tests pass
- Update imports
- Merge to main/develop

**Zeit:** ~2-3 Stunden
**Branch Strategy:** Squash to develop/main (per POLICY.md)

**Files migrated so far:**
- ✅ cors.ts, csrf.ts, auth.ts, rate-limit.ts (Middleware)
- ✅ 6x Services (agent-orchestrator, auth-service, etc.)
- 🚧 Pending: config/presets.js, utils/cost-tracker.js, api-server.js

---

### 2️⃣ **PR #24** - Fix MultiRepoAgent JSON parsing failures
**Priorität:** 🔴 HOCH
**Grund:** Bug Fix - JSON parsing from Markdown-wrapped LLM responses
**Status:** Open (NOT WIP)
**Erstellt:** 2026-01-26
**Aktion:**
- Fix JSON extraction from LLM responses
- Add robust error handling
- Add tests for edge cases
- Merge to main/develop

**Zeit:** ~1-2 Stunden
**Branch Strategy:** Squash to develop/main

**⚠️ NOTE:** PR #41 is working on fixing issues in PR #24, so coordinate these two!

---

## 🟡 MITTLERE PRIORITÄT (NÄCHSTE WOCHE)

### 3️⃣ **PR #28** - Normalize path separators in jest-resolver
**Priorität:** 🟡 MITTEL
**Grund:** Cross-platform compatibility (Windows/Linux)
**Status:** WIP
**Erstellt:** 2026-01-26
**Aktion:**
- Normalize path separators in Jest resolver
- Test on Windows and Linux
- Ensure tests pass
- Merge to main/develop

**Zeit:** ~1 Stunde
**Branch Strategy:** Squash to develop/main

---

### 4️⃣ **PR #26** - Update Jest from 29.7.0 to 30.2.0
**Priorität:** 🟡 MITTEL (EVALUATE FIRST!)
**Grund:** Dependency Update
**Status:** WIP
**Erstellt:** 2026-01-26
**⚠️ Risiko:** Breaking changes in Jest 30
**Aktion (aus Issue #22):**
- Check for JSDOM breaking changes
- Run full test suite on jest-30 branch
- Fix any test failures
- **ENTSCHEIDUNG:** Merge ODER close and stay on Jest 29

**Zeit:** ~2-3 Stunden (if breaking changes)
**Branch Strategy:** Squash to develop/main IF merged

**Empfehlung:** Evaluate if Jest 30 is worth the effort. Wenn Jest 29 funktioniert, close PR.

---

## 🔵 NIEDRIGE PRIORITÄT (SPÄTER)

### 5️⃣ **PR #41** - [WIP] Fix issues in pull request 24
**Priorität:** 🔵 NIEDRIG (KOORDINIERT MIT #24)
**Grund:** Fixes for PR #24
**Status:** Draft WIP
**Erstellt:** 2026-01-27
**Aktion:**
- Coordinate with PR #24
- May need to be merged into PR #24 or wait for PR #24 to merge first
- Test fixes thoroughly

**Zeit:** Depends on PR #24
**Branch Strategy:** Coordinate with PR #24

---

### 6️⃣ **PR #40** - [WIP] Organize order of pull request completion
**Priorität:** 🔵 NIEDRIG
**Grund:** Documentation PR - This current PR!
**Status:** Open (This PR!)
**Erstellt:** 2026-01-27
**Aktion:**
- Complete this document
- Update PR priority order
- Close after documentation complete

**Zeit:** In Progress
**Branch Strategy:** Squash to main

---

## 📊 Empfohlene Reihenfolge

```
AKTUALISIERT: 2026-01-27 10:20 UTC

✅ ERLEDIGT (PRs #31, #34, #35 bereits closed/merged):
    Git Hooks und Dependencies sind bereit!

DIESE WOCHE - HOHE PRIORITÄT (Technical Debt & Bug Fixes):
Day 1: PR #27 (TypeScript Migration) ⏱️ 2-3 Stunden
       └─ WICHTIG: Foundation für Code Quality!
Day 2: PR #24 (MultiRepoAgent JSON fix) ⏱️ 1-2 Stunden
       └─ Koordiniere mit PR #41 (fixes for #24)
       └─ Total: ~4 Stunden

NÄCHSTE WOCHE - MITTLERE PRIORITÄT (Optional):
Day 3: PR #28 (Path separators) ⏱️ 1 Stunde
Day 4: PR #26 (Jest 30) - EVALUATE FIRST ⏱️ 2-3 Stunden
       └─ Total: ~3 Stunden (if needed)

NIEDRIGE PRIORITÄT:
- PR #41: Coordinate with PR #24 (may merge into #24)
- PR #40: This documentation PR (close after update)

AFTER ALL PRs:
- Clean up merged branches
- Address remaining Issues from #22 (Rate Limiting, TypeScript Phase 3+4)
- Start MASTER_RUNBOOK Phase 1 (Backend Foundation)
```

---

## 🎯 Nach den PRs: Nächste Phase

**Wenn alle PRs gemerged:**

### Issues bearbeiten (aus Issue #22 + #6):
1. **Rate Limiting Fixes** (Critical from PR #20 feedback)
   - Add extractAuthOptional() middleware
   - Implement Redis fallback
   - Add tests for all auth types

2. **TypeScript Migration Phase 3** (Config/Utils/Database)
   - src/config/presets.js → presets.ts
   - src/utils/cost-tracker.js → cost-tracker.ts
   - src/workflow/state-machine.js → state-machine.ts
   - src/database/redis-schema.js → redis-schema.ts

3. **TypeScript Migration Phase 4** (Core)
   - src/api-server.js → api-server.ts (2,618 lines - BIGGEST!)

4. **Code Quality**
   - Fix 38 `any` type warnings
   - Install @types/json2csv

### Dann: MASTER_RUNBOOK Phase 1
Nach Issue #23 "TO do after MVP" starten wir mit:
- **Step 6:** Multi-Agent System Implementation
- **Step 7:** Dashboard UI
- **Step 9:** Production Checklist

---

## 🔒 Branch Strategy Reminder (aus POLICY.md)

```
feature/* → develop: SQUASH
fix/* → develop: SQUASH
develop → main: MERGE COMMIT

❌ VERBOTEN:
- Force push to main/develop
- Direct commits to main
- Merge without tests passing
```

---

## ✅ Quick Action Commands

### Merge PRs:
```bash
# Nach Review und Approval auf GitHub:
git checkout develop
git pull origin develop

# Squash merge für features/fixes:
git merge --squash origin/feature-branch-name
git commit -m "feat: description"
git push origin develop

# Clean up:
git branch -d feature-branch-name
git push origin --delete feature-branch-name
```

### Check Status:
```bash
# Alle offenen PRs:
gh pr list

# Tests laufen:
npm test

# Type checking:
npm run type-check
```

---

## 📞 Nächste Schritte

1. **JETZT:** PRs #27 (TypeScript) reviewen und mergen - HÖCHSTE PRIORITÄT!
2. **HEUTE/MORGEN:** PR #24 (JSON parsing) reviewen und mergen (koordiniere mit #41)
3. **NÄCHSTE WOCHE:** PRs #28 (Path separators) evaluieren und entscheiden
4. **DANACH:** PR #26 (Jest 30) evaluieren - nur mergen wenn klarer Vorteil
5. **AUFRÄUMEN:** PR #41 (koordiniere mit #24), close PR #40 (diese Doku)
6. **DANN:** Issue #22 Rate Limiting Fixes + TypeScript Phase 3+4
7. **SCHLIESSLICH:** MASTER_RUNBOOK Phase 1 starten

---

## 📝 Notes

- **Tests Status:** Basis-Tests passing (nach PR #31 Merge)
- **TypeScript Migration:** 66% complete (10/15 files) - PR #27 ist key!
- **Coverage Target:** 80% minimum (per capabilities.yml)
- **Next Major Phase:** Multi-Agent System Implementation (Issue #23)

---

**Version:** 1.1
**Letzte Aktualisierung:** 2026-01-27 10:20 UTC
**Verantwortlich:** Copilot Agent
**Status:** Updated - PRs #31, #34, #35 already closed/merged

---

## 🌐 Links

- Issues: https://github.com/den-is9186/code-cloud-agents/issues
- PRs: https://github.com/den-is9186/code-cloud-agents/pulls
- POLICY: `ops/POLICY.md`
- MASTER_RUNBOOK: `MASTER_RUNBOOK.md`
- capabilities: `capabilities.yml`
