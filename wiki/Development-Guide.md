# Development Guide - Code Cloud Agents

> **Complete guide for developers** - From setup to production deployment

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Contract-First Development](#contract-first-development)
4. [Local Development Setup](#local-development-setup)
5. [Adding New Features](#adding-new-features)
6. [Testing Requirements](#testing-requirements)
7. [Code Standards](#code-standards)
8. [Git Workflow](#git-workflow)
9. [Debugging Issues](#debugging-issues)
10. [Best Practices](#best-practices)
11. [Pre-Production Checklist](#pre-production-checklist)

---

## Getting Started

### First Time Setup

**Before you write any code, read these files:**

```bash
# Essential reading - do this first!
cat ops/POLICY.md
cat MASTER_RUNBOOK.md
cat capabilities.yml
cat PRODUCTION_CHECKLIST.md
cat CONTRACTS/api_contract.md
cat CONTRACTS/data_contract.md
cat PROJECT_STATE.md
```

### Project Structure

```
code-cloud-agents/
├── CONTRACTS/              # API & Database contracts (source of truth)
│   ├── api_contract.md     # All API endpoints
│   └── data_contract.md    # All database schemas
├── ops/                    # Operational policies
│   └── POLICY.md          # Branch strategy, merge rules
├── src/                    # Source code
├── tests/                  # Test files
├── capabilities.yml        # Feature registry with test requirements
├── MASTER_RUNBOOK.md      # Step-by-step implementation guide
├── PRODUCTION_CHECKLIST.md # Pre-deployment checklist
└── PROJECT_STATE.md       # Project goals and tech stack decisions
```

---

## Development Workflow

### The Golden Rules

1. **Contracts are Law** - No silent changes to APIs or database schemas
2. **One Feature, One Branch** - Each feature gets its own branch
3. **Tests for Every Feature** - No code without tests
4. **Review Before Merge** - All PRs require review

### Typical Development Flow

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Update contract (if needed)
# Edit CONTRACTS/api_contract.md or data_contract.md

# 4. Write code
# Implement your feature

# 5. Write tests
# Add tests to tests/

# 6. Register in capabilities
# Update capabilities.yml

# 7. Run tests
npm test  # or pytest, depending on your stack

# 8. Commit with proper message
git add .
git commit -m "feat(auth): add user authentication"

# 9. Push and create PR
git push origin feature/user-authentication
# Create PR on GitHub

# 10. After merge, clean up
git checkout develop
git pull origin develop
git branch -d feature/user-authentication
```

---

## Contract-First Development

### The Contract-First Rule

**MANDATORY:** For any API or database changes:

1. **FIRST** - Update the contract in `CONTRACTS/`
2. **THEN** - Implement the code
3. **NEVER** - Change contracts silently

### Example: Adding a New API Endpoint

**Step 1: Update `CONTRACTS/api_contract.md`**

```markdown
## POST /api/users

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- 400: Invalid email format
- 409: Email already exists
```

**Step 2: Update `CONTRACTS/data_contract.md`**

```markdown
## Table: users

| Column     | Type         | Constraints          |
|------------|--------------|----------------------|
| id         | UUID         | PRIMARY KEY          |
| email      | VARCHAR(255) | UNIQUE, NOT NULL     |
| password   | VARCHAR(255) | NOT NULL             |
| name       | VARCHAR(255) | NOT NULL             |
| created_at | TIMESTAMP    | DEFAULT NOW()        |
```

**Step 3: Now implement the code**

```javascript
// src/routes/users.js
router.post('/api/users', async (req, res) => {
  // Implementation follows the contract
});
```

### Contract Verification

Before QA, verify all components match:

```bash
# Check frontend API calls
grep -rn "fetch\|axios" src/frontend/

# Check backend routes
grep -rn "app.get\|app.post\|router" src/backend/

# Compare with CONTRACTS/api_contract.md manually
```

**Checklist:**
- [ ] Frontend ↔ Backend: API paths identical
- [ ] Frontend ↔ Backend: Request/Response fields match
- [ ] Backend ↔ Database: Queries match schema
- [ ] No TODOs in contract files

---

## Local Development Setup

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/code-cloud-agents.git
cd code-cloud-agents

# Install dependencies
npm install  # or: pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your local settings
nano .env
```

### Environment Variables

Required variables in `.env`:

```bash
# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Running Locally

```bash
# Start the development server
npm run dev

# Or with auto-reload
npm run dev:watch

# Run database migrations
npm run migrate

# Seed database (if available)
npm run seed
```

### Verify Setup

```bash
# Test health endpoint
curl http://localhost:8080/health | jq .

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "db": {
    "status": "connected"
  }
}
```

---

## Adding New Features

### Step-by-Step Process

#### 1. Define the Feature

Update `PROJECT_STATE.md` if this is a major feature:

```markdown
## MVP Features
- [x] User authentication
- [x] API rate limiting
- [ ] User profile management  ← New feature
```

#### 2. Update Contracts

**Edit `CONTRACTS/api_contract.md`:**

```markdown
## GET /api/users/:id

Get user profile information.

**Parameters:**
- `id` (path): User UUID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- 404: User not found
- 401: Unauthorized
```

#### 3. Register in `capabilities.yml`

```yaml
features:
  - name: user-profile-management
    description: Get and update user profiles
    endpoints:
      - GET /api/users/:id
      - PUT /api/users/:id
    tests:
      - unit: tests/unit/users.test.js
      - integration: tests/integration/users.test.js
    status: in-progress
```

#### 4. Create Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/user-profile-management
```

#### 5. Implement the Feature

```javascript
// src/routes/users.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');

router.get('/api/users/:id', 
  authenticate,
  validateUUID('id'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

module.exports = router;
```

#### 6. Add Input Validation

```javascript
// src/middleware/validation.js
const { body, param, validationResult } = require('express-validator');

exports.validateUUID = (field) => {
  return param(field)
    .isUUID()
    .withMessage('Must be a valid UUID');
};

exports.validateUserUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be 2-255 characters'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

#### 7. Write Tests (See Testing Section)

#### 8. Update API Documentation

Update Swagger/OpenAPI spec if using:

```yaml
# swagger.yaml
/api/users/{id}:
  get:
    summary: Get user profile
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      '200':
        description: User profile
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      '404':
        description: User not found
```

#### 9. Manual Testing

```bash
# Start the server
npm run dev

# Test the endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/users/123e4567-e89b-12d3-a456-426614174000 | jq .

# Test error cases
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/users/invalid-uuid | jq .
```

#### 10. Commit and Push

```bash
git add .
git commit -m "feat(users): add user profile management"
git push origin feature/user-profile-management
```

#### 11. Create Pull Request

Create PR on GitHub with description:
- What changed
- Why it changed
- How to test
- Link to contract changes

---

## Testing Requirements

### The Testing Rule

**Every feature MUST have tests. No exceptions.**

Register all tests in `capabilities.yml`:

```yaml
features:
  - name: user-authentication
    tests:
      - unit: tests/unit/auth.test.js
      - integration: tests/integration/auth.test.js
      - e2e: tests/e2e/auth.flow.test.js
```

### Types of Tests

#### 1. Unit Tests

Test individual functions/methods in isolation.

```javascript
// tests/unit/auth.test.js
const { hashPassword, verifyPassword } = require('../../src/utils/auth');

describe('Password Hashing', () => {
  test('hashPassword creates a valid hash', async () => {
    const password = 'myPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });
  
  test('verifyPassword validates correct password', async () => {
    const password = 'myPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  test('verifyPassword rejects incorrect password', async () => {
    const password = 'myPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });
});
```

#### 2. Integration Tests

Test API endpoints with database.

```javascript
// tests/integration/users.test.js
const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB, teardownTestDB } = require('../helpers/db');

describe('User API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  test('POST /api/users creates a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
    expect(response.body).not.toHaveProperty('password');
  });
  
  test('POST /api/users rejects duplicate email', async () => {
    // Create first user
    await request(app)
      .post('/api/users')
      .send({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'User One'
      });
    
    // Try to create duplicate
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'duplicate@example.com',
        password: 'password456',
        name: 'User Two'
      });
    
    expect(response.status).toBe(409);
    expect(response.body.error).toContain('already exists');
  });
});
```

#### 3. E2E Tests (if frontend exists)

Test complete user journeys.

```javascript
// tests/e2e/auth.flow.test.js
describe('User Authentication Flow', () => {
  test('User can sign up, log in, and access protected page', async () => {
    // Sign up
    await page.goto('http://localhost:3000/signup');
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="name"]', 'New User');
    await page.click('button[type="submit"]');
    
    // Should redirect to login
    await page.waitForURL('**/login');
    
    // Log in
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should access dashboard
    await page.waitForURL('**/dashboard');
    const heading = await page.textContent('h1');
    expect(heading).toContain('Dashboard');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run in watch mode (during development)
npm run test:watch

# Run specific test file
npm test -- tests/unit/auth.test.js
```

### Test Coverage Requirements

**Minimum coverage: 80%**

Check coverage:

```bash
npm run test:coverage

# Output:
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   85.3  |   78.2   |   90.1  |   84.9  |
 src/routes/users.js       |   92.1  |   85.7   |   100   |   91.8  |
 src/utils/auth.js         |   88.9  |   75.0   |   87.5  |   88.2  |
---------------------------|---------|----------|---------|---------|
```

---

## Code Standards

### Commit Message Convention

Use conventional commits:

```
type(scope): message

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- test: Adding or updating tests
- refactor: Code refactoring
- chore: Maintenance tasks
- perf: Performance improvements
- style: Code style changes (formatting, etc.)

Examples:
feat(auth): add JWT token refresh endpoint
fix(users): resolve email validation bug
docs(api): update API contract for user endpoints
test(auth): add integration tests for login flow
refactor(db): optimize user query performance
```

### Code Style

```javascript
// ✅ GOOD: Clear, validated, logged
router.post('/api/users', 
  validateUserInput,
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Check for existing user
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          error: 'Email already exists'
        });
      }
      
      // Create user
      const user = await User.create({ email, password, name });
      logger.info('User created', { userId: user.id });
      
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      });
    } catch (error) {
      logger.error('User creation failed', { error });
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// ❌ BAD: No validation, poor error handling, no logging
router.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  res.json(user);
});
```

### Input Validation (MANDATORY)

**Every input MUST be validated:**

```javascript
// Use validation middleware
const { body } = require('express-validator');

const validateUserInput = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be 2-255 characters'),
];
```

### Error Handling

```javascript
// Centralized error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // Don't leak stack traces in production
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});
```

### Logging

```javascript
// Use structured logging
const logger = require('./utils/logger');

// Good logging practices
logger.info('User login attempt', { 
  email: user.email, 
  ip: req.ip 
});

logger.error('Database connection failed', { 
  error: err.message,
  database: dbConfig.database 
});

// Never log sensitive data
// ❌ BAD
logger.info('User data', { password: user.password });

// ✅ GOOD
logger.info('User data', { 
  userId: user.id, 
  email: user.email 
});
```

---

## Git Workflow

### Branch Strategy

| Branch | Purpose | Merge To | Strategy |
|--------|---------|----------|----------|
| `main` | Production code | - | Protected |
| `develop` | Integration branch | `main` | Merge commit |
| `feature/*` | New features | `develop` | Squash |
| `fix/*` | Bug fixes | `develop` | Squash |
| `hotfix/*` | Production fixes | `main` + `develop` | Cherry-pick |

### Creating a Feature Branch

```bash
# Always start from latest develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-user-notifications

# Work on your feature
# ... make changes ...

# Commit regularly
git add .
git commit -m "feat(notifications): add email notification service"

# Push to remote
git push origin feature/add-user-notifications
```

### Before Creating a PR

```bash
# 1. Update from develop
git checkout develop
git pull origin develop
git checkout feature/add-user-notifications
git merge develop

# Resolve any conflicts

# 2. Run all tests
npm test

# 3. Run linter
npm run lint

# 4. Verify build
npm run build

# 5. Check that contracts are updated (if applicable)
git diff develop -- CONTRACTS/

# 6. Push
git push origin feature/add-user-notifications
```

### Pull Request Process

**PR Title Format:**
```
feat(scope): brief description
fix(scope): brief description
docs(scope): brief description
```

**PR Description Template:**
```markdown
## What Changed
- Added user notification system
- Implemented email and SMS notifications
- Updated user preferences API

## Why
Users need to be notified about important events in real-time.

## Contract Changes
- Updated `CONTRACTS/api_contract.md` with new endpoints:
  - POST /api/notifications/send
  - GET /api/notifications/:id
  - PUT /api/users/:id/preferences

## How to Test
1. Start the server: `npm run dev`
2. Send a test notification:
   ```bash
   curl -X POST http://localhost:8080/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{"userId": "uuid", "message": "Test notification"}'
   ```
3. Verify email received

## Checklist
- [x] Contract updated (if needed)
- [x] Tests added/updated
- [x] capabilities.yml updated
- [x] All tests pass
- [x] No linter errors
- [x] Documentation updated
```

### After PR is Merged

```bash
# Switch back to develop
git checkout develop
git pull origin develop

# Delete local feature branch
git branch -d feature/add-user-notifications

# Delete remote feature branch (if not auto-deleted)
git push origin --delete feature/add-user-notifications
```

### Hotfix Process

For critical production bugs:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-auth-bug

# Make the fix
# ... fix the bug ...

# Test thoroughly
npm test

# Commit
git commit -m "fix(auth): resolve token expiration bug"

# Merge to main
git checkout main
git merge hotfix/fix-critical-auth-bug
git push origin main

# Also merge to develop
git checkout develop
git merge hotfix/fix-critical-auth-bug
git push origin develop

# Delete hotfix branch
git branch -d hotfix/fix-critical-auth-bug
```

### Forbidden Actions

**NEVER do these:**

- ❌ Force push to `main` or `develop`
- ❌ Direct commits to `main`
- ❌ Merge without PR review
- ❌ Merge with failing tests
- ❌ Commit secrets or API keys
- ❌ Delete required files (contracts, configs)
- ❌ Modify contracts without documentation

---

## Debugging Issues

### Health Check Fails

```bash
# Check if server is running
curl http://localhost:8080/health

# If not responding, check logs
npm run dev

# Check database connection
psql -h localhost -U username -d dbname

# Verify environment variables
cat .env
```

### Tests Failing

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/unit/auth.test.js

# Check test database
npm run test:db:reset

# Debug a specific test
node --inspect-brk node_modules/.bin/jest tests/unit/auth.test.js
```

### Database Issues

```bash
# Check database connection
psql $DATABASE_URL

# Run migrations
npm run migrate

# Reset database (development only!)
npm run db:reset

# Check migration status
npm run migrate:status
```

### Authentication Issues

```bash
# Generate a test token
npm run generate-token

# Verify token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/protected-endpoint

# Check JWT secret in .env
grep JWT_SECRET .env
```

### CORS Issues

```bash
# Check CORS configuration
grep ALLOWED_ORIGINS .env

# Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8080/api/users
```

### Rate Limiting Issues

```bash
# Check rate limit settings
grep RATE_LIMIT .env

# Test rate limiting
for i in {1..10}; do
  curl http://localhost:8080/api/users
done
# Should get 429 after hitting limit
```

### Build Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for dependency conflicts
npm list

# Update dependencies
npm outdated
npm update
```

---

## Best Practices

### Security Best Practices

1. **Never commit secrets**
   ```bash
   # Always use environment variables
   const apiKey = process.env.API_KEY; // ✅
   const apiKey = "sk_live_abc123"; // ❌
   ```

2. **Validate all inputs**
   ```javascript
   // Always validate and sanitize
   const { body } = require('express-validator');
   
   router.post('/api/users',
     body('email').isEmail().normalizeEmail(),
     body('name').trim().escape(),
     handleRequest
   );
   ```

3. **Use rate limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

4. **Implement CORS properly**
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS.split(','),
     credentials: true
   }));
   ```

5. **Hash passwords**
   ```javascript
   const bcrypt = require('bcrypt');
   
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

### Performance Best Practices

1. **Use database indexes**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_posts_user_id ON posts(user_id);
   ```

2. **Implement pagination**
   ```javascript
   router.get('/api/users', async (req, res) => {
     const page = parseInt(req.query.page) || 1;
     const limit = parseInt(req.query.limit) || 20;
     const offset = (page - 1) * limit;
     
     const users = await User.findAll({ limit, offset });
     res.json(users);
   });
   ```

3. **Cache frequently accessed data**
   ```javascript
   const cache = new Map();
   
   async function getUser(id) {
     if (cache.has(id)) {
       return cache.get(id);
     }
     
     const user = await User.findById(id);
     cache.set(id, user);
     return user;
   }
   ```

4. **Use connection pooling**
   ```javascript
   const pool = new Pool({
     max: 20,
     min: 5,
     idle: 10000
   });
   ```

### Code Organization

1. **Separate concerns**
   ```
   src/
   ├── routes/       # Route handlers
   ├── controllers/  # Business logic
   ├── models/       # Data models
   ├── middleware/   # Middleware functions
   ├── utils/        # Utility functions
   └── config/       # Configuration
   ```

2. **Use dependency injection**
   ```javascript
   // Good: dependencies injected
   class UserService {
     constructor(database, logger) {
       this.db = database;
       this.logger = logger;
     }
   }
   ```

3. **Keep functions small**
   ```javascript
   // Each function does one thing
   async function createUser(userData) {
     await validateUserData(userData);
     const hash = await hashPassword(userData.password);
     const user = await saveUser({ ...userData, password: hash });
     await sendWelcomeEmail(user);
     return user;
   }
   ```

### Documentation

1. **Update README.md** for any setup changes
2. **Update API contracts** for any API changes
3. **Add JSDoc comments** for complex functions
4. **Keep CHANGELOG.md** updated

```javascript
/**
 * Creates a new user account
 * @param {Object} userData - User data
 * @param {string} userData.email - User email address
 * @param {string} userData.password - User password (will be hashed)
 * @param {string} userData.name - User display name
 * @returns {Promise<Object>} Created user object
 * @throws {Error} If email already exists
 */
async function createUser(userData) {
  // Implementation
}
```

---

## Pre-Production Checklist

Before deploying to production, complete the **PRODUCTION_CHECKLIST.md**.

### Quick Checklist

**Security:**
- [ ] Rate limiting active
- [ ] CORS configured
- [ ] Input validation on all endpoints
- [ ] No secrets in code
- [ ] Environment variables documented in .env.example

**API Documentation:**
- [ ] Swagger/OpenAPI spec complete
- [ ] All endpoints documented
- [ ] Error responses documented

**Monitoring & Logging:**
- [ ] Structured logging implemented
- [ ] Health check endpoint working
- [ ] Error tracking configured (e.g., Sentry)

**Testing:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Test coverage ≥ 80%
- [ ] Manual smoke tests completed

**Database:**
- [ ] Migrations tested
- [ ] Backup strategy in place
- [ ] Indexes created for frequent queries

**Performance:**
- [ ] Database connection pooling
- [ ] Graceful shutdown implemented
- [ ] Load testing completed

**Contracts:**
- [ ] All contracts up to date
- [ ] No contract violations
- [ ] Contract verification completed

### Running the Production Checklist

```bash
# Verify all tests pass
npm test

# Check test coverage
npm run test:coverage

# Verify build succeeds
npm run build

# Check for security vulnerabilities
npm audit

# Test health endpoint
curl http://localhost:8080/health | jq .

# Verify environment variables
diff .env.example .env
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run all tests
npm run lint             # Run linter
npm run build            # Build for production

# Database
npm run migrate          # Run migrations
npm run migrate:rollback # Rollback last migration
npm run db:seed          # Seed database

# Git
git checkout -b feature/name   # New feature branch
git push origin feature/name   # Push feature
git checkout develop           # Back to develop

# Testing
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:coverage    # With coverage
```

### File Checklist for New Features

- [ ] Update `CONTRACTS/api_contract.md` (if API changes)
- [ ] Update `CONTRACTS/data_contract.md` (if DB changes)
- [ ] Update `capabilities.yml`
- [ ] Write code in `src/`
- [ ] Write tests in `tests/`
- [ ] Update Swagger/OpenAPI spec
- [ ] Update README.md (if needed)
- [ ] Create PR with proper description

### When Things Go Wrong

1. **Server won't start** → Check `.env` and database connection
2. **Tests failing** → Reset test database, check recent changes
3. **Build failing** → Clean install dependencies
4. **Merge conflicts** → Rebase from develop
5. **CI/CD failing** → Check GitHub Actions logs

---

## Getting Help

### Resources

- **MASTER_RUNBOOK.md** - Step-by-step implementation guide
- **PRODUCTION_CHECKLIST.md** - Pre-deployment requirements
- **ops/POLICY.md** - Operational policies and rules
- **CONTRACTS/** - API and database contracts
- **capabilities.yml** - Feature registry

### When Uncertain

- **Don't guess** - Ask for clarification
- **Document questions** - Add to `ops/OPEN_QUESTIONS.md`
- **Check contracts** - They are the source of truth
- **Review PRs** - Learn from others' code

### Contact

- Open an issue on GitHub
- Ask in team chat
- Schedule a code review session

---

**Remember:** 
- Contracts first, code second
- Test everything
- Review before merging
- Document your changes
- Keep it simple and secure

Happy coding! 🚀
