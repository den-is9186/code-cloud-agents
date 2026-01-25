# Testing Guide

> **Comprehensive testing documentation for Code Cloud Agents**

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Types of Tests](#types-of-tests)
3. [Running Tests](#running-tests)
4. [Test Structure and Patterns](#test-structure-and-patterns)
5. [Writing New Tests](#writing-new-tests)
6. [Mocking and Test Doubles](#mocking-and-test-doubles)
7. [Coverage Requirements](#coverage-requirements)
8. [Testing API Endpoints](#testing-api-endpoints)
9. [Testing Redis Integration](#testing-redis-integration)
10. [Testing GitHub Actions Locally](#testing-github-actions-locally)
11. [CI/CD Test Automation](#cicd-test-automation)
12. [Best Practices](#best-practices)
13. [Anti-Patterns](#anti-patterns)

---

## Testing Philosophy

### Core Principles

**Every function MUST be tested** - No code ships without tests. This is enforced through:
- `capabilities.yml` registration system
- 80% minimum code coverage requirement
- Pre-merge review checklist

**Test-Driven Mindset**
```
Feature Request → Contract Update → Test Writing → Implementation → Verification
```

**Quality Gates**
- ✅ All unit tests pass
- ✅ All integration tests pass  
- ✅ Code coverage ≥ 80%
- ✅ No regressions
- ✅ API contracts validated

### Coverage Targets

From `capabilities.yml`:
```yaml
coverage:
  minimum: 80      # Required for all code
  targets:
    unit: 90       # Target for unit tests
    integration: 70 # Target for integration tests
```

**Why 80%?** 
- Balances thoroughness with pragmatism
- Catches most bugs without over-testing
- Industry standard for production systems

---

## Types of Tests

### 1. Unit Tests

**Purpose:** Test individual functions/modules in isolation

**When to Use:**
- Testing pure functions
- Business logic validation
- Input validation
- Error handling

**Example: Testing Validation Logic**
```javascript
describe('validateAgentId', () => {
  test('should accept valid agent ID', () => {
    const validId = 'agent-123_test:v1.0';
    expect(() => validateAgentId(validId)).not.toThrow();
  });

  test('should reject empty agent ID', () => {
    expect(() => validateAgentId('')).toThrow('must be a non-empty string');
  });

  test('should reject agent ID over 256 characters', () => {
    const longId = 'a'.repeat(257);
    expect(() => validateAgentId(longId)).toThrow('256 characters or less');
  });

  test('should reject invalid characters', () => {
    expect(() => validateAgentId('agent@#$%')).toThrow('invalid characters');
  });
});
```

### 2. Integration Tests

**Purpose:** Test multiple components working together

**When to Use:**
- API endpoint testing
- Database interactions
- External service integrations
- File system operations

**Example: API Endpoint with Redis**
```javascript
describe('Integration Tests - File Operations API', () => {
  let mockRedis;
  const testDir = path.join(process.cwd(), 'tests', 'test-files');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
    if (!mockRedis.ping) {
      mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    }
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should list files in directory', async () => {
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
    
    const response = await request(app)
      .get('/api/v1/files')
      .query({ path: 'tests/test-files' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('files');
    expect(response.body.files.map(f => f.name)).toContain('file1.txt');
  });
});
```

### 3. E2E Tests (Planned)

**Purpose:** Test complete user workflows

**When to Use:**
- Full workflow validation
- GitHub Actions integration
- Multi-step processes

**From capabilities.yml:**
```yaml
capabilities:
  - id: "auto-build-workflow"
    tests_required:
      - type: "integration"
        description: "Workflow triggered erfolgreich"
      - type: "integration"
        description: "Aider führt Task aus"
      - type: "integration"
        description: "Code wird committed und gepusht"
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Jest Configuration

From `package.json`:
```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": ["src/**/*.js"],
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

### Coverage Reports

After running `npm run test:coverage`:
```
coverage/
├── lcov-report/
│   └── index.html          # Open in browser
├── coverage-final.json
└── lcov.info
```

**View Coverage:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

---

## Test Structure and Patterns

### Standard Test File Structure

```javascript
// 1. Imports
const request = require('supertest');
const Redis = require('ioredis');
const app = require('../src/index');

// 2. Mock setup (before imports that use them)
jest.mock('ioredis');

// 3. Test suite organization
describe('Feature/Module Name', () => {
  // 4. Setup and teardown
  let mockRedis;

  beforeAll(() => {
    // One-time setup (expensive operations)
  });

  beforeEach(() => {
    // Reset state before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
  });

  afterAll(() => {
    // Final cleanup
  });

  // 5. Nested describe blocks for organization
  describe('GET /api/endpoint', () => {
    test('should handle success case', async () => {
      // Arrange
      const testData = { key: 'value' };
      
      // Act
      const response = await request(app)
        .get('/api/endpoint')
        .send(testData);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expected);
    });
  });
});
```

### AAA Pattern (Arrange-Act-Assert)

```javascript
test('should create agent state', async () => {
  // Arrange - Set up test data and mocks
  const agentId = 'test-agent-123';
  mockRedis.setex.mockResolvedValue('OK');

  // Act - Execute the code being tested
  const response = await request(app)
    .post('/api/v1/agent/state')
    .send({ agentId, status: 'pending' });

  // Assert - Verify the results
  expect(response.status).toBe(200);
  expect(response.body.agentId).toBe(agentId);
  expect(mockRedis.setex).toHaveBeenCalled();
});
```

---

## Writing New Tests

### Step-by-Step Process

#### 1. Register in capabilities.yml

```yaml
capabilities:
  - id: "new-feature"
    name: "New Feature"
    description: "Description of feature"
    status: "planned"
    tests_required:
      - type: "unit"
        description: "Test core functionality"
      - type: "integration"
        description: "Test API endpoint"
```

#### 2. Create Test File

```bash
# Unit tests
touch tests/feature-name.test.js

# Integration tests (if needed)
# Add to tests/integration.test.js
```

#### 3. Write Test Cases

```javascript
describe('New Feature', () => {
  describe('Happy Path', () => {
    test('should work with valid input', () => {
      // Test implementation
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      // Test implementation
    });

    test('should handle maximum values', () => {
      // Test implementation
    });
  });

  describe('Error Cases', () => {
    test('should reject invalid input', () => {
      // Test implementation
    });

    test('should handle system errors gracefully', () => {
      // Test implementation
    });
  });
});
```

#### 4. Run and Verify

```bash
npm run test:watch  # Develop with live feedback
npm run test:coverage  # Check coverage
```

---

## Mocking and Test Doubles

### Mocking Redis

**Pattern Used in Project:**

```javascript
// At top of test file (before requiring app)
jest.mock('ioredis');

const app = require('../src/index');

describe('Test Suite', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked instance
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
    
    // Setup mock methods
    if (!mockRedis.on) {
      mockRedis.on = jest.fn();
    }
    if (!mockRedis.ping) {
      mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    }
  });

  test('should handle Redis connection', async () => {
    mockRedis.ping.mockResolvedValue('PONG');
    
    const response = await request(app).get('/health');
    
    expect(response.body.redis).toBe('connected');
    expect(mockRedis.ping).toHaveBeenCalled();
  });
});
```

### Mocking Redis Failures

```javascript
test('should handle Redis disconnection', async () => {
  // Mock Redis failure
  mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

  const response = await request(app).get('/health');

  expect(response.status).toBe(503);
  expect(response.body).toEqual({
    status: 'unhealthy',
    redis: 'disconnected',
    error: 'Connection refused'
  });
});
```

### Mocking File System

```javascript
const fs = require('fs').promises;
const path = require('path');

describe('File Operations', () => {
  const testDir = path.join(process.cwd(), 'tests', 'test-files');
  
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should create test file', async () => {
    const testFile = path.join(testDir, 'test.txt');
    await fs.writeFile(testFile, 'content');
    
    const content = await fs.readFile(testFile, 'utf8');
    expect(content).toBe('content');
  });
});
```

### Mocking Time

```javascript
describe('Time-dependent tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should use mocked time', () => {
    const now = new Date();
    expect(now.getFullYear()).toBe(2024);
  });
});
```

---

## Coverage Requirements

### Minimum Requirements (PRODUCTION_CHECKLIST.md)

From Production Checklist:
```markdown
## Testing
- [ ] Alle Unit Tests grün
- [ ] Alle Integration Tests grün
- [ ] E2E Tests grün (falls UI)
- [ ] Code Coverage ≥ 80%
- [ ] Regression Tests durchlaufen
```

### Checking Coverage

```bash
npm run test:coverage
```

**Output:**
```
-----------------------|---------|----------|---------|---------|-------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------------|---------|----------|---------|---------|-------------------
All files              |   85.23 |    78.45 |   90.12 |   84.89 |                   
 src/                  |   85.23 |    78.45 |   90.12 |   84.89 |                   
  index.js             |   85.23 |    78.45 |   90.12 |   84.89 | 125-130,245       
-----------------------|---------|----------|---------|---------|-------------------
```

### What Counts Toward Coverage?

✅ **Covered:**
- Statements executed
- Branches taken (if/else)
- Functions called
- Lines run

❌ **Not Covered:**
- Dead code
- Unreachable branches
- Error paths not tested

### Improving Coverage

**Strategy:**
1. Identify uncovered lines: `coverage/lcov-report/index.html`
2. Add tests for missing paths
3. Focus on error handling and edge cases

```javascript
// Before: Only happy path tested (50% coverage)
test('should process data', () => {
  const result = processData({ valid: true });
  expect(result).toBeTruthy();
});

// After: Both paths tested (100% coverage)
test('should process valid data', () => {
  const result = processData({ valid: true });
  expect(result).toBeTruthy();
});

test('should reject invalid data', () => {
  expect(() => processData({ valid: false }))
    .toThrow('Invalid data');
});
```

---

## Testing API Endpoints

### Using Supertest

**Setup:**
```javascript
const request = require('supertest');
const app = require('../src/index');
```

### GET Requests

```javascript
describe('GET /api/v1/files', () => {
  test('should list files with query parameters', async () => {
    const response = await request(app)
      .get('/api/v1/files')
      .query({ path: 'tests/test-files' })
      .expect(200);

    expect(response.body).toHaveProperty('path');
    expect(response.body).toHaveProperty('files');
    expect(Array.isArray(response.body.files)).toBe(true);
  });

  test('should return 404 for non-existent path', async () => {
    const response = await request(app)
      .get('/api/v1/files')
      .query({ path: 'non-existent' })
      .expect(404);

    expect(response.body.error).toHaveProperty('code', 'FILE_NOT_FOUND');
  });
});
```

### POST Requests

```javascript
describe('POST /api/v1/agent/state', () => {
  test('should create new agent state', async () => {
    const agentData = {
      agentId: 'test-agent-123',
      status: 'pending',
      progress: 0,
      metadata: { task: 'Test task' }
    };

    const response = await request(app)
      .post('/api/v1/agent/state')
      .send(agentData)
      .expect(200);

    expect(response.body.agentId).toBe(agentData.agentId);
    expect(response.body.state.status).toBe('pending');
  });

  test('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/v1/agent/state')
      .send({})
      .expect(400);

    expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    expect(response.body.error.message).toContain('agentId is required');
  });
});
```

### DELETE Requests

```javascript
describe('DELETE /api/v1/agent/state/:agentId', () => {
  beforeEach(async () => {
    // Create state to delete
    await request(app)
      .post('/api/v1/agent/state')
      .send({ agentId: 'test-delete', status: 'pending' });
  });

  test('should delete existing state', async () => {
    const response = await request(app)
      .delete('/api/v1/agent/state/test-delete')
      .expect(200);

    expect(response.body.deleted).toBe(true);
  });

  test('should return 404 for non-existent state', async () => {
    const response = await request(app)
      .delete('/api/v1/agent/state/non-existent')
      .expect(404);

    expect(response.body.error.code).toBe('STATE_NOT_FOUND');
  });
});
```

### Testing Headers and Content Types

```javascript
test('should return JSON content type', async () => {
  const response = await request(app).get('/');

  expect(response.headers['content-type']).toMatch(/json/);
  expect(response.status).toBe(200);
});

test('should handle large JSON payloads', async () => {
  const largeData = {
    content: 'x'.repeat(1024 * 1024) // 1MB
  };

  const response = await request(app)
    .post('/api/v1/files/content')
    .send(largeData);

  expect(response.status).toBeLessThan(500);
});
```

### Testing Error Responses

```javascript
describe('Error handling', () => {
  test('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);
  });

  test('should return structured error for validation failures', async () => {
    const response = await request(app)
      .post('/api/v1/agent/state')
      .send({ agentId: '', status: 'invalid' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
  });
});
```

---

## Testing Redis Integration

### Redis Health Check

```javascript
describe('GET /health', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
  });

  test('should return healthy when Redis is connected', async () => {
    mockRedis.ping.mockResolvedValue('PONG');

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      redis: 'connected'
    });
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  test('should return unhealthy when Redis is disconnected', async () => {
    mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      redis: 'disconnected',
      error: 'Connection refused'
    });
  });
});
```

### Redis Data Operations

```javascript
describe('Agent State with Redis', () => {
  beforeEach(() => {
    mockRedis.setex = jest.fn().mockResolvedValue('OK');
    mockRedis.get = jest.fn();
    mockRedis.sadd = jest.fn().mockResolvedValue(1);
    mockRedis.del = jest.fn().mockResolvedValue(1);
    mockRedis.srem = jest.fn().mockResolvedValue(1);
  });

  test('should store state in Redis with TTL', async () => {
    const agentId = 'test-agent';
    
    await request(app)
      .post('/api/v1/agent/state')
      .send({ agentId, status: 'pending', ttl: 3600 });

    expect(mockRedis.setex).toHaveBeenCalledWith(
      `agent:state:${agentId}`,
      3600,
      expect.any(String)
    );
  });

  test('should retrieve state from Redis', async () => {
    const agentId = 'test-agent';
    const stateData = {
      agentId,
      status: 'running',
      progress: 50
    };
    
    mockRedis.get.mockResolvedValue(JSON.stringify(stateData));
    mockRedis.ttl.mockResolvedValue(3600);

    const response = await request(app)
      .get(`/api/v1/agent/state/${agentId}`);

    expect(response.status).toBe(200);
    expect(response.body.state).toEqual(stateData);
    expect(mockRedis.get).toHaveBeenCalledWith(`agent:state:${agentId}`);
  });
});
```

### Testing Redis Pipeline Operations

```javascript
test('should use Redis pipeline for batch operations', async () => {
  const mockPipeline = {
    get: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([
      [null, JSON.stringify({ agentId: 'agent1', status: 'running' })],
      [null, JSON.stringify({ agentId: 'agent2', status: 'pending' })]
    ])
  };
  
  mockRedis.pipeline = jest.fn().mockReturnValue(mockPipeline);
  mockRedis.smembers = jest.fn().mockResolvedValue(['agent1', 'agent2']);

  const response = await request(app)
    .get('/api/v1/agent/states')
    .query({ limit: 10 });

  expect(response.status).toBe(200);
  expect(mockRedis.pipeline).toHaveBeenCalled();
  expect(mockPipeline.exec).toHaveBeenCalled();
});
```

---

## Testing GitHub Actions Locally

### Using Act

**Install Act:**
```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows
choco install act-cli
```

**Run Workflows Locally:**
```bash
# List available workflows
act -l

# Run all workflows
act

# Run specific workflow
act -j build

# Run on specific event
act push
act pull_request

# Use secrets file
act --secret-file .secrets
```

### Mock GitHub Context

Create `.actrc`:
```
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
--secret-file .secrets
```

Create `.secrets`:
```bash
ANTHROPIC_API_KEY=test-key-123
GITHUB_TOKEN=github_pat_test
```

### Testing Workflow Steps

**Example Workflow Test:**
```yaml
# .github/workflows/test.yml
name: Test Workflow
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

**Run Locally:**
```bash
act push -j test --verbose
```

### Testing Matrix Builds

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
```

```bash
# Test all matrix combinations
act -j test --matrix node-version:16
act -j test --matrix node-version:18
act -j test --matrix node-version:20
```

---

## CI/CD Test Automation

### GitHub Actions Integration

**Automatic Test Execution:**
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

**Install Husky:**
```bash
npm install --save-dev husky
npx husky install
```

**Add pre-commit hook:**
```bash
npx husky add .husky/pre-commit "npm test"
```

**.husky/pre-commit:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before commit
npm test

# Check coverage
npm run test:coverage

# Fail commit if coverage below threshold
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "❌ Coverage $COVERAGE% is below 80%"
  exit 1
fi
```

### Pull Request Checks

**Required Status Checks:**
- ✅ All tests pass
- ✅ Coverage ≥ 80%
- ✅ No linting errors
- ✅ Build succeeds

**Branch Protection Rules:**
```yaml
# .github/branch-protection.yml
required_status_checks:
  strict: true
  contexts:
    - test
    - coverage-check
    - lint
```

---

## Best Practices

### 1. Test Independence

✅ **Good:**
```javascript
describe('Independent tests', () => {
  beforeEach(async () => {
    // Fresh setup for each test
    await cleanDatabase();
    testData = createTestData();
  });

  test('test 1', () => {
    // Uses fresh testData
  });

  test('test 2', () => {
    // Uses fresh testData, independent of test 1
  });
});
```

❌ **Bad:**
```javascript
describe('Dependent tests', () => {
  let sharedState;

  test('test 1', () => {
    sharedState = { modified: true };
  });

  test('test 2', () => {
    // Depends on test 1 running first
    expect(sharedState.modified).toBe(true);
  });
});
```

### 2. Clear Test Names

✅ **Good:**
```javascript
test('should return 400 when agentId is missing', () => {});
test('should create agent state with default TTL of 86400 seconds', () => {});
test('should reject agent IDs longer than 256 characters', () => {});
```

❌ **Bad:**
```javascript
test('test 1', () => {});
test('works', () => {});
test('handles errors', () => {});
```

### 3. Comprehensive Edge Cases

```javascript
describe('Edge cases', () => {
  test('should handle empty string', () => {});
  test('should handle null value', () => {});
  test('should handle undefined value', () => {});
  test('should handle maximum value', () => {});
  test('should handle minimum value', () => {});
  test('should handle special characters', () => {});
  test('should handle unicode characters', () => {});
  test('should handle very large inputs', () => {});
});
```

### 4. Async/Await Usage

✅ **Good:**
```javascript
test('should handle async operations', async () => {
  const response = await request(app).get('/api/endpoint');
  expect(response.status).toBe(200);
});
```

❌ **Bad:**
```javascript
test('should handle async operations', () => {
  request(app).get('/api/endpoint').then(response => {
    expect(response.status).toBe(200);
  });
  // Test finishes before assertion runs!
});
```

### 5. Mock Cleanup

```javascript
describe('Tests with mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();  // Clear call history
  });

  afterEach(() => {
    jest.restoreAllMocks();  // Restore original implementations
  });

  afterAll(() => {
    jest.resetModules();  // Reset module cache
  });
});
```

### 6. Test Data Factories

```javascript
// test-helpers.js
function createTestAgent(overrides = {}) {
  return {
    agentId: 'test-agent-123',
    status: 'pending',
    progress: 0,
    metadata: {},
    retryCount: 0,
    maxRetries: 3,
    ...overrides
  };
}

// In tests
test('should handle running agent', () => {
  const agent = createTestAgent({ status: 'running', progress: 50 });
  // Use agent...
});
```

### 7. Error Message Validation

```javascript
test('should provide helpful error message', () => {
  expect(() => validatePath('/etc/passwd'))
    .toThrow('Path traversal not allowed');
    
  // More specific
  expect(() => validatePath('/etc/passwd')).toThrow(
    expect.objectContaining({
      message: expect.stringContaining('Path traversal'),
      code: 'INVALID_PATH'
    })
  );
});
```

---

## Anti-Patterns

### ❌ 1. Testing Implementation Details

**Bad:**
```javascript
test('should call internal method', () => {
  const spy = jest.spyOn(service, '_internalMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});
```

**Good:**
```javascript
test('should return expected result', () => {
  const result = service.publicMethod();
  expect(result).toBe(expectedValue);
});
```

### ❌ 2. Not Testing Error Cases

**Bad:**
```javascript
describe('User registration', () => {
  test('should register valid user', () => {
    // Only happy path tested
  });
});
```

**Good:**
```javascript
describe('User registration', () => {
  test('should register valid user', () => {});
  test('should reject invalid email', () => {});
  test('should reject duplicate username', () => {});
  test('should handle database errors', () => {});
});
```

### ❌ 3. Overly Complex Tests

**Bad:**
```javascript
test('should do everything', async () => {
  // 50 lines of setup
  // Multiple API calls
  // Complex assertions
  // Testing multiple features
});
```

**Good:**
```javascript
test('should create user', async () => {
  const user = await createUser(testData);
  expect(user.id).toBeDefined();
});

test('should send welcome email', async () => {
  await createUser(testData);
  expect(emailService.send).toHaveBeenCalled();
});
```

### ❌ 4. Ignoring Async Issues

**Bad:**
```javascript
test('should save data', () => {
  saveData(data);  // Async but not awaited
  expect(database.has(data)).toBe(true);  // Runs before save completes
});
```

**Good:**
```javascript
test('should save data', async () => {
  await saveData(data);
  expect(database.has(data)).toBe(true);
});
```

### ❌ 5. Not Cleaning Up Resources

**Bad:**
```javascript
describe('File operations', () => {
  test('should create file', async () => {
    await fs.writeFile('test.txt', 'content');
    // File left behind!
  });
});
```

**Good:**
```javascript
describe('File operations', () => {
  afterEach(async () => {
    await fs.unlink('test.txt').catch(() => {});
  });

  test('should create file', async () => {
    await fs.writeFile('test.txt', 'content');
    // Cleaned up in afterEach
  });
});
```

### ❌ 6. Hard-coded Waits

**Bad:**
```javascript
test('should process async task', async () => {
  startTask();
  await new Promise(resolve => setTimeout(resolve, 5000));  // Random wait
  expect(taskCompleted).toBe(true);
});
```

**Good:**
```javascript
test('should process async task', async () => {
  const result = await startTask();
  expect(result.status).toBe('completed');
});
```

### ❌ 7. Console.log Debugging

**Bad:**
```javascript
test('should work', () => {
  console.log('Debug:', value);
  console.log('Response:', response);
  expect(true).toBe(true);
});
```

**Good:**
```javascript
test('should work', () => {
  // Use debugger or proper logging
  // Or use jest --verbose for output
  expect(response.status).toBe(200);
});
```

---

## Quick Reference

### Common Jest Matchers

```javascript
// Equality
expect(value).toBe(expected);              // Strict equality (===)
expect(value).toEqual(expected);           // Deep equality
expect(value).toStrictEqual(expected);     // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(number);
expect(value).toBeGreaterThanOrEqual(number);
expect(value).toBeLessThan(number);
expect(value).toBeCloseTo(number, numDigits);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain(substring);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(number);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject(partialObject);

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(number);
```

### Test Execution

```bash
# Run specific test file
npm test -- tests/example.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Redis"

# Run only failed tests
npm test -- --onlyFailures

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u
```

---

## Summary Checklist

Before committing code, ensure:

- [ ] All new functions have tests in `capabilities.yml`
- [ ] Unit tests written for business logic
- [ ] Integration tests written for API endpoints
- [ ] Edge cases covered (empty, null, max values)
- [ ] Error cases tested (validation, system errors)
- [ ] Mocks properly configured and cleaned up
- [ ] Async operations properly awaited
- [ ] Tests are independent and isolated
- [ ] Coverage ≥ 80% (`npm run test:coverage`)
- [ ] All tests pass (`npm test`)
- [ ] Test names are descriptive
- [ ] No console.log debugging left behind

---

## Resources

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Supertest Documentation:** https://github.com/visionmedia/supertest
- **Testing Best Practices:** https://testingjavascript.com/
- **Project Files:**
  - `package.json` - Test scripts and Jest config
  - `tests/example.test.js` - Unit test examples
  - `tests/integration.test.js` - Integration test examples
  - `capabilities.yml` - Feature registry
  - `PRODUCTION_CHECKLIST.md` - Pre-merge requirements

---

**Questions?** Check existing tests in `/tests/` for examples or ask in code review.
