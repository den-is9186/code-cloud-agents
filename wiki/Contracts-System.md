# Contracts System Wiki

> **The Contracts System is the foundation of our development workflow. This guide explains how to work with contracts effectively.**

**Version:** 1.0  
**Last Updated:** 2026-01-25

---

## Table of Contents

1. [What is Contract-First Development?](#what-is-contract-first-development)
2. [Why Use Contracts?](#why-use-contracts)
3. [Contract Types](#contract-types)
4. [API Contract Structure](#api-contract-structure)
5. [Data Contract Structure](#data-contract-structure)
6. [Contract-First Workflow](#contract-first-workflow)
7. [How to Update Contracts](#how-to-update-contracts)
8. [Breaking vs Non-Breaking Changes](#breaking-vs-non-breaking-changes)
9. [Contract Verification Process](#contract-verification-process)
10. [Contract Violations and Consequences](#contract-violations-and-consequences)
11. [Contract Validation Tools](#contract-validation-tools)
12. [Best Practices](#best-practices)
13. [Examples](#examples)

---

## What is Contract-First Development?

**Contract-First Development** is a methodology where you define your API endpoints and data structures **BEFORE** implementing any code. Think of it as creating the blueprint before building the house.

### Core Principle

```
Contract → Implementation → Verification
    ↓           ↓              ↓
  Design     Code/Test    Validate Match
```

**NOT:**
```
❌ Code → Update Docs Later (if at all)
❌ Implementation → Discovery → Refactor
```

### Key Concepts

- **Contracts are Law**: They define the interface between all system components
- **Documentation First**: Every endpoint and data structure is documented before implementation
- **Single Source of Truth**: Contracts are the authoritative specification
- **Silent Changes Forbidden**: All contract changes must be explicit and documented

---

## Why Use Contracts?

### 1. **Prevents Integration Issues**
Contracts ensure Frontend ↔ Backend ↔ Database alignment before any code is written.

```
Without Contracts:
Frontend calls: POST /api/users with {username, email}
Backend expects: POST /api/v1/user with {user_name, email_address}
Result: 💥 Integration breaks at the last minute
```

```
With Contracts:
1. Contract defines: POST /api/v1/users with {username, email}
2. Frontend implements against contract
3. Backend implements against contract
4. Result: ✅ Perfect integration
```

### 2. **Enables Parallel Development**
Teams can work simultaneously without blocking each other:
- Frontend can mock API responses from contracts
- Backend implements to contract specifications
- Database schema is pre-defined
- All teams meet at the same interface

### 3. **Reduces Rework**
Catching design issues early prevents costly refactoring later:
- **Contract Phase**: "Should this be GET or POST?" → Easy to change
- **Implementation Phase**: "This endpoint design doesn't work" → Expensive to change
- **Production**: "We need to add a field" → Breaking change!

### 4. **Improves Communication**
Contracts serve as a common language between:
- Developers and stakeholders
- Frontend and backend teams
- Current and future team members
- Humans and AI coding agents

### 5. **Enforces Quality**
- All endpoints are documented before implementation
- Security considerations are addressed upfront
- Error handling is standardized
- Rate limits and constraints are defined

---

## Contract Types

We maintain two primary contract documents:

| Contract | Purpose | Location |
|----------|---------|----------|
| **API Contract** | Defines all HTTP endpoints, request/response formats, authentication | `CONTRACTS/api_contract.md` |
| **Data Contract** | Defines database schema, tables, relationships, enums | `CONTRACTS/data_contract.md` |

---

## API Contract Structure

The API Contract (`CONTRACTS/api_contract.md`) defines every HTTP endpoint in the system.

### Components

1. **Base URL** - Development and production endpoints
2. **Authentication** - How clients authenticate requests
3. **Endpoints** - Complete specification of each endpoint
4. **Error Responses** - Standardized error format
5. **Security** - Security constraints and validation rules
6. **Rate Limiting** - Request limits and headers
7. **Versioning** - API version strategy

### Endpoint Specification Format

Each endpoint includes:

```markdown
### [Endpoint Name]

**Zweck:** [Brief description of purpose]

```http
[METHOD] [PATH]
```

**Query Parameters:** (if applicable)
- `param_name` (required/optional): Description (default: value)

**Request Body:** (if applicable)
```json
{
  "field": "value"
}
```

**Response [STATUS CODE]:**
```json
{
  "result": "data"
}
```
```

### Example: Complete Endpoint

```markdown
### Read File

**Zweck:** Lese Inhalt einer Datei

```http
GET /api/v1/files/content?path=src/index.js
```

**Query Parameters:**
- `path` (required): Relativer Pfad zur Datei

**Response 200:**
```json
{
  "path": "src/index.js",
  "content": "const express = require('express');\n...",
  "encoding": "utf8",
  "size": 1234,
  "modified": "2026-01-25T12:00:00Z"
}
```

**Response 404:**
```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: src/index.js"
  }
}
```
```

---

## Data Contract Structure

The Data Contract (`CONTRACTS/data_contract.md`) defines all database schemas and data structures.

### Components

1. **Database Type** - Engine (SQLite, PostgreSQL)
2. **Migration Strategy** - How schema changes are applied
3. **Tables** - Complete table definitions with SQL
4. **Indexes** - Performance optimization indexes
5. **Enums** - Enumerated types and valid values
6. **Data Retention** - How long data is kept
7. **Backups** - Backup frequency and retention

### Table Definition Format

```sql
CREATE TABLE [table_name] (
  id VARCHAR(36) PRIMARY KEY,
  field_name TYPE NOT NULL,
  optional_field TYPE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_[table]_[field] ON [table]([field]);
```

### Example: Complete Table

```sql
CREATE TABLE builds (
  id VARCHAR(36) PRIMARY KEY,
  task TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, -- queued, running, completed, failed
  priority VARCHAR(20) DEFAULT 'normal',

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  result_summary TEXT,
  error_message TEXT,

  metadata JSON
);

CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_created_at ON builds(created_at);
```

### Enums

Define all valid values for enum fields:

```markdown
### build_status
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`
```

---

## Contract-First Workflow

### The Golden Rule

```
┌─────────────────────────────────────────┐
│  ERST Contract → DANN Implementation   │
│  NIEMALS Contract still ändern          │
└─────────────────────────────────────────┘
```

### Step-by-Step Process

#### Phase 1: Design
```
1. Identify the need (new feature, bug fix, enhancement)
2. Open CONTRACTS/api_contract.md or data_contract.md
3. Design the interface/schema
4. Document completely
5. Commit contract changes
```

#### Phase 2: Review
```
6. Create Pull Request for contract changes
7. Team reviews the design (not implementation)
8. Discuss and refine if needed
9. Merge contract PR
```

#### Phase 3: Implementation
```
10. Create feature branch
11. Implement code according to contract
12. Write tests validating contract compliance
13. Verify implementation matches contract exactly
```

#### Phase 4: Verification
```
14. Run contract verification (Step 7.5 in MASTER_RUNBOOK.md)
15. Ensure all components align:
    - Frontend API calls → API Contract
    - Backend routes → API Contract
    - Database queries → Data Contract
16. Fix any mismatches
```

### Workflow Diagram

```
┌──────────────┐
│ Need Feature │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Update Contract  │ ← You are here first!
│ (CONTRACTS/*.md) │
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│ Create PR    │
│ (Review)     │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Implement Code   │ ← Not before contract!
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Write Tests      │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Verify Contract      │
│ Compliance (Step 7.5)│
└──────┬───────────────┘
       │
       ▼
┌──────────────┐
│ Merge        │
└──────────────┘
```

---

## How to Update Contracts

### Adding a New Endpoint

1. **Open the API Contract**
   ```bash
   code CONTRACTS/api_contract.md
   ```

2. **Add endpoint in the appropriate section**
   ```markdown
   ### Get User Profile
   
   **Zweck:** Retrieve user profile information
   
   ```http
   GET /api/v1/users/{user_id}
   ```
   
   **Path Parameters:**
   - `user_id` (required): UUID of the user
   
   **Response 200:**
   ```json
   {
     "id": "uuid",
     "username": "john_doe",
     "email": "john@example.com",
     "created_at": "2026-01-25T12:00:00Z"
   }
   ```
   ```

3. **Update version number**
   ```markdown
   **Version:** 1.2.0  ← Increment MINOR version
   **Letzte Änderung:** 2026-01-25
   ```

4. **Commit contract change**
   ```bash
   git add CONTRACTS/api_contract.md
   git commit -m "feat(contract): add GET /api/v1/users/{user_id} endpoint"
   git push
   ```

5. **Create PR for review**

6. **After merge, implement the code**

### Adding a New Table

1. **Open the Data Contract**
   ```bash
   code CONTRACTS/data_contract.md
   ```

2. **Add table definition**
   ```sql
   ### users
   
   User account information
   
   ```sql
   CREATE TABLE users (
     id VARCHAR(36) PRIMARY KEY,
     username VARCHAR(100) NOT NULL UNIQUE,
     email VARCHAR(255) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL,
     
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_username ON users(username);
   ```
   ```

3. **Update version and commit**

4. **Create PR, review, merge**

5. **Implement migration script**

### Modifying Existing Endpoint

⚠️ **Be careful!** This might be a breaking change.

1. **Determine if change is breaking or non-breaking** (see next section)

2. **For non-breaking changes:**
   - Add new optional fields
   - Add new response fields
   - Increment MINOR version

3. **For breaking changes:**
   - Create new endpoint version (e.g., `/api/v2/...`)
   - OR create new endpoint path
   - Increment MAJOR version
   - Plan deprecation of old endpoint

4. **Document the change**
   ```markdown
   ### Update User (UPDATED in v2.0.0)
   
   **Breaking Change:** Field `name` split into `first_name` and `last_name`
   
   **Migration Guide:**
   - Old: `{"name": "John Doe"}`
   - New: `{"first_name": "John", "last_name": "Doe"}`
   ```

---

## Breaking vs Non-Breaking Changes

Understanding the difference is critical for maintaining backward compatibility.

### Non-Breaking Changes ✅

These changes are safe and don't require version bumps:

#### API Contract
- ✅ Adding a **new** endpoint
- ✅ Adding **optional** query/body parameters
- ✅ Adding **new fields** to responses
- ✅ Making a **required** field **optional**
- ✅ Adding new error codes (while keeping existing ones)
- ✅ Expanding enum values (adding new options)

#### Data Contract
- ✅ Adding a new table
- ✅ Adding a **nullable** column
- ✅ Adding an index
- ✅ Increasing field length (e.g., VARCHAR(100) → VARCHAR(200))

### Breaking Changes ❌

These changes break existing clients and require careful handling:

#### API Contract
- ❌ Removing an endpoint
- ❌ Changing endpoint path (e.g., `/users` → `/api/users`)
- ❌ Changing HTTP method (e.g., POST → PUT)
- ❌ Removing or renaming fields from request/response
- ❌ Changing field types (e.g., string → number)
- ❌ Making an **optional** field **required**
- ❌ Changing authentication mechanism
- ❌ Removing enum values
- ❌ Changing error response format

#### Data Contract
- ❌ Dropping a table
- ❌ Dropping a column
- ❌ Renaming a table or column
- ❌ Changing column type
- ❌ Making a nullable column NOT NULL
- ❌ Decreasing field length

### Handling Breaking Changes

When a breaking change is necessary:

1. **Create a new API version**
   ```
   Old: /api/v1/users
   New: /api/v2/users
   ```

2. **Maintain both versions temporarily**
   ```markdown
   ### Users (v1) - DEPRECATED
   Will be removed: 2026-06-01
   
   ### Users (v2) - CURRENT
   Use this version for new integrations
   ```

3. **Provide migration guide**
   ```markdown
   ## Migration Guide: v1 → v2
   
   **Changed:**
   - Field `name` → `full_name`
   - Field `created` → `created_at` (now ISO 8601)
   
   **Added:**
   - Field `updated_at`
   
   **Removed:**
   - Field `legacy_id`
   ```

4. **Set deprecation timeline**
   - Announce deprecation
   - Provide 3-6 month transition period
   - Send reminders
   - Finally remove old version

---

## Contract Verification Process

**Reference:** MASTER_RUNBOOK.md Step 7.5

Contract verification ensures all components align with contracts.

### When to Verify

- ✅ After implementing new features
- ✅ Before starting QA (Step 8)
- ✅ Before production deployment
- ✅ After any contract changes
- ✅ During code reviews

### Verification Checklist

```markdown
- [ ] Contracts finalized (no TODOs)
- [ ] Frontend ↔ Backend: API paths match
- [ ] Frontend ↔ Backend: Request fields match
- [ ] Frontend ↔ Backend: Response fields match
- [ ] Backend ↔ Database: Query fields match schema
- [ ] Error responses follow contract format
- [ ] All enums use defined values
- [ ] Rate limits implemented as specified
```

### Manual Verification Commands

#### 1. Check Frontend API Calls
```bash
# Find all API calls
grep -rn "fetch\|axios" src/frontend/

# Example output:
# src/frontend/api.js:10: fetch('/api/v1/users')
# src/frontend/profile.js:25: axios.get('/api/v1/users/123')
```

#### 2. Check Backend Routes
```bash
# Find all route definitions
grep -rn "app.get\|app.post\|router\|@app.route" src/backend/

# Example output:
# src/backend/routes.js:15: app.get('/api/v1/users', ...)
# src/backend/users.py:8: @app.route('/api/v1/users/<user_id>')
```

#### 3. Compare with API Contract
```bash
# Open contract and compare
cat CONTRACTS/api_contract.md | grep "^GET\|^POST\|^PUT\|^DELETE"

# Should see all endpoints listed
```

#### 4. Check Database Queries
```bash
# Find database queries
grep -rn "SELECT\|INSERT\|UPDATE\|DELETE" src/backend/

# Verify field names match data_contract.md
```

### Automated Verification (Recommended)

Create a verification script:

```javascript
// verify-contracts.js
const apiContract = require('./CONTRACTS/api_contract.md');
const dataContract = require('./CONTRACTS/data_contract.md');

// Extract endpoints from API contract
const contractEndpoints = parseContract(apiContract);

// Extract routes from backend
const backendRoutes = extractRoutes('./src/backend');

// Compare
const mismatches = compareEndpoints(contractEndpoints, backendRoutes);

if (mismatches.length > 0) {
  console.error('❌ Contract violations found:');
  mismatches.forEach(m => console.error(`  - ${m}`));
  process.exit(1);
} else {
  console.log('✅ All contracts verified');
}
```

Run before QA:
```bash
npm run verify-contracts
```

---

## Contract Violations and Consequences

### What is a Contract Violation?

A contract violation occurs when implementation doesn't match the contract:

**Examples:**
- ❌ Backend implements `/api/users` but contract says `/api/v1/users`
- ❌ Endpoint returns `{userId: 1}` but contract says `{user_id: 1}`
- ❌ Database table missing a field defined in data contract
- ❌ Required field marked as optional in code
- ❌ Silent contract change without documentation

### Detection

Violations are detected through:

1. **Code Review** - Reviewers check contract compliance
2. **Automated Tests** - Contract validation tests
3. **CI/CD Pipeline** - Automated contract verification
4. **Integration Testing** - Components fail to communicate
5. **Production Monitoring** - Increased error rates

### Consequences

#### Development Phase
- ⚠️ PR is rejected
- ⚠️ Must fix implementation or update contract
- ⚠️ Delays merge and deployment

#### CI/CD Pipeline
From `ops/POLICY.md`:
> Konsequenz: CI schlägt fehl wenn Contract-Change nicht dokumentiert.

- 🛑 Build fails
- 🛑 Cannot merge to develop/main
- 🛑 Deployment blocked

#### Production
- 💥 Integration failures
- 💥 Frontend errors (API mismatch)
- 💥 Data corruption (schema mismatch)
- 💥 Service downtime
- 💥 Rollback required

### How to Fix Violations

#### Scenario 1: Code doesn't match contract

```
Contract says: GET /api/v1/users
Code has:      GET /api/users

Fix: Update code to match contract
```

```javascript
// ❌ Wrong
app.get('/api/users', ...)

// ✅ Correct
app.get('/api/v1/users', ...)
```

#### Scenario 2: Contract is wrong

```
Contract says: GET /api/v1/users
But we need:   GET /api/v1/users/search

Fix: Update contract first, then implement
```

1. Create contract PR
2. Update `CONTRACTS/api_contract.md`
3. Merge contract change
4. Then implement code

#### Scenario 3: Silent contract change

```
Contract says: {user_id: string}
Code changed to: {userId: string}
Contract not updated

Fix: Revert code OR update contract properly
```

**Option A - Revert code (if breaking):**
```bash
git revert <commit-hash>
```

**Option B - Update contract (if justified):**
1. Create separate PR for contract
2. Document as breaking change
3. Create v2 endpoint
4. Maintain backward compatibility

---

## Contract Validation Tools

### Built-in Checks

#### 1. Code Review Checklist
When reviewing PRs, verify:
- [ ] Contract exists for new endpoints/tables
- [ ] Implementation matches contract exactly
- [ ] Field names match (case-sensitive)
- [ ] Data types match
- [ ] Required vs optional matches
- [ ] Error responses follow standard format

#### 2. Manual Testing
```bash
# Start backend
npm run dev

# Test endpoint against contract
curl http://localhost:8080/api/v1/users | jq .

# Compare response with contract
# - All fields present?
# - Correct types?
# - Correct structure?
```

### Recommended Tools

#### 1. OpenAPI/Swagger Generator
Generate OpenAPI spec from contracts:

```bash
# Generate swagger.json from api_contract.md
npm run generate-swagger

# Serve Swagger UI
npm run swagger-ui
# Visit http://localhost:8080/api-docs
```

#### 2. JSON Schema Validation
Validate responses against schemas:

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    user_id: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' }
  },
  required: ['user_id', 'username', 'email']
};

const validate = ajv.compile(schema);
const valid = validate(response);

if (!valid) {
  console.error('Contract violation:', validate.errors);
}
```

#### 3. Database Schema Validation
Validate database against data contract:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'users';

-- Check columns match contract
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users';

-- Verify indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'users';
```

#### 4. API Contract Testing (Pact/Dredd)
Automated contract testing:

```yaml
# dredd.yml
hookfiles: ./hooks.js
language: nodejs
server: npm start
server-wait: 3
loglevel: info
path: ./CONTRACTS/api_contract.md
```

```bash
# Run contract tests
npm run test:contracts
```

### Creating Custom Validators

Example contract validator script:

```javascript
#!/usr/bin/env node
// scripts/validate-contracts.js

const fs = require('fs');
const path = require('path');

function validateApiContract() {
  const contract = fs.readFileSync('CONTRACTS/api_contract.md', 'utf8');
  const routes = extractRoutesFromCode();
  
  const contractEndpoints = parseEndpoints(contract);
  const mismatches = [];
  
  contractEndpoints.forEach(endpoint => {
    if (!routes.includes(endpoint)) {
      mismatches.push(`Missing implementation: ${endpoint}`);
    }
  });
  
  routes.forEach(route => {
    if (!contractEndpoints.includes(route)) {
      mismatches.push(`Undocumented endpoint: ${route}`);
    }
  });
  
  return mismatches;
}

const errors = validateApiContract();

if (errors.length > 0) {
  console.error('❌ Contract validation failed:');
  errors.forEach(e => console.error(`   ${e}`));
  process.exit(1);
}

console.log('✅ Contract validation passed');
```

Add to package.json:
```json
{
  "scripts": {
    "validate:contracts": "node scripts/validate-contracts.js",
    "pretest": "npm run validate:contracts"
  }
}
```

---

## Best Practices

### 1. Contract Design

#### ✅ Do's

- **Be explicit about everything**
  ```markdown
  ✅ `user_id` (required): UUID v4 format, max length 36
  ❌ `user_id`: user identifier
  ```

- **Use consistent naming conventions**
  ```markdown
  ✅ created_at, updated_at, deleted_at (snake_case)
  ❌ createdAt, updated_at, DeletedAt (inconsistent)
  ```

- **Define all error cases**
  ```markdown
  ✅ Response 400: Invalid input
     Response 401: Unauthorized
     Response 404: User not found
     Response 500: Server error
  ❌ Response 200: Success (only happy path)
  ```

- **Specify field constraints**
  ```markdown
  ✅ username: string, min 3, max 50, alphanumeric + underscore
  ❌ username: string
  ```

- **Version your contracts**
  ```markdown
  ✅ **Version:** 1.2.0
     **Letzte Änderung:** 2026-01-25
  ```

#### ❌ Don'ts

- **Don't use ambiguous types**
  ```markdown
  ❌ timestamp: number (Unix? Milliseconds? Seconds?)
  ✅ timestamp: string (ISO 8601 format: "2026-01-25T12:00:00Z")
  ```

- **Don't skip edge cases**
  ```markdown
  ❌ What if file doesn't exist?
  ✅ Response 404: File not found
  ```

- **Don't leave TODOs in contracts**
  ```markdown
  ❌ Authentication: TODO
  ✅ Authentication: Bearer token in Authorization header
  ```

### 2. Contract Updates

#### ✅ Do's

- **Update contract before code**
  ```
  ✅ 1. Update contract → 2. Review → 3. Implement
  ❌ 1. Code → 2. Update contract
  ```

- **Create separate PRs for contract changes**
  ```
  ✅ PR #1: Add user endpoint to contract
     PR #2: Implement user endpoint
  ❌ PR #1: Add contract + implementation together
  ```

- **Document migration paths for breaking changes**
  ```markdown
  ✅ Migration from v1:
     - Rename field `name` → `full_name`
     - Split `address` → `street`, `city`, `zip`
  ```

- **Use semantic versioning**
  ```
  ✅ Breaking change: 1.0.0 → 2.0.0
     New feature:     1.0.0 → 1.1.0
     Bug fix:         1.0.0 → 1.0.1
  ```

#### ❌ Don'ts

- **Don't make silent changes**
  ```markdown
  ❌ Changed endpoint in code without updating contract
  ✅ Update contract, increment version, commit
  ```

- **Don't implement before contract review**
  ```
  ❌ Wrote 500 lines of code, now contract doesn't match
  ✅ Contract reviewed and approved, now implement
  ```

### 3. Contract Verification

#### ✅ Do's

- **Run verification before every PR**
  ```bash
  ✅ npm run verify-contracts
     git add .
     git commit
  ```

- **Automate verification in CI**
  ```yaml
  ✅ jobs:
       verify-contracts:
         runs-on: ubuntu-latest
         steps:
           - run: npm run verify-contracts
  ```

- **Check contracts during code review**
  ```markdown
  ✅ Reviewer checklist:
     - [ ] Contract updated if needed
     - [ ] Implementation matches contract
     - [ ] Version incremented
  ```

#### ❌ Don'ts

- **Don't skip verification**
  ```
  ❌ "It's just a small change, doesn't need verification"
  ✅ Always verify, no exceptions
  ```

- **Don't merge with contract violations**
  ```
  ❌ "We'll fix the contract mismatch later"
  ✅ Fix violations before merge
  ```

### 4. Team Collaboration

#### ✅ Do's

- **Review contracts as a team**
  - Schedule contract review sessions
  - Involve frontend, backend, and DevOps
  - Discuss implications of changes

- **Keep contracts accessible**
  - Document contract location in README
  - Link to contracts in PR templates
  - Mention in onboarding docs

- **Educate new team members**
  - Include contract training in onboarding
  - Share this wiki page
  - Pair junior devs with contract-experienced devs

#### ❌ Don'ts

- **Don't work in isolation**
  ```
  ❌ Backend team changes contract without consulting frontend
  ✅ Collaborative contract design sessions
  ```

- **Don't assume everyone knows the process**
  ```
  ❌ "They should know contracts come first"
  ✅ Remind team in meetings, docs, PRs
  ```

---

## Examples

### Example 1: Adding a New Feature ✅

**Scenario:** Add user authentication

#### Step 1: Update API Contract
```markdown
### Login

**Zweck:** Authenticate user and return JWT token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Request Body:**
- `email` (required): User email address
- `password` (required): User password (min 8 chars)

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "expires_at": "2026-01-26T12:00:00Z"
}
```

**Response 401:**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```
```

#### Step 2: Update Data Contract
```markdown
### users

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```
```

#### Step 3: Commit and Create PR
```bash
git checkout -b feature/add-auth-contract
git add CONTRACTS/api_contract.md CONTRACTS/data_contract.md
git commit -m "feat(contract): add user authentication endpoints and users table"
git push origin feature/add-auth-contract

# Create PR, get review, merge
```

#### Step 4: Implement Code
```bash
# After contract PR is merged
git checkout develop
git pull
git checkout -b feature/implement-auth

# Now implement according to contract
# - Create users table migration
# - Implement POST /api/v1/auth/login
# - Add tests
# - Verify contract compliance

npm run verify-contracts  # ✅ Pass
npm test                  # ✅ Pass
```

#### Step 5: Deploy
```bash
# Contract is already documented
# Code matches contract
# Tests pass
# Ready for production! ✅
```

---

### Example 2: Bad Contract Update ❌

**Scenario:** Developer adds endpoint without updating contract

#### What Happened
```javascript
// Developer adds to routes.js
app.post('/api/users/profile', updateProfile);

// But CONTRACTS/api_contract.md has:
// POST /api/v1/users/{user_id}

// Frontend developer implements based on contract
fetch('/api/v1/users/123', {
  method: 'POST',
  body: JSON.stringify(profile)
});

// Result: 404 Not Found 💥
```

#### The Problems
1. ❌ Contract not updated
2. ❌ Implementation doesn't match contract
3. ❌ Integration breaks
4. ❌ Wastes time debugging

#### How to Fix
```bash
# 1. Stop implementation
git stash

# 2. Update contract first
vim CONTRACTS/api_contract.md
# Add: POST /api/v1/users/{user_id}

git add CONTRACTS/api_contract.md
git commit -m "feat(contract): add update user profile endpoint"
git push

# 3. Get contract reviewed and merged

# 4. Update code to match contract
git stash pop
# Change: '/api/users/profile' → '/api/v1/users/:userId'

npm run verify-contracts  # ✅ Pass

# 5. Now it works!
```

---

### Example 3: Breaking Change Handled Correctly ✅

**Scenario:** Need to change field name from `name` to `full_name`

#### Step 1: Recognize Breaking Change
```markdown
Current contract:
{
  "name": "John Doe"
}

Desired contract:
{
  "full_name": "John Doe"
}

This is BREAKING! ⚠️
```

#### Step 2: Plan Migration
```markdown
Strategy:
1. Create v2 endpoint
2. Support both v1 and v2 simultaneously
3. Deprecate v1 with timeline
4. Remove v1 after 6 months
```

#### Step 3: Update Contract
```markdown
### Get User (v1) - DEPRECATED

⚠️ **DEPRECATED:** This endpoint will be removed on 2026-07-25
    Use `/api/v2/users/{id}` instead

```http
GET /api/v1/users/{id}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "John Doe",  ← Old field
  "email": "john@example.com"
}
```

---

### Get User (v2) - CURRENT

```http
GET /api/v2/users/{id}
```

**Response 200:**
```json
{
  "id": "uuid",
  "full_name": "John Doe",  ← New field
  "email": "john@example.com"
}
```

---

## Migration Guide: v1 → v2

**Changed:**
- Field `name` renamed to `full_name`

**Migration:**
```javascript
// Old (v1)
const user = await fetch('/api/v1/users/123');
console.log(user.name);

// New (v2)
const user = await fetch('/api/v2/users/123');
console.log(user.full_name);
```
```

#### Step 4: Implement Both Versions
```javascript
// v1 endpoint (maintained for compatibility)
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json({
    id: user.id,
    name: user.full_name,  // Map new field to old name
    email: user.email
  });
});

// v2 endpoint (new version)
app.get('/api/v2/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json({
    id: user.id,
    full_name: user.full_name,  // Use new field name
    email: user.email
  });
});
```

#### Step 5: Communicate Changes
```markdown
# CHANGELOG.md

## [2.0.0] - 2026-01-25

### BREAKING CHANGES
- User API: Field `name` renamed to `full_name` in v2 endpoints

### Migration
- Update all API calls from `/api/v1/users/` to `/api/v2/users/`
- Update code to use `full_name` instead of `name`
- v1 endpoints will be removed on 2026-07-25

### Added
- `/api/v2/users/{id}` - New version with `full_name` field

### Deprecated
- `/api/v1/users/{id}` - Use v2 instead (removal: 2026-07-25)
```

Send team notification:
```
📢 Breaking Change: User API v2

We've released v2 of the User API with improved field naming.

What changed:
- `name` → `full_name`

Action required:
- Update your code to use v2 endpoints
- v1 will be removed on July 25, 2026

Migration guide: https://wiki/User-API-v2-Migration
```

#### Step 6: Monitor and Remove
```javascript
// Add usage tracking
app.get('/api/v1/users/:id', (req, res) => {
  logger.warn('v1 endpoint used', {
    endpoint: '/api/v1/users',
    ip: req.ip,
    deprecation_date: '2026-07-25'
  });
  // ... rest of handler
});

// After 6 months, check logs
// If v1 usage is near zero, remove the endpoint
```

---

### Example 4: Contract Verification Catches Mismatch ✅

**Scenario:** Contract verification prevents production bug

#### Developer Implementation
```javascript
// Backend: routes.js
app.get('/api/v1/users', (req, res) => {
  res.json({
    users: [
      { userId: '123', userName: 'john' }  // camelCase
    ]
  });
});
```

#### Contract Says
```markdown
**Response 200:**
```json
{
  "users": [
    {
      "user_id": "uuid",  ← snake_case
      "username": "string"  ← different field name
    }
  ]
}
```
```

#### Verification Catches It
```bash
$ npm run verify-contracts

❌ Contract validation failed:
   - Field mismatch in GET /api/v1/users response
   - Expected: user_id, found: userId
   - Expected: username, found: userName
   
   Contract location: CONTRACTS/api_contract.md:95
   Implementation: src/routes.js:45

Please fix implementation or update contract.
```

#### Developer Fixes Before Merge
```javascript
// Fixed version
app.get('/api/v1/users', (req, res) => {
  res.json({
    users: [
      { 
        user_id: '123',      // ✅ snake_case
        username: 'john'     // ✅ correct field name
      }
    ]
  });
});
```

```bash
$ npm run verify-contracts
✅ All contracts verified

$ git commit -m "fix: match user response to contract"
```

#### What Was Prevented
- 💥 Frontend would have failed to parse response
- 💥 Integration tests would have failed in CI
- 💥 Possible production incident
- ✅ Caught in development, saved hours of debugging!

---

## Quick Reference

### Contract Update Checklist

```markdown
- [ ] Identify need for change
- [ ] Open appropriate contract file
- [ ] Design interface/schema
- [ ] Document completely (all fields, types, errors)
- [ ] Update version number
- [ ] Commit contract changes only
- [ ] Create PR with "contract:" prefix
- [ ] Get review from team
- [ ] Merge contract PR
- [ ] Create feature branch
- [ ] Implement code matching contract
- [ ] Write tests validating contract
- [ ] Run contract verification
- [ ] Fix any mismatches
- [ ] Create implementation PR
- [ ] Deploy
```

### Common Commands

```bash
# View contracts
cat CONTRACTS/api_contract.md
cat CONTRACTS/data_contract.md

# Verify contracts
npm run verify-contracts

# Check for undocumented endpoints
grep -rn "app.get\|app.post" src/ | wc -l
grep -c "^###" CONTRACTS/api_contract.md
# Numbers should match!

# Find API calls in frontend
grep -rn "fetch\|axios" src/frontend/

# Compare with contract
diff <(grep "^GET\|^POST" CONTRACTS/api_contract.md) \
     <(grep -oh "app\.\(get\|post\)('[^']*" src/ | cut -d"'" -f2 | sort)
```

### When Something Goes Wrong

**Problem:** Code doesn't match contract

→ Fix code to match contract OR update contract with proper review

**Problem:** Contract is incomplete

→ Add missing details before implementing

**Problem:** Breaking change discovered late

→ Create v2, maintain backward compatibility, plan migration

**Problem:** CI fails on contract verification

→ Run `npm run verify-contracts` locally, fix mismatches

**Problem:** Integration failing

→ Check contract, verify both sides implement exactly as specified

---

## Additional Resources

- **MASTER_RUNBOOK.md** - Full development workflow
- **PRODUCTION_CHECKLIST.md** - Pre-deployment verification
- **ops/POLICY.md** - Branch strategy and merge rules
- **capabilities.yml** - Feature registry and test requirements

---

## Conclusion

The Contract-First approach is not just a best practice—it's a requirement in this project. By defining interfaces before implementation:

- ✅ We prevent integration issues
- ✅ We enable parallel development
- ✅ We reduce rework and bugs
- ✅ We improve communication
- ✅ We maintain quality

**Remember the Golden Rule:**

```
┌─────────────────────────────────────────┐
│  ERST Contract → DANN Implementation   │
│  NIEMALS Contract still ändern          │
└─────────────────────────────────────────┘
```

Follow this guide, verify contracts at Step 7.5, and complete the PRODUCTION_CHECKLIST before deployment.

**Questions?** Add them to `ops/OPEN_QUESTIONS.md` and ask the team.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-25  
**Maintained By:** Code Cloud Agents Team
