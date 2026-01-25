# Production Checklist

> **🚨 CRITICAL:** All items marked as **Must-Have** MUST be checked ✅ before merging to `main`

---

## 🎯 Quick Overview

This checklist ensures your code is production-ready. Use it before every merge to `main`.

**Legend:**
- 🔴 **Must-Have**: Blocking - cannot deploy without
- 🟡 **Important**: Should have - critical for production quality
- 🟢 **Recommended**: Nice to have - improves maintainability

**Related Pages:**
- [Deployment Guide](Deployment-Guide.md)
- [Security Best Practices](Security-Best-Practices.md)
- [Testing Guide](Testing-Guide.md)
- [Contracts System](Contracts-System.md)

---

## 🔒 Security

### 🔴 Must-Have

- [ ] **Rate Limiting Active**
  - Verify: Check middleware configuration
  - Command: `grep -r "rate.*limit" src/`
  - See: [Security Best Practices](Security-Best-Practices.md)

- [ ] **CORS Configured**
  - Verify: Check allowed origins
  - Command: `grep -r "cors" src/config/`
  - Ensure production domains are whitelisted

- [ ] **Input Validation Everywhere**
  - Verify: All user inputs are validated
  - Command: `grep -r "validate\|schema\|zod" src/`
  - No raw database queries with user input

- [ ] **Secrets in GitHub Secrets**
  - Verify: No hardcoded credentials
  - Command: `git grep -i "password\|secret\|key" -- ':!*.md' ':!*.example'`
  - All secrets stored in GitHub Secrets or vault

- [ ] **`.env` in `.gitignore`**
  - Verify: Environment files are excluded
  - Command: `cat .gitignore | grep "\.env"`
  - Check: `.env` should NOT appear in `git status`

- [ ] **No API Keys in Code**
  - Verify: API keys loaded from environment
  - Command: `git grep -i "api.*key.*=.*['\"]" -- ':!*.md' ':!*.example'`
  - Should return no results

### 🟡 Important

- [ ] **Dependencies Updated**
  - Verify: No known vulnerabilities
  - Command: `npm audit` or `pip check`
  - Address all high/critical vulnerabilities

---

## 📖 API Documentation

### 🔴 Must-Have

- [ ] **OpenAPI/Swagger Spec Complete**
  - Verify: Spec file exists and is valid
  - Command: `ls -la docs/openapi.yaml` or `docs/swagger.json`
  - All endpoints defined

- [ ] **All Endpoints Documented**
  - Verify: Each route has OpenAPI definition
  - See: [API Reference](API-Reference.md)
  - Cross-check routes vs. documentation

### 🟡 Important

- [ ] **Request/Response Schemas Defined**
  - Verify: Complete schema definitions
  - Command: `grep -r "schema" docs/openapi.yaml`
  - Include validation rules

- [ ] **Error Responses Documented**
  - Verify: All error codes listed
  - See: [Error Codes Reference](Error-Codes-Reference.md)
  - Document all 4xx and 5xx responses

### 🟢 Recommended

- [ ] **`/api-docs` Accessible**
  - Verify: Swagger UI available (if backend)
  - Command: `curl http://localhost:3000/api-docs`
  - Should return 200 OK

---

## ⚠️ Error Handling

### 🔴 Must-Have

- [ ] **Graceful Error Handling**
  - Verify: All errors caught and handled
  - Command: `grep -r "try.*catch\|except" src/`
  - No unhandled promise rejections

- [ ] **Structured Logging (JSON)**
  - Verify: Logs in JSON format
  - Command: `grep -r "logger\|winston\|pino" src/`
  - See: [Architecture Overview](Architecture-Overview.md)

- [ ] **No Stack Traces in Production**
  - Verify: Error messages sanitized
  - Command: `grep -r "stack\|trace" src/ | grep -i "production"`
  - Stack traces only in development

### 🟡 Important

- [ ] **4xx/5xx Errors with JSON Response**
  - Verify: Consistent error format
  - Command: Test error endpoints
  - Response: `{"error": "message", "code": "ERROR_CODE"}`

- [ ] **Timeout Handling**
  - Verify: Request timeouts configured
  - Command: `grep -r "timeout" src/config/`
  - Default: 30s for API calls

---

## 🔍 Monitoring & Health

### 🔴 Must-Have

- [ ] **Health Check Endpoint (`/health`)**
  - Verify: Endpoint returns 200 OK
  - Command: `curl http://localhost:3000/health`
  - Response: `{"status": "ok", "timestamp": "..."}`

- [ ] **DB Connection Check**
  - Verify: Health check includes DB status
  - Command: `curl http://localhost:3000/health | jq .database`
  - Should verify DB connectivity

### 🟡 Important

- [ ] **Structured Logging Active**
  - Verify: All modules use logger
  - Command: `grep -r "console\.log" src/ | wc -l`
  - Should be 0 (use logger instead)

### 🟢 Recommended

- [ ] **Error Tracking Configured**
  - Verify: Sentry/similar integration
  - Command: `grep -r "sentry\|errorTracking" src/config/`
  - See: [Monitoring setup in Deployment Guide](Deployment-Guide.md)

- [ ] **Uptime Monitoring**
  - Verify: External monitoring configured
  - Example: UptimeRobot, Pingdom, etc.

---

## 🧪 Testing

### 🔴 Must-Have

- [ ] **All Unit Tests Green**
  - Verify: Run test suite
  - Command: `npm test` or `pytest`
  - All tests must pass

- [ ] **All Integration Tests Green**
  - Verify: Integration tests pass
  - Command: `npm run test:integration`
  - See: [Testing Guide](Testing-Guide.md)

- [ ] **Code Coverage ≥ 80%**
  - Verify: Coverage report
  - Command: `npm run test:coverage` or `pytest --cov`
  - Check: Coverage report in terminal

### 🟡 Important

- [ ] **E2E Tests Green (if UI)**
  - Verify: End-to-end tests pass
  - Command: `npm run test:e2e`
  - Test critical user journeys

- [ ] **Regression Tests Passed**
  - Verify: No breaking changes
  - Command: `npm run test:regression`
  - Test previously fixed bugs

---

## 📋 Contracts

### 🔴 Must-Have

- [ ] **`CONTRACTS/api_contract.md` Complete**
  - Verify: All API endpoints defined
  - Command: `cat CONTRACTS/api_contract.md | grep "##"`
  - See: [Contracts System](Contracts-System.md)

- [ ] **`CONTRACTS/data_contract.md` Complete**
  - Verify: All database schemas defined
  - Command: `cat CONTRACTS/data_contract.md | grep "##"`
  - Tables, fields, constraints documented

- [ ] **No Open TODOs in Contracts**
  - Verify: All TODOs resolved
  - Command: `grep -i "todo\|fixme\|tbd" CONTRACTS/`
  - Should return no results

### 🟡 Important

- [ ] **Frontend ↔ Backend Contracts Match**
  - Verify: API contract consistency
  - Cross-check request/response formats
  - No mismatched field names or types

- [ ] **Backend ↔ Database Contracts Match**
  - Verify: Data contract consistency
  - ORM models match database schema
  - Migration files align with contracts

---

## ⚙️ Configuration

### 🔴 Must-Have

- [ ] **`.env.example` Complete**
  - Verify: All ENV vars documented
  - Command: `diff <(cat .env.example | grep "^[A-Z]" | cut -d= -f1 | sort) <(grep -r "process\.env\." src/ | grep -o "process\.env\.[A-Z_]*" | cut -d. -f3 | sort -u)`
  - See: [Environment Variables](Environment-Variables.md)

- [ ] **All ENV Vars Documented**
  - Verify: Each variable has description
  - Command: `cat .env.example | grep "#"`
  - Include purpose and example value

- [ ] **Production ENV Vars Set**
  - Verify: All required vars in GitHub Secrets
  - Command: `gh secret list`
  - See: [Configuration Reference](Configuration-Reference.md)

### 🟡 Important

- [ ] **Secrets Rotated (if leaked)**
  - Verify: Check for exposed secrets
  - Command: `git log --all --full-history -- "*secret*" "*key*"`
  - Rotate if found in history

- [ ] **CORS Origins Configured**
  - Verify: Production domains whitelisted
  - Command: `grep -r "allowedOrigins\|origin" src/config/`
  - No `*` in production

---

## 🚀 Deployment

### 🔴 Must-Have

- [ ] **Deployment Script Tested**
  - Verify: Dry run successful
  - Command: `npm run deploy:dry-run` or similar
  - See: [Deployment Guide](Deployment-Guide.md)

- [ ] **Rollback Plan Available**
  - Verify: Documented rollback steps
  - See: [Deployment Guide - Rollback](Deployment-Guide.md#rollback)
  - Test rollback in staging

- [ ] **Database Migrations Successful**
  - Verify: Migrations applied cleanly
  - Command: `npm run migrate` or `alembic upgrade head`
  - Backup database before migrating

### 🟡 Important

- [ ] **Smoke Test Against Live URL**
  - Verify: Critical paths work
  - Command: `curl https://api.example.com/health`
  - Test main user flows

- [ ] **Build Successful**
  - Verify: Production build completes
  - Command: `npm run build` or `docker build .`
  - No errors or warnings

---

## 📚 Documentation

### 🔴 Must-Have

- [ ] **README.md Current**
  - Verify: Installation steps work
  - Command: `cat README.md | grep "##"`
  - Updated with new features

- [ ] **PROJECT_STATE.md Current**
  - Verify: Latest changes documented
  - Command: `cat PROJECT_STATE.md | head -20`
  - Current sprint/version info

### 🟡 Important

- [ ] **MASTER_RUNBOOK.md Followed**
  - Verify: All runbook rules observed
  - Command: `cat MASTER_RUNBOOK.md | grep "MUST"`
  - No violations

- [ ] **Changelog Updated**
  - Verify: Version and changes logged
  - Command: `cat CHANGELOG.md | head -20`
  - Follow [Keep a Changelog](https://keepachangelog.com/)

### 🟢 Recommended

- [ ] **API Docs Deployed**
  - Verify: Docs accessible online
  - Command: `curl https://docs.example.com`
  - Swagger/OpenAPI UI available

---

## ✅ Final Check

### 🔴 Must-Have

- [ ] **Code Review Completed**
  - Verify: PR approved by reviewer
  - Command: `gh pr view --json reviewDecision`
  - At least one approval required

- [ ] **No `console.log` / `print()` in Code**
  - Verify: Debug statements removed
  - Command: `grep -r "console\.log\|print(" src/ | grep -v "logger"`
  - Should return 0 results

- [ ] **No `TODO` / `FIXME` Without Ticket**
  - Verify: All TODOs tracked
  - Command: `grep -r "TODO\|FIXME" src/ | grep -v "#[0-9]"`
  - Each TODO should reference issue number

### 🟡 Important

- [ ] **Performance Check Performed**
  - Verify: Load testing done
  - Command: `npm run test:perf` or use tools like k6, Artillery
  - No degradation from baseline

- [ ] **Breaking Changes Documented**
  - Verify: Migration guide provided
  - Command: `cat CHANGELOG.md | grep -i "breaking"`
  - See: [Contributing Guide](Contributing-Guide.md)

---

## 🎉 Ready for Production!

**✅ All Must-Have items checked?** → Merge to `main` is approved!

**📋 Verification Summary:**
```bash
# Quick verification script
echo "Running production checklist verification..."

# Security
echo "✓ Checking secrets..."
git grep -i "password\|secret\|key" -- ':!*.md' ':!*.example' && echo "❌ Found secrets in code!" || echo "✅ No secrets found"

# Testing
echo "✓ Running tests..."
npm test && echo "✅ Tests passed" || echo "❌ Tests failed"

# Code quality
echo "✓ Checking console.logs..."
grep -r "console\.log" src/ && echo "❌ Found console.log" || echo "✅ No console.log found"

# Health check
echo "✓ Checking health endpoint..."
curl -s http://localhost:3000/health | jq . && echo "✅ Health check OK" || echo "❌ Health check failed"

echo "Production checklist verification complete!"
```

---

## 📖 Additional Resources

- [Home](Home.md)
- [Architecture Overview](Architecture-Overview.md)
- [Deployment Guide](Deployment-Guide.md)
- [Security Best Practices](Security-Best-Practices.md)
- [Testing Guide](Testing-Guide.md)
- [Contracts System](Contracts-System.md)
- [GitHub Actions Workflows](GitHub-Actions-Workflows.md)
- [Troubleshooting](Troubleshooting.md)

---

**Last Updated:** Check [PROJECT_STATE.md](../PROJECT_STATE.md) for current version
