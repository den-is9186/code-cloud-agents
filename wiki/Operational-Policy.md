# Operational Policy Wiki

> **Purpose**: This document defines enforceable operational policies for the Code Cloud Agents project. All contributors must follow these rules.

---

## Table of Contents
- [Branch Strategy](#branch-strategy)
- [Commit Conventions](#commit-conventions)
- [Merge Rules and Procedures](#merge-rules-and-procedures)
- [Forbidden Actions](#forbidden-actions)
- [Contract-First Rule](#contract-first-rule)
- [Versioning Strategy](#versioning-strategy)
- [Security Policies](#security-policies)
- [CI/CD Requirements](#cicd-requirements)

---

## Branch Strategy

### Branch Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      main (production)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  v1.0.0    v1.1.0    v1.2.0    v2.0.0            │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────▲───────────────▲───────────────▲──────────┘
               │               │               │
               │ Merge Commit  │               │
               │               │               │
┌──────────────┴───────────────┴───────────────┴──────────┐
│                    develop (integration)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  continuous integration and testing              │  │
│  └──────────────────────────────────────────────────┘  │
└─────▲─────────▲─────────▲──────────────────────────────┘
      │         │         │
      │ Squash  │ Squash  │ Squash
      │         │         │
┌─────┴────┐ ┌──┴─────┐ ┌─┴────────┐
│ feature/ │ │  fix/  │ │ hotfix/* │
│   *      │ │   *    │ │ (direct) │
└──────────┘ └────────┘ └──────────┘
```

### Branch Types and Rules

| Branch Type | Naming | Purpose | Lifespan | Merge Target |
|------------|--------|---------|----------|--------------|
| `main` | `main` | Production-ready code | Permanent | N/A |
| `develop` | `develop` | Integration and testing | Permanent | → `main` |
| `feature/*` | `feature/add-auth-flow` | New features | Temporary | → `develop` |
| `fix/*` | `fix/api-timeout-error` | Bug fixes | Temporary | → `develop` |
| `hotfix/*` | `hotfix/security-patch` | Critical production fixes | Temporary | → `main` + `develop` |

### ✅ Good Practice Examples

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/add-user-authentication

# Create fix branch
git checkout develop
git checkout -b fix/resolve-memory-leak

# Create hotfix branch
git checkout main
git checkout -b hotfix/patch-security-vulnerability
```

### ❌ Bad Practice Examples

```bash
# DON'T: Work directly on main
git checkout main
# ... make changes ... ❌

# DON'T: Create feature branch from main
git checkout main
git checkout -b feature/my-feature  # ❌ Should branch from develop

# DON'T: Use wrong naming convention
git checkout -b my_new_feature  # ❌ Should be feature/my-new-feature
```

---

## Commit Conventions

### Format

```
type(scope): short description

[optional body]

[optional footer]
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 authentication` |
| `fix` | Bug fix | `fix(api): resolve timeout in user endpoint` |
| `docs` | Documentation only | `docs(readme): update installation instructions` |
| `test` | Add or update tests | `test(auth): add unit tests for login flow` |
| `refactor` | Code refactoring | `refactor(db): optimize query performance` |
| `chore` | Maintenance tasks | `chore(deps): update dependencies` |
| `perf` | Performance improvements | `perf(cache): implement Redis caching` |
| `ci` | CI/CD changes | `ci(workflow): add automated deployment` |

### ✅ Good Commit Examples

```bash
# Feature with detailed description
git commit -m "feat(workflow): add auto-build with aider

Implements automatic code building using aider integration.
Includes error handling and rollback mechanisms.

Closes #123"

# Simple bug fix
git commit -m "fix(parser): handle null values in JSON response"

# Documentation update
git commit -m "docs(api): document rate limiting behavior"

# Breaking change
git commit -m "feat(api): redesign authentication endpoint

BREAKING CHANGE: /auth/login now requires OAuth2 tokens"
```

### ❌ Bad Commit Examples

```bash
# DON'T: Vague messages
git commit -m "update stuff"  # ❌
git commit -m "fix"  # ❌
git commit -m "WIP"  # ❌

# DON'T: Missing type
git commit -m "add new feature"  # ❌ Should be: feat(scope): add new feature

# DON'T: Too broad scope
git commit -m "feat(app): change everything"  # ❌
```

---

## Merge Rules and Procedures

### Feature/Fix → Develop

**Strategy**: Squash Merge

**Requirements**:
- ✅ All tests must pass
- ✅ Code review approved
- ✅ No merge conflicts
- ✅ Branch up-to-date with develop
- ✅ Contract updates documented (if applicable)

**Procedure**:
```bash
# 1. Update your branch
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# 2. Push and create PR
git push origin feature/my-feature

# 3. After approval, merge via GitHub UI with "Squash and Merge"

# 4. Delete branch after merge
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Develop → Main

**Strategy**: Merge Commit (preserves history)

**Requirements**:
- ✅ All tests pass on develop
- ✅ Code review approved by at least 2 reviewers
- ✅ `PRODUCTION_CHECKLIST.md` completed
- ✅ Version tag prepared
- ✅ Release notes drafted
- ✅ Security scan passed

**Procedure**:
```bash
# 1. Complete production checklist
# Review PRODUCTION_CHECKLIST.md and ensure all items checked

# 2. Create PR from develop to main
gh pr create --base main --head develop --title "Release v1.2.0"

# 3. After approval, merge with merge commit (not squash)
# Use GitHub UI "Create a merge commit"

# 4. Tag the release
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

### Hotfix → Main + Develop

**Strategy**: Direct merge to main, then cherry-pick to develop

**Requirements**:
- ✅ Critical security or production issue
- ✅ Minimal changes only
- ✅ Emergency approval from tech lead
- ✅ Tests included

**Procedure**:
```bash
# 1. Create hotfix from main
git checkout main
git checkout -b hotfix/critical-security-fix

# 2. Make minimal fix and test
# ... fix code ...
git commit -m "hotfix(security): patch XSS vulnerability"

# 3. Merge to main
git checkout main
git merge --no-ff hotfix/critical-security-fix
git push origin main

# 4. Apply to develop
git checkout develop
git merge --no-ff hotfix/critical-security-fix
git push origin develop

# 5. Tag hotfix release
git tag -a v1.2.1 -m "Hotfix: Security patch"
git push origin v1.2.1
```

### ✅ Merge Best Practices

- Always test locally before pushing
- Resolve conflicts in feature branch, not develop
- Keep PRs small and focused (< 500 lines)
- Request reviews early
- Respond to review comments promptly

### ❌ Merge Anti-Patterns

```bash
# DON'T: Force push to protected branches
git push --force origin main  # ❌ FORBIDDEN

# DON'T: Merge without tests
git merge feature/untested  # ❌ Run tests first

# DON'T: Merge own PRs without review
# ❌ Always require code review

# DON'T: Merge with failing CI
# ❌ Wait for CI to pass
```

---

## Forbidden Actions

> **Warning**: These actions will result in CI failures, automatic PR rejection, or manual intervention.

### Critical Violations (Immediate Rejection)

| Action | Consequence | How to Fix |
|--------|-------------|------------|
| ❌ Force push to `main` or `develop` | PR rejected, branch protection triggered | Contact admin to restore |
| ❌ Direct commits to `main` | CI fails, commit reverted | Create proper feature branch |
| ❌ Commit secrets or API keys | Security scan blocks, incident created | Rotate secrets immediately |
| ❌ Delete mandatory files | CI fails | Restore from git history |
| ❌ Merge without passing tests | PR blocked by branch protection | Fix tests before merge |

### High-Priority Violations (Review Required)

| Action | Consequence | How to Fix |
|--------|-------------|------------|
| ❌ Deploy without `PRODUCTION_CHECKLIST.md` | Deployment blocked | Complete checklist |
| ❌ Change contracts without documentation | Contract validation fails | Update `CONTRACTS/*.md` first |
| ❌ Merge without code review | PR cannot be merged | Request review |
| ❌ Skip CI checks | PR blocked | Re-run CI pipeline |

### Medium-Priority Violations (Warning)

| Action | Consequence | How to Fix |
|--------|-------------|------------|
| ⚠️ Commit with wrong convention | CI warning, merge slowed | Amend commit message |
| ⚠️ Large PRs (>500 lines) | Review delayed | Split into smaller PRs |
| ⚠️ Missing tests for new code | Coverage check fails | Add tests |
| ⚠️ Outdated dependencies | Security alert | Update dependencies |

### Examples of Forbidden Actions

```bash
# ❌ FORBIDDEN: Force push to protected branch
git push --force origin main

# ❌ FORBIDDEN: Direct commit to main
git checkout main
echo "quick fix" >> file.txt
git commit -m "quick fix"
git push origin main

# ❌ FORBIDDEN: Commit secrets
echo "API_KEY=sk_live_123456" >> .env
git add .env
git commit -m "add config"  # ❌ Will trigger security scan

# ❌ FORBIDDEN: Delete mandatory files
git rm PRODUCTION_CHECKLIST.md
git commit -m "cleanup"  # ❌ CI will fail

# ❌ FORBIDDEN: Merge without review
gh pr merge 123 --squash --auto  # ❌ Requires approval first
```

### What to Do If You Violate a Rule

1. **Stop immediately** - Don't push if you haven't already
2. **Notify team** - Alert in team channel if already pushed
3. **Follow recovery procedure**:
   ```bash
   # If not pushed yet
   git reset --soft HEAD~1  # Undo last commit
   
   # If pushed to feature branch
   git revert HEAD  # Create revert commit
   
   # If pushed to main/develop (contact admin immediately)
   ```
4. **Document incident** - Update `ops/INCIDENTS.md`
5. **Prevent recurrence** - Add pre-commit hook if needed

---

## Contract-First Rule

> **MANDATORY**: All API and database changes MUST follow contract-first development.

### The Rule

```
┌─────────────────────────────────────────────────────┐
│  1. Update Contract (CONTRACTS/*.md)                │
│           ↓                                          │
│  2. Get Contract Review                             │
│           ↓                                          │
│  3. Implement Code                                  │
│           ↓                                          │
│  4. Validate Against Contract                       │
│           ↓                                          │
│  5. Merge                                           │
└─────────────────────────────────────────────────────┘
```

### Enforcement Mechanism

**CI checks**:
1. Contract files changed? → Require contract review label
2. API/DB code changed without contract update? → Block PR
3. Breaking changes detected? → Require major version bump

### ✅ Correct Contract-First Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-payment-endpoint

# 2. FIRST: Update the contract
vim CONTRACTS/api_contract.md
```

```markdown
### POST /api/v1/payments
**Status**: APPROVED
**Version**: 1.1.0

Request:
{
  "amount": 1000,
  "currency": "USD",
  "customer_id": "cust_123"
}

Response:
{
  "payment_id": "pay_456",
  "status": "pending"
}
```

```bash
# 3. Commit contract update
git add CONTRACTS/api_contract.md
git commit -m "docs(contract): add payment endpoint specification"

# 4. NOW implement the code
vim src/api/payments.js
# ... implement according to contract ...

# 5. Add tests that validate contract compliance
vim tests/api/payments.test.js

# 6. Register in capabilities
vim capabilities.yml

# 7. Commit implementation
git add .
git commit -m "feat(payments): implement payment endpoint per contract"

# 8. Push and create PR
git push origin feature/add-payment-endpoint
```

### ❌ Wrong: Code-First (Will Fail)

```bash
# DON'T: Implement first, document later
git checkout -b feature/add-payment-endpoint

# ❌ Implementing without contract
vim src/api/payments.js
# ... write code ...
git commit -m "feat(payments): add endpoint"

# ❌ This will fail CI validation
git push origin feature/add-payment-endpoint
```

**CI Error**:
```
❌ Contract Validation Failed
API changes detected in: src/api/payments.js
No corresponding contract update found in: CONTRACTS/api_contract.md

Action Required:
1. Update CONTRACTS/api_contract.md
2. Get contract review approval
3. Re-run CI
```

### Contract Types

| Contract | Location | When to Update |
|----------|----------|----------------|
| API Contract | `CONTRACTS/api_contract.md` | New endpoints, request/response changes |
| Data Contract | `CONTRACTS/data_contract.md` | Database schema changes |
| Integration Contract | `CONTRACTS/integration_contract.md` | External service integrations |

### Silent Contract Changes (FORBIDDEN)

```bash
# ❌ NEVER do this
git add CONTRACTS/api_contract.md src/api/payments.js
git commit -m "feat(payments): add endpoint"  # Hiding contract change

# ✅ ALWAYS separate contract commits
git add CONTRACTS/api_contract.md
git commit -m "docs(contract): add payment endpoint specification"
git add src/api/payments.js
git commit -m "feat(payments): implement payment endpoint per contract"
```

---

## Versioning Strategy

### Semantic Versioning: `MAJOR.MINOR.PATCH`

```
     v1.2.3
     │ │ │
     │ │ └─ PATCH: Bug fixes, no API changes
     │ └─── MINOR: New features, backwards-compatible
     └───── MAJOR: Breaking changes
```

### Version Bump Rules

| Change Type | Version | Example |
|-------------|---------|---------|
| Breaking API change | MAJOR | v1.5.3 → v2.0.0 |
| New feature (compatible) | MINOR | v1.5.3 → v1.6.0 |
| Bug fix | PATCH | v1.5.3 → v1.5.4 |
| Hotfix | PATCH | v1.5.3 → v1.5.4 |
| Security patch | PATCH | v1.5.3 → v1.5.4 |

### ✅ Good Versioning Examples

```bash
# PATCH: Bug fix
git tag -a v1.5.4 -m "fix(auth): resolve session timeout bug"

# MINOR: New feature (compatible)
git tag -a v1.6.0 -m "feat(api): add export functionality"

# MAJOR: Breaking change
git tag -a v2.0.0 -m "feat(api)!: redesign authentication

BREAKING CHANGE: /auth endpoint now requires OAuth2"
```

### ❌ Wrong Versioning

```bash
# DON'T: Skip versions
v1.5.3 → v1.5.5  # ❌ Missing v1.5.4

# DON'T: Wrong bump for breaking change
# Breaking API change but only minor bump
v1.5.3 → v1.6.0  # ❌ Should be v2.0.0

# DON'T: Inconsistent tags
git tag v1.5.4  # ❌ Missing 'v' prefix consistency
git tag 1.5.5   # ❌ Should be v1.5.5
```

### Pre-release Versions

```bash
# Alpha releases
v2.0.0-alpha.1
v2.0.0-alpha.2

# Beta releases
v2.0.0-beta.1
v2.0.0-beta.2

# Release candidates
v2.0.0-rc.1
v2.0.0-rc.2

# Final release
v2.0.0
```

### Version Management Checklist

- [ ] Update `package.json` version field
- [ ] Update `CHANGELOG.md` with changes
- [ ] Tag commit with version
- [ ] Create GitHub release with notes
- [ ] Update documentation version references

---

## Security Policies

### Secret Management

**RULE**: Never commit secrets to version control.

#### Approved Secret Storage

| Environment | Method | Example |
|-------------|--------|---------|
| Local Development | `.env` files (gitignored) | `API_KEY=test123` |
| CI/CD | GitHub Secrets | `${{ secrets.API_KEY }}` |
| Production | Environment variables | Injected by deployment |

#### ✅ Correct Secret Usage

```bash
# 1. Create .env file (gitignored)
cat > .env << EOF
API_KEY=sk_live_1234567890
DATABASE_URL=postgres://user:pass@localhost/db
EOF

# 2. Ensure .env is in .gitignore
echo ".env" >> .gitignore

# 3. Use environment variables in code
```

```javascript
// ✅ Good: Load from environment
const apiKey = process.env.API_KEY;

// ❌ Bad: Hardcoded secret
const apiKey = "sk_live_1234567890";
```

#### GitHub Actions Secret Usage

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        env:
          API_KEY: ${{ secrets.API_KEY }}  # ✅ Correct
        run: |
          echo "Deploying..."
          # Use $API_KEY here
```

### Security Incident Response

**If secrets are leaked**:

```bash
# 1. IMMEDIATELY rotate the secret
# 2. Revoke compromised credentials
# 3. Remove from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 4. Force push (exception for security)
git push origin --force --all

# 5. Document in ops/INCIDENTS.md
```

### Dependency Security

**Requirements**:
- ✅ Weekly dependency updates
- ✅ Automated security scans (Dependabot)
- ✅ No critical vulnerabilities in production
- ✅ Review all dependency updates

```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Update dependencies
npm update
npm outdated
```

### Security Checklist

- [ ] No secrets in code or config files
- [ ] All secrets in GitHub Secrets or env vars
- [ ] `.env` files in `.gitignore`
- [ ] Dependencies scanned for vulnerabilities
- [ ] Security patches applied within 24h
- [ ] API endpoints have rate limiting
- [ ] Authentication required for sensitive operations
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled

---

## CI/CD Requirements

### Continuous Integration

**All PRs must pass**:

```
┌─────────────────────────────────────────────┐
│  1. Linting (ESLint/Prettier)              │
│  2. Unit Tests (80%+ coverage)             │
│  3. Integration Tests                       │
│  4. Contract Validation                     │
│  5. Security Scan (Dependabot)             │
│  6. Build Verification                      │
└─────────────────────────────────────────────┘
```

### Pipeline Configuration

#### Required Checks

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Lint code
        run: npm run lint
      # ✅ Must pass for PR approval

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      - name: Check coverage
        run: npm run coverage
      # ✅ Must achieve 80%+ coverage

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Security audit
        run: npm audit
      # ✅ No critical vulnerabilities

  contract-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate contracts
        run: npm run validate-contracts
      # ✅ Contract changes documented
```

### Code Coverage Requirements

**Minimum**: 80% overall coverage

```bash
# Check coverage
npm run coverage

# Output must show:
Statements   : 85.5% ( 342/400 )  # ✅ Pass
Branches     : 82.1% ( 156/190 )  # ✅ Pass
Functions    : 88.3% ( 106/120 )  # ✅ Pass
Lines        : 85.5% ( 342/400 )  # ✅ Pass
```

### Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Verify checklist
        run: |
          # ✅ Check PRODUCTION_CHECKLIST.md completed
          
      - name: Run full test suite
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy
        run: npm run deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### CI/CD Best Practices

#### ✅ Good Practices

- Fast feedback (< 5 min for basic checks)
- Parallel job execution
- Cache dependencies
- Clear error messages
- Automatic rollback on failure

#### ❌ Anti-Patterns

```yaml
# DON'T: Store secrets in workflow files
env:
  API_KEY: "sk_live_12345"  # ❌

# DON'T: Skip tests for speed
run: npm test -- --skip  # ❌

# DON'T: Deploy without checks
- run: npm run deploy  # ❌ No verification
```

---

## Enforcement Summary

| Rule | Enforcement | Bypass Allowed? |
|------|-------------|-----------------|
| Branch protection | Automated | No |
| Commit conventions | CI warning | No |
| Code review | GitHub required | Emergency only |
| Test passing | CI blocking | No |
| Coverage 80%+ | CI blocking | No |
| Contract-first | CI blocking | No |
| No secrets committed | Security scan | Never |
| Production checklist | Manual verification | No |

---

## Quick Reference Card

### Starting Work
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### Before Committing
- [ ] Tests pass locally
- [ ] Contract updated (if API/DB change)
- [ ] No secrets in code
- [ ] Commit message follows convention

### Before Creating PR
- [ ] Branch up-to-date with develop
- [ ] All tests pass
- [ ] Code coverage meets threshold
- [ ] Self-review completed

### Before Merging
- [ ] Code review approved
- [ ] CI checks pass
- [ ] Conflicts resolved
- [ ] Ready for production (if to main)

---

## Questions or Exceptions?

- **Policy clarification**: Ask in #dev-ops channel
- **Emergency bypass**: Contact tech lead
- **Policy update**: Create PR to `ops/POLICY.md`

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained by**: DevOps Team
