# Master Runbook: From Idea to Production

> **The Definitive Guide** — A complete step-by-step journey to build, test, and deploy your project.

---

## 📋 Quick Navigation

| Section | When to Use | Status |
|---------|-------------|--------|
| [🚀 Step 0: Project Setup](#step-0--project-setup--decisions) | Starting a new project | ⬜ |
| [📁 Step 1: Repository Structure](#step-1--repository--structure) | Setting up the codebase | ⬜ |
| [🏥 Step 2: Backend Skeleton](#step-2--backend-skeleton--health-endpoint) | Creating initial backend | ⬜ |
| [🗄️ Step 3: Database Setup](#step-3--database-schema--migrations) | Database integration | ⬜ |
| [🔒 Step 4: Security Basics](#step-4--security-basics-mandatory) | **MANDATORY** Security layer | ⬜ |
| [📚 Step 5: API Documentation](#step-5--api-documentation-mandatory) | **MANDATORY** API docs | ⬜ |
| [⚙️ Step 6: Core Features](#step-6--core-features-implementation) | Building functionality | ⬜ |
| [🎨 Step 7: Frontend](#step-7--frontend-optional) | Building UI (optional) | ⬜ |
| [🔗 Step 7.5: Contract Verification](#step-75--contract-verification-mandatory) | **MANDATORY** Integration check | ⬜ |
| [✅ Step 8: QA & Testing](#step-8--qa--regression-testing) | Quality assurance | ⬜ |
| [🚦 Step 9: Production Checklist](#step-9--production-checklist-mandatory) | **MANDATORY** Pre-deployment | ⬜ |
| [🌐 Step 10: Deployment](#step-10--deployment--monitoring) | Going live | ⬜ |

---

## 🎯 Core Principles

Before you start, understand these **non-negotiable rules**:

```
✓ Contracts are Law     → No silent changes to API/DB contracts
✓ One Step at a Time    → Complete each step fully before moving on
✓ Tests for Every Step  → No step is done until tests pass
✓ Document as You Go    → Update docs alongside code
```

---

## 📖 Decision Tree: Which File to Read When?

```mermaid
graph TD
    Start[Starting Project] --> Step0[Step 0: Setup]
    Step0 --> ReadPS[Read PROJECT_STATE.md]
    ReadPS --> ReadContracts[Read CONTRACTS/*.md]
    ReadContracts --> ReadCap[Read capabilities.yml]
    ReadCap --> Step1[Steps 1-5: Build]
    Step1 --> Step6[Step 6: Features]
    Step6 --> CheckFeatures{All features done?}
    CheckFeatures -->|No| ReadCapAgain[Read capabilities.yml]
    ReadCapAgain --> Step6
    CheckFeatures -->|Yes| Step7[Step 7: Frontend]
    Step7 --> Step75[Step 7.5: STOP!]
    Step75 --> ReadCV[Read CONTRACT_VERIFICATION.md]
    ReadCV --> Step8[Step 8: QA]
    Step8 --> ReadScorecard[Read eval/scorecard.yaml]
    ReadScorecard --> Step9[Step 9: STOP!]
    Step9 --> ReadProd[Read PRODUCTION_CHECKLIST.md]
    ReadProd --> AllGood{All checks pass?}
    AllGood -->|No| FixIssues[Fix Issues]
    FixIssues --> Step9
    AllGood -->|Yes| Step10[Step 10: Deploy]
    Step10 --> ReadRunbook[Read ops/RUNBOOK_SUPERVISOR.md]
    ReadRunbook --> Done[🎉 Production!]
```

---

## Step 0 — Project Setup & Decisions

> **Goal:** Define what you're building and how you'll build it.

### 📝 Tasks

#### 0.1 Fill Out PROJECT_STATE.md

- [ ] **Project Goal** defined (1-2 sentences max)
- [ ] **MVP Features** listed (what MUST be in v1?)
- [ ] **Phase 2 Features** listed (what comes later?)
- [ ] **Tech Stack Decisions** documented:

**Decision Matrix:**

| Category | Options | Your Choice |
|----------|---------|-------------|
| **Deployment** | Vercel / Render / Fly / Docker / K8s | __________ |
| **Database** | PostgreSQL / SQLite / MongoDB / None | __________ |
| **Authentication** | JWT / Session / OAuth / MagicLink / None | __________ |
| **Frontend** | Next.js / React / Vue / Admin-only / None | __________ |

**Example PROJECT_STATE.md:**
```markdown
# Project State

## Goal
A task management API that allows teams to create, assign, and track tasks.

## MVP Features
- User authentication (JWT)
- CRUD operations for tasks
- Task assignment to users
- Basic filtering and search

## Phase 2 Features
- Real-time notifications
- File attachments
- Advanced analytics

## Tech Stack
- Deployment: Render
- Database: PostgreSQL
- Auth: JWT
- Frontend: React (Phase 2)
```

#### 0.2 Define Contracts

- [ ] **`CONTRACTS/api_contract.md`** — All endpoints documented
  - Include: HTTP method, path, request body, response body, error codes
- [ ] **`CONTRACTS/data_contract.md`** — All database tables documented
  - Include: Table names, columns, types, constraints, indexes

**Example API Contract Entry:**
```markdown
### POST /api/tasks
Create a new task.

**Request:**
```json
{
  "title": "string (required, max 200 chars)",
  "description": "string (optional, max 2000 chars)",
  "assigneeId": "uuid (optional)"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "assigneeId": "uuid",
  "createdAt": "ISO8601 timestamp"
}
```

**Errors:** 400, 401, 422
```

#### 0.3 Register Capabilities

- [ ] **`capabilities.yml`** — All functions registered with test requirements

**Example capabilities.yml Entry:**
```yaml
capabilities:
  - name: create_task
    description: Create a new task in the system
    endpoint: POST /api/tasks
    tests:
      - type: unit
        file: tests/unit/tasks.test.js
      - type: integration
        file: tests/integration/task_creation.test.js
    contract_ref: CONTRACTS/api_contract.md#post-apitasks
```

### ✅ Step Complete When:

- [ ] `PROJECT_STATE.md` exists and is filled out
- [ ] Both contract files exist and have at least MVP endpoints/tables
- [ ] `capabilities.yml` lists all MVP features
- [ ] All files committed to git

**Test Command:**
```bash
test -f PROJECT_STATE.md && \
test -f CONTRACTS/api_contract.md && \
test -f CONTRACTS/data_contract.md && \
test -f capabilities.yml && \
echo "✓ Step 0 Complete"
```

---

## Step 1 — Repository & Structure

> **Goal:** Set up a clean, professional repository structure.

### 📝 Tasks

- [ ] **README.md** updated with project description
- [ ] **`.gitignore`** created
  - Include: `node_modules/`, `.env`, `dist/`, `*.log`, `.DS_Store`
- [ ] **`.env.example`** created with all required variables (no values!)
- [ ] **Folder structure** matches template:

```
project-root/
├── src/
│   ├── backend/         # Server code
│   ├── frontend/        # UI code (if applicable)
│   └── shared/          # Shared utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                # Additional documentation
├── CONTRACTS/           # API and data contracts
├── ops/                 # Operations and deployment
├── .github/
│   └── workflows/       # CI/CD
├── .env.example
├── .gitignore
├── README.md
├── PROJECT_STATE.md
└── capabilities.yml
```

- [ ] **License** added (MIT, Apache, etc.)

### ✅ Step Complete When:

```bash
test -f .gitignore && \
test -f .env.example && \
test -f LICENSE && \
test -d src && \
test -d tests && \
echo "✓ Step 1 Complete"
```

**📚 Related:** [Getting Started](./Getting-Started.md) | [Development Guide](./Development-Guide.md)

---

## Step 2 — Backend Skeleton + Health Endpoint

> **Goal:** Create a minimal working server with health check.

### 📝 Tasks

- [ ] **Server starts** without errors
- [ ] **Health endpoint** returns proper JSON:

```javascript
// Example: Express.js
app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: {
      status: dbStatus ? 'connected' : 'disconnected'
    }
  });
});
```

- [ ] **Structured logging** active (pino/winston/bunyan)
- [ ] **Graceful shutdown** implemented:

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await server.close();
  await database.close();
  process.exit(0);
});
```

### ✅ Step Complete When:

```bash
# Start your server, then:
curl http://localhost:8080/health | jq .

# Expected output:
# {
#   "status": "ok",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "db": {
#     "status": "connected"
#   }
# }
```

- [ ] Health check returns 200 OK
- [ ] Response includes timestamp and db status
- [ ] Logs show structured output (JSON format)
- [ ] Server shuts down gracefully on SIGTERM

**📚 Related:** [Architecture Overview](./Architecture-Overview.md)

---

## Step 3 — Database Schema + Migrations

> **Goal:** Set up database with proper schema and migrations.

### 📝 Tasks

- [ ] **Database connection** works (test with health endpoint)
- [ ] **Schema/Migration** created
  - Use migration tool: Knex, Sequelize, TypeORM, or raw SQL
- [ ] **Initial schema** matches `CONTRACTS/data_contract.md`
- [ ] **Indexes** added for frequent queries

**Example Migration (PostgreSQL):**
```sql
-- migrations/001_initial_schema.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
```

### ✅ Step Complete When:

```bash
# Run migration
npm run migrate
# or
node scripts/migrate.js

# Verify tables exist
psql -d your_db -c "\dt"
```

- [ ] All tables from data contract exist
- [ ] Indexes are created
- [ ] Health endpoint shows `db.status: "connected"`
- [ ] Migration is reversible (down/rollback exists)

**📚 Related:** [Architecture Overview](./Architecture-Overview.md) | [Contracts System](./Contracts-System.md)

---

## Step 4 — Security Basics (MANDATORY)

> **⚠️ CRITICAL:** This step is non-negotiable. No exceptions.

### 📝 Tasks

#### 4.1 Authentication

- [ ] **Auth middleware** implemented
- [ ] **Token validation** (JWT, session, etc.)
- [ ] **Login/Register endpoints** (if needed)

**Example Auth Middleware:**
```javascript
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### 4.2 Rate Limiting (MANDATORY)

- [ ] **Rate limiter** active on all public endpoints
- [ ] **Configurable via ENV** (`RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX`)
- [ ] **Proper error response** (429 Too Many Requests)

**Example:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 min
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/', limiter);
```

#### 4.3 CORS (MANDATORY)

- [ ] **CORS configured** (not wide open!)
- [ ] **Allowed origins** from ENV variable
- [ ] **Credentials handling** properly set

**Example:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));
```

#### 4.4 Input Validation (MANDATORY)

- [ ] **All inputs validated** before processing
- [ ] **Type checks** (string, number, email, uuid, etc.)
- [ ] **Length limits** enforced
- [ ] **Sanitization** where needed (HTML, SQL)

**Example with Joi:**
```javascript
const Joi = require('joi');

const taskSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(2000).optional(),
  assigneeId: Joi.string().uuid().optional()
});

app.post('/api/tasks', async (req, res) => {
  const { error, value } = taskSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: error.details 
    });
  }
  
  // Proceed with validated data
});
```

### ✅ Step Complete When:

**Test Suite:**
```bash
# Test auth
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
# Expected: 401 Unauthorized

# Test rate limit (send 101 requests rapidly)
for i in {1..101}; do curl http://localhost:8080/health; done
# Expected: Last few should return 429

# Test validation
curl -X POST http://localhost:8080/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"' $(python -c "print('A' * 300)") '"}'
# Expected: 400 Bad Request
```

- [ ] Auth test passes (401 on protected routes)
- [ ] Rate limit test passes (429 after threshold)
- [ ] CORS test passes (preflight OPTIONS works)
- [ ] Validation test passes (rejects invalid input)

**📚 Related:** [Security Best Practices](./Security-Best-Practices.md)

---

## Step 5 — API Documentation (MANDATORY)

> **Goal:** Every endpoint must be documented. No exceptions.

### 📝 Tasks

- [ ] **OpenAPI/Swagger spec** created (`swagger.json` or `openapi.yaml`)
- [ ] **Swagger UI** accessible at `/api-docs`
- [ ] **All endpoints** documented
- [ ] **Request/Response schemas** defined
- [ ] **Error responses** documented (400, 401, 404, 500, etc.)

**Example Swagger Setup (Express + swagger-jsdoc):**
```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Management API',
      version: '1.0.0',
      description: 'API for managing tasks and users'
    },
    servers: [
      { url: 'http://localhost:8080', description: 'Development' },
      { url: 'https://api.example.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Example Route Documentation:**
```javascript
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
```

### ✅ Step Complete When:

```bash
curl http://localhost:8080/api-docs
# Should return Swagger UI HTML

# OR check JSON spec
curl http://localhost:8080/api-docs.json | jq .
```

- [ ] `/api-docs` is accessible
- [ ] All endpoints from `CONTRACTS/api_contract.md` are documented
- [ ] Can test API calls directly from Swagger UI
- [ ] Error responses are documented

**📚 Related:** [API Reference](./API-Reference.md)

---

## Step 6 — Core Features Implementation

> **Goal:** Build all MVP features from `capabilities.yml`.

### 📝 Tasks Per Feature

For **each feature** in `capabilities.yml`, follow this checklist:

#### Feature Implementation Checklist

- [ ] 1. **Check contract** — Review `CONTRACTS/api_contract.md` for this endpoint
- [ ] 2. **Implement endpoint** — Write the handler function
- [ ] 3. **Input validation** — Add validation schema (Joi, Zod, etc.)
- [ ] 4. **Error handling** — Catch errors and return proper status codes
- [ ] 5. **Logging** — Add structured logs (info, error)
- [ ] 6. **Write tests:**
  - [ ] Unit tests (business logic)
  - [ ] Integration tests (endpoint behavior)
- [ ] 7. **Update Swagger** — Document in OpenAPI spec

**Example Feature Flow:**

```javascript
// 1. Contract says: POST /api/tasks creates a task

// 2. Implement
const createTask = async (req, res, next) => {
  try {
    // 3. Validation (already done in middleware)
    const { title, description, assigneeId } = req.body;
    
    // 4. Business logic
    logger.info('Creating task', { userId: req.user.id, title });
    
    const task = await db.tasks.create({
      title,
      description,
      assigneeId: assigneeId || null,
      createdBy: req.user.id
    });
    
    // 5. Success response
    logger.info('Task created', { taskId: task.id });
    res.status(201).json(task);
    
  } catch (err) {
    // 4. Error handling
    logger.error('Task creation failed', { error: err.message });
    next(err);
  }
};

// 6. Tests
describe('POST /api/tasks', () => {
  it('should create a task with valid data', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Task' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Task');
  });
  
  it('should reject task without title', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No title' });
    
    expect(response.status).toBe(400);
  });
});

// 7. Swagger updated (see Step 5)
```

### Progress Tracking

**Use `capabilities.yml` as your TODO list:**

```yaml
capabilities:
  - name: create_task
    status: ✅ done
    
  - name: list_tasks
    status: ✅ done
    
  - name: update_task
    status: 🔄 in-progress
    
  - name: delete_task
    status: ⬜ todo
```

### ✅ Step Complete When:

- [ ] All features in `capabilities.yml` implemented
- [ ] All unit tests pass: `npm test -- tests/unit/`
- [ ] All integration tests pass: `npm test -- tests/integration/`
- [ ] Test coverage ≥ 80% (if configured)
- [ ] Swagger docs updated for all new endpoints

**Test Command:**
```bash
npm test 2>&1 | tee test-results.txt
grep -E "(passing|failing)" test-results.txt
```

**📚 Related:** [Development Guide](./Development-Guide.md) | [Testing Guide](./Testing-Guide.md)

---

## Step 7 — Frontend (Optional)

> **Goal:** Connect UI to backend API. Skip if backend-only project.

### 📝 Tasks

- [ ] **UI connected** to API (use contracts as source of truth)
- [ ] **Error handling** in UI (network errors, validation errors)
- [ ] **Loading states** for async operations
- [ ] **Responsive design** (mobile, tablet, desktop)
- [ ] **E2E tests** for critical user journeys

**Example API Integration (React):**
```javascript
// src/api/tasks.js
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const createTask = async (taskData) => {
  const response = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create task');
  }
  
  return response.json();
};

// src/components/TaskForm.jsx
const TaskForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      await createTask(data);
      // Success handling
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  );
};
```

**E2E Test Example (Playwright):**
```javascript
test('user can create a task', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=New Task');
  await page.fill('input[name="title"]', 'Test Task');
  await page.click('button:has-text("Create")');
  await expect(page.locator('text=Test Task')).toBeVisible();
});
```

### ✅ Step Complete When:

- [ ] All features from backend are accessible in UI
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Responsive on mobile, tablet, desktop
- [ ] Error messages are user-friendly
- [ ] Loading states prevent double-submissions

**📚 Related:** [Development Guide](./Development-Guide.md) | [Testing Guide](./Testing-Guide.md)

---

## Step 7.5 — Contract Verification (MANDATORY)

> **⚠️ STOP!** Before QA, verify all components work together.

### 🚨 Read This First

📖 **`docs/CONTRACT_VERIFICATION.md`** — Full verification process

### 📝 Tasks

- [ ] **Contracts finalized** (no TODO markers)
- [ ] **Frontend ↔ Backend:** API paths identical
- [ ] **Frontend ↔ Backend:** Request/Response fields match
- [ ] **Backend ↔ Database:** Queries match schema

### Verification Process

#### 1. Check Frontend API Calls

```bash
# Find all API calls in frontend
grep -rn "fetch\|axios" src/frontend/ > api-calls.txt

# Example output:
# src/frontend/api/tasks.js:10: fetch(`${API_BASE}/api/tasks`)
# src/frontend/api/users.js:15: axios.post(`${API_BASE}/api/users`)
```

#### 2. Check Backend Routes

```bash
# Find all route definitions
grep -rn "app.get\|app.post\|app.put\|app.delete\|router" src/backend/ > routes.txt

# Example output:
# src/backend/routes/tasks.js:5: router.post('/api/tasks', createTask)
# src/backend/routes/users.js:8: router.get('/api/users/:id', getUser)
```

#### 3. Compare Against Contracts

**Manual Check:** Open `CONTRACTS/api_contract.md` and verify:

| Contract | Frontend Code | Backend Code | Match? |
|----------|---------------|--------------|--------|
| `POST /api/tasks` | ✅ Found | ✅ Found | ✅ |
| `GET /api/users/:id` | ✅ Found | ✅ Found | ✅ |
| `PUT /api/tasks/:id` | ❌ Missing | ✅ Found | ❌ |

#### 4. Verify Request/Response Schemas

**Example Check:**

```javascript
// Contract says:
// POST /api/tasks request: { title, description, assigneeId }

// Frontend sends:
fetch('/api/tasks', {
  body: JSON.stringify({ 
    title: 'Test',
    description: 'Desc',
    assigneeId: '123'  // ✅ Matches contract
  })
});

// Backend expects:
const schema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string(),
  assigneeId: Joi.string().uuid()  // ✅ Matches contract
});
```

#### 5. Database Query Verification

```sql
-- Contract says: tasks table has assignee_id column

-- Backend query:
SELECT id, title, description, assignee_id FROM tasks WHERE id = $1;
-- ✅ Column names match contract
```

### ✅ Step Complete When:

- [ ] All frontend API calls match backend routes
- [ ] All request/response fields match contract
- [ ] All database queries use correct column names
- [ ] No TODO or TBD markers in contracts
- [ ] Verification document created and committed

**Test Command:**
```bash
# Run integration tests that span frontend → backend → database
npm run test:integration
```

**📚 Related:** [Contracts System](./Contracts-System.md) | [Testing Guide](./Testing-Guide.md)

---

## Step 8 — QA & Regression Testing

> **Goal:** Ensure everything works and nothing broke.

### 📝 Tasks

- [ ] **Unit tests** — All pass (test individual functions)
- [ ] **Integration tests** — All pass (test API endpoints)
- [ ] **E2E tests** — All pass (test user journeys)
- [ ] **Scorecard** — Run `eval/scorecard.yaml` checks
- [ ] **Regression tests** — Run `eval/regression_tests.yaml`
- [ ] **Code review** — Peer review or self-review

### Test Execution Plan

```bash
# 1. Unit tests
npm run test:unit
# Expected: All tests pass, coverage ≥ 80%

# 2. Integration tests
npm run test:integration
# Expected: All API endpoints return correct responses

# 3. E2E tests (if applicable)
npm run test:e2e
# Expected: All user flows work end-to-end

# 4. Run scorecard
npm run scorecard
# or
node scripts/run-scorecard.js

# 5. Regression tests
npm run test:regression
# Ensures old features still work after new changes
```

### Code Review Checklist

- [ ] No hardcoded secrets or API keys
- [ ] Error handling is consistent
- [ ] Logging is adequate (not too much, not too little)
- [ ] Code follows project style guide
- [ ] No dead code or commented-out blocks
- [ ] Performance considerations (N+1 queries, etc.)

### ✅ Step Complete When:

```bash
npm test -- --coverage

# All tests pass:
# ✓ Unit: 45 passing
# ✓ Integration: 12 passing
# ✓ E2E: 8 passing
# ✓ Coverage: 85%
```

- [ ] Test output shows 0 failures
- [ ] Coverage meets threshold
- [ ] Scorecard shows all green
- [ ] No critical issues in code review

**📚 Related:** [Testing Guide](./Testing-Guide.md) | [Tool Calling And Agentic](./Tool-Calling-And-Agentic.md)

---

## Step 9 — Production Checklist (MANDATORY)

> **⚠️ STOP!** Do NOT deploy without completing this checklist.

### 🚨 Read This First

📖 **`PRODUCTION_CHECKLIST.md`** — Complete checklist (ALL boxes must be checked)

### 📝 Critical Items

#### Security (Zero Tolerance)

- [ ] **Rate limiting** active and tested
- [ ] **CORS** configured (not `origin: '*'`)
- [ ] **Input validation** on ALL endpoints
- [ ] **No secrets in code** (use ENV variables)
- [ ] **Error handler** doesn't leak stack traces in production

```javascript
// Production error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'  // ✅ Generic message in prod
      : err.message               // ❌ Detailed message only in dev
  });
});
```

#### Documentation

- [ ] **Swagger docs** complete and accessible
- [ ] **`.env.example`** has all variables (no values!)
- [ ] **README.md** has setup instructions

#### Operational

- [ ] **Structured logging** (JSON format for parsing)
- [ ] **Health check** with DB status
- [ ] **Graceful shutdown** implemented
- [ ] **Monitoring** setup (alerts for errors, downtime)

#### Environment Variables

**Example `.env.example`:**
```bash
# Server
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Security
JWT_SECRET=your-secret-here
ALLOWED_ORIGINS=https://example.com,https://www.example.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# External Services
SENDGRID_API_KEY=your-key-here
S3_BUCKET=your-bucket-name
```

### ✅ Step Complete When:

- [ ] Every checkbox in `PRODUCTION_CHECKLIST.md` is checked
- [ ] `.env.example` is complete
- [ ] Security audit passed (no warnings)
- [ ] Documentation is up-to-date
- [ ] Monitoring dashboard configured

**Verification:**
```bash
# Check for secrets in code
git grep -i "api.key\|secret\|password" src/

# Should return 0 results (or only .env.example)
```

**📚 Related:** [Production Checklist](./Production-Checklist.md) | [Security Best Practices](./Security-Best-Practices.md) | [Environment Variables](./Environment-Variables.md)

---

## Step 10 — Deployment & Monitoring

> **Goal:** Deploy to production and verify everything works.

### 📝 Tasks

#### Pre-Deployment

- [ ] **Secrets configured** in deployment platform
- [ ] **Environment variables** set correctly
- [ ] **Database migrations** tested in staging
- [ ] **Backup plan** documented

#### Deployment

- [ ] **Deploy executed** (Vercel, Render, Docker, etc.)
- [ ] **Smoke test** against live URL
- [ ] **Health check** returns OK
- [ ] **Monitoring active** (logs, errors, uptime)

**Deployment Examples:**

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add NODE_ENV production
vercel env add DATABASE_URL <your-db-url>
```

**Docker:**
```bash
# Build image
docker build -t my-app:latest .

# Run container
docker run -d \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL=$DATABASE_URL \
  --name my-app \
  my-app:latest
```

**Render:**
```bash
# Push to Git, Render auto-deploys
git push origin main

# Or use Render CLI
render deploy
```

#### Post-Deployment Verification

```bash
# 1. Health check
curl https://your-app.com/health | jq .
# Expected: { "status": "ok", "db": { "status": "connected" } }

# 2. API test
curl https://your-app.com/api-docs
# Expected: Swagger UI HTML

# 3. Auth test
curl -X POST https://your-app.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
# Expected: 401 Unauthorized (auth is working)

# 4. Rate limit test
for i in {1..101}; do curl https://your-app.com/health; done
# Expected: Eventually returns 429 (rate limiting works)
```

#### Monitoring Setup

**Essential Metrics to Track:**

- **Uptime:** Is the service responding?
- **Response time:** Are requests fast enough?
- **Error rate:** Are requests failing?
- **Database connections:** Is DB healthy?

**Tools:** Datadog, New Relic, Sentry, LogDNA, Papertrail

**Example Sentry Setup:**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### ✅ Step Complete When:

- [ ] Health check returns 200 OK from live URL
- [ ] All smoke tests pass
- [ ] Monitoring dashboard shows green status
- [ ] Error tracking is capturing issues
- [ ] Team has access to logs

**Final Checklist:**
```bash
# Create deployment record
echo "Deployed $(date)" >> ops/deployment-log.txt
git add ops/deployment-log.txt
git commit -m "Deployment successful: $(date)"
git push
```

**📚 Related:** [Deployment Guide](./Deployment-Guide.md) | [Troubleshooting](./Troubleshooting.md) | [GitHub Actions Workflows](./GitHub-Actions-Workflows.md)

---

## 🎉 Congratulations! You're in Production!

### Post-Launch Monitoring

**First 24 Hours:**
- [ ] Check error logs every 2 hours
- [ ] Monitor response times
- [ ] Watch for unusual traffic patterns

**First Week:**
- [ ] Daily error rate review
- [ ] Performance optimization opportunities
- [ ] User feedback collection

**Ongoing:**
- [ ] Weekly uptime reports
- [ ] Monthly security audits
- [ ] Quarterly dependency updates

---

## 📊 Quick Reference: Complete Checklist

```
✅ SETUP (Step 0-1)
├─ [ ] PROJECT_STATE.md filled out
├─ [ ] Contracts defined (API + DB)
├─ [ ] capabilities.yml created
├─ [ ] Repository structure set up
└─ [ ] .env.example complete

✅ BACKEND (Step 2-4)
├─ [ ] /health endpoint works
├─ [ ] Database connected
├─ [ ] Auth implemented
├─ [ ] Rate limiting active
├─ [ ] CORS configured
└─ [ ] Input validation everywhere

✅ DOCUMENTATION (Step 5)
├─ [ ] Swagger docs complete
└─ [ ] All endpoints documented

✅ FEATURES (Step 6-7)
├─ [ ] All capabilities implemented
├─ [ ] Frontend connected (if applicable)
└─ [ ] All tests pass

✅ INTEGRATION (Step 7.5) ⚠️
├─ [ ] CONTRACT_VERIFICATION.md complete
├─ [ ] Frontend ↔ Backend verified
└─ [ ] Backend ↔ Database verified

✅ QUALITY (Step 8)
├─ [ ] Unit tests pass
├─ [ ] Integration tests pass
├─ [ ] E2E tests pass (if UI)
├─ [ ] Scorecard green
└─ [ ] Code review done

✅ PRODUCTION (Step 9-10) ⚠️
├─ [ ] PRODUCTION_CHECKLIST.md complete
├─ [ ] Secrets configured
├─ [ ] Deployed successfully
├─ [ ] Smoke tests pass
└─ [ ] Monitoring active
```

---

## 🔍 When to Read Which File

| File | Step | Purpose | Priority |
|------|------|---------|----------|
| **PROJECT_STATE.md** | 0 | Define project scope and tech stack | 🔴 Required |
| **CONTRACTS/api_contract.md** | 0, 6 | API design source of truth | 🔴 Required |
| **CONTRACTS/data_contract.md** | 0, 3 | Database schema source of truth | 🔴 Required |
| **capabilities.yml** | 0, 6 | Feature registry and test requirements | 🔴 Required |
| **docs/CONTRACT_VERIFICATION.md** | 7.5 | Integration verification process | 🔴 Required |
| **PRODUCTION_CHECKLIST.md** | 9 | Pre-deployment security/ops check | 🔴 Required |
| **ops/RUNBOOK_SUPERVISOR.md** | 10 | Deployment supervision | 🟡 Recommended |
| **eval/scorecard.yaml** | 8 | Quality metrics | 🟡 Recommended |
| **eval/regression_tests.yaml** | 8 | Prevent breaking changes | 🟡 Recommended |

---

## 🆘 Troubleshooting

**Problem:** Tests are failing
- **Solution:** Read error messages carefully, check test logs, verify contracts match implementation

**Problem:** Deployment fails
- **Solution:** Check `PRODUCTION_CHECKLIST.md`, verify all ENV vars are set, check deployment logs

**Problem:** API returns 500 errors
- **Solution:** Check application logs, verify database connection, ensure error handler is working

**Problem:** Rate limiting not working
- **Solution:** Verify middleware order (rate limiter before routes), check ENV configuration

**Problem:** CORS errors in frontend
- **Solution:** Verify `ALLOWED_ORIGINS` includes frontend URL, check credentials setting

**📚 Related:** [Troubleshooting](./Troubleshooting.md) | [FAQ](./FAQ.md)

---

## 📚 Related Wiki Pages

- [Getting Started](./Getting-Started.md) — First-time setup
- [Development Guide](./Development-Guide.md) — Daily development workflow
- [Testing Guide](./Testing-Guide.md) — Writing and running tests
- [API Reference](./API-Reference.md) — Complete API documentation
- [Security Best Practices](./Security-Best-Practices.md) — Security guidelines
- [Deployment Guide](./Deployment-Guide.md) — Deployment strategies
- [Production Checklist](./Production-Checklist.md) — Pre-deployment checklist
- [Contracts System](./Contracts-System.md) — Understanding contracts
- [Troubleshooting](./Troubleshooting.md) — Common issues and solutions

---

## 💡 Tips for Success

1. **Never skip mandatory steps** — Security and contract verification are non-negotiable
2. **Update contracts first** — Before implementing, define the contract
3. **Test continuously** — Don't wait until the end
4. **Document as you go** — Future you will thank present you
5. **Ask for help** — Better to ask than to guess wrong

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Maintainers:** Code Cloud Agents Team
