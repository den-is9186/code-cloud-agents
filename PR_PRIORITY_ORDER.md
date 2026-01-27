# 📋 PR Priority Order - Code Cloud Agents

**Erstellt:** 2026-01-27
**Status:** Development Phase
**Branch Strategy:** Siehe `ops/POLICY.md`

---

## 🎯 Übersicht: Aktuelle PRs

**Anzahl offener PRs:** 8
**Anzahl offener Issues:** 3

---

## 🚨 KRITISCHE PRs (SOFORT)

### 1️⃣ **PR #35** - Resolve package-lock.json merge conflict
**Priorität:** 🔴 KRITISCH
**Grund:** Blockiert andere Merges und CI/CD
**Status:** Open
**Aktion:** 
- Merge-Konflikt in `package-lock.json` auflösen
- Keep both `ci-info` AND `strip-ansi` dependencies
- Verify `npm install` works
- Merge to develop

**Zeit:** ~15 Minuten
**Branch Strategy:** Squash to develop (per POLICY.md)

---

### 2️⃣ **PR #34** - Fix pre-push hook merge conflict
**Priorität:** 🔴 KRITISCH
**Grund:** Git Hooks blockiert sind (verhindert pushes)
**Status:** Open
**Aktion:**
- Resolve pre-push hook conflict
- Run full test suite on feature branches
- Test hook functionality
- Merge to develop

**Zeit:** ~20 Minuten
**Branch Strategy:** Squash to develop

---

### 3️⃣ **PR #31** - Fix Git hooks for Husky v9 compatibility
**Priorität:** 🔴 KRITISCH
**Grund:** Husky v9 Breaking Changes
**Status:** Open
**Aktion:**
- Update Husky configuration for v9
- Fix `.husky/` scripts
- Test pre-commit and pre-push hooks
- Merge to develop

**Zeit:** ~30 Minuten
**Branch Strategy:** Squash to develop

**⚠️ NOTE:** PRs #34 und #31 könnten zusammenhängen - beide betreffen Git Hooks!

---

## 🟠 HOHE PRIORITÄT (DIESE WOCHE)

### 4️⃣ **PR #27** - TypeScript Migration with Jest Support
**Priorität:** 🟠 HOCH
**Grund:** Technical Debt + Issue #6 + Issue #22
**Status:** Open
**Bezug:** 
- Issue #6: Migrate JavaScript files to TypeScript
- Issue #22: TODO TypeScript Migration (66% done)
**Aktion:**
- Review migration progress (10/15 files done)
- Fix remaining TypeScript errors
- Ensure all 717+ tests pass
- Update imports
- Merge to develop

**Zeit:** ~2-3 Stunden
**Branch Strategy:** Squash to develop

**Files migrated so far:**
- ✅ cors.ts, csrf.ts, auth.ts, rate-limit.ts (Middleware)
- ✅ 6x Services (agent-orchestrator, auth-service, etc.)
- 🚧 Pending: config/presets.js, utils/cost-tracker.js, api-server.js

---

### 5️⃣ **PR #24** - Fix MultiRepoAgent JSON parsing failures
**Priorität:** 🟠 HOCH
**Grund:** Bug Fix - JSON parsing from Markdown-wrapped LLM responses
**Status:** Open
**Aktion:**
- Fix JSON extraction from LLM responses
- Add robust error handling
- Add tests for edge cases
- Merge to develop

**Zeit:** ~1-2 Stunden
**Branch Strategy:** Squash to develop

---

## 🟡 MITTLERE PRIORITÄT (NÄCHSTE WOCHE)

### 6️⃣ **PR #28** - Normalize path separators in jest-resolver
**Priorität:** 🟡 MITTEL
**Grund:** Cross-platform compatibility (Windows/Linux)
**Status:** WIP
**Aktion:**
- Normalize path separators in Jest resolver
- Test on Windows and Linux
- Ensure tests pass
- Merge to develop

**Zeit:** ~1 Stunde
**Branch Strategy:** Squash to develop

---

### 7️⃣ **PR #26** - Update Jest from 29.7.0 to 30.2.0
**Priorität:** 🟡 MITTEL
**Grund:** Dependency Update
**Status:** WIP
**⚠️ Risiko:** Breaking changes in Jest 30
**Aktion (aus Issue #22):**
- Check for JSDOM breaking changes
- Run full test suite on jest-30 branch
- Fix any test failures
- **ENTSCHEIDUNG:** Merge ODER close and stay on Jest 29

**Zeit:** ~2-3 Stunden (if breaking changes)
**Branch Strategy:** Squash to develop IF merged

**Empfehlung:** Evaluate if Jest 30 is worth the effort. Wenn Jest 29 funktioniert, close PR.

---

## 🔵 NIEDRIGE PRIORITÄT (SPÄTER)

### 8️⃣ **PR #38** - [WIP] Add next pull request in order
**Priorität:** 🔵 NIEDRIG
**Grund:** Current PR - Work in Progress
**Status:** Open (This PR!)
**Aktion:**
- Complete this document
- Provide clear PR order
- Close after documentation complete

**Zeit:** In Progress
**Branch Strategy:** Squash to develop

---

## 📊 Empfohlene Reihenfolge

```
WOCHE 1 - KRITISCHE FIXES (Git Hooks + Dependencies):
Day 1: PR #35 (package-lock conflict) ⏱️ 15 min
Day 1: PR #34 (pre-push hook) ⏱️ 20 min  
Day 1: PR #31 (Husky v9) ⏱️ 30 min
       └─ Total: ~1 Stunde

WOCHE 1 - HOHE PRIORITÄT (TypeScript + Bug Fixes):
Day 2: PR #27 (TypeScript Migration) ⏱️ 2-3 Stunden
Day 3: PR #24 (MultiRepoAgent JSON fix) ⏱️ 1-2 Stunden
       └─ Total: ~4 Stunden

WOCHE 2 - MITTLERE PRIORITÄT (Optional):
Day 4: PR #28 (Path separators) ⏱️ 1 Stunde
Day 5: PR #26 (Jest 30) - EVALUATE FIRST ⏱️ 2-3 Stunden
       └─ Total: ~3 Stunden (if needed)

AFTER MERGES:
- Close PR #38 (this PR)
- Clean up merged branches
- Start Phase 1 of MASTER_RUNBOOK (Backend Foundation)
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

1. **JETZT:** PRs #35, #34, #31 mergen (Git Hooks + Dependencies)
2. **HEUTE:** PR #27 (TypeScript) reviewen und mergen
3. **MORGEN:** PR #24 (JSON parsing) mergen
4. **NÄCHSTE WOCHE:** PRs #28, #26 evaluieren
5. **DANACH:** Issue #22 Rate Limiting Fixes
6. **DANN:** MASTER_RUNBOOK Phase 1 starten

---

## 📝 Notes

- **Tests Status:** 717/735 passing (98%)
- **TypeScript Migration:** 66% complete (10/15 files)
- **Coverage Target:** 80% minimum (per capabilities.yml)
- **Next Major Phase:** Multi-Agent System Implementation (Issue #23)

---

**Version:** 1.0
**Letzte Aktualisierung:** 2026-01-27
**Verantwortlich:** Copilot Agent

---

## 🌐 Links

- Issues: https://github.com/den-is9186/code-cloud-agents/issues
- PRs: https://github.com/den-is9186/code-cloud-agents/pulls
- POLICY: `ops/POLICY.md`
- MASTER_RUNBOOK: `MASTER_RUNBOOK.md`
- capabilities: `capabilities.yml`
