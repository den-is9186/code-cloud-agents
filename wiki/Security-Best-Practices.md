# Security Best Practices - Code Cloud Agents

> **Critical**: This document outlines mandatory security practices for the Code Cloud Agents project.  
> All team members must follow these guidelines before deploying code to production.

**Last Updated:** 2026-01-25  
**Status:** Active Policy

---

## Table of Contents

1. [Secrets Management](#secrets-management)
2. [API Key Security](#api-key-security)
3. [Path Traversal Protection](#path-traversal-protection)
4. [Input Validation](#input-validation)
5. [Rate Limiting](#rate-limiting)
6. [CORS Configuration](#cors-configuration)
7. [Error Handling](#error-handling)
8. [Dependencies Security](#dependencies-security)
9. [Redis Security](#redis-security)
10. [GitHub Actions Security](#github-actions-security)
11. [Commit Security](#commit-security)
12. [File Operation Security](#file-operation-security)
13. [Common Vulnerabilities](#common-vulnerabilities)
14. [Security Checklist](#security-checklist)

---

## 1. Secrets Management

### GitHub Secrets

**NEVER** commit secrets directly to the repository. Always use GitHub Secrets for sensitive data.

#### Setting Up GitHub Secrets

```bash
# Via GitHub UI:
# Repository → Settings → Secrets and variables → Actions → New repository secret

# Common secrets to configure:
# - REDIS_HOST
# - REDIS_PORT
# - REDIS_PASSWORD
# - API_KEYS
# - GITHUB_TOKEN (automatically provided)
```

#### Accessing Secrets in Workflows

```yaml
# .github/workflows/example.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Use secrets
        env:
          REDIS_HOST: ${{ secrets.REDIS_HOST }}
          REDIS_PORT: ${{ secrets.REDIS_PORT }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          # Your deployment commands
```

### .env Files

**CRITICAL**: `.env` files must NEVER be committed to version control.

#### .env.example Template

```bash
# .env.example - Safe to commit (no real values)
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
NODE_ENV=development
```

#### .env File (Local Development)

```bash
# .env - NEVER commit this file!
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=actual_password_here
NODE_ENV=development
```

#### Verify .gitignore

```bash
# .gitignore must contain:
.env
.env.local
.env.*.local
*.key
*.pem
```

#### Verification Script

```bash
#!/bin/bash
# Check if .env is accidentally committed
if git ls-files --error-unmatch .env 2>/dev/null; then
  echo "❌ ERROR: .env file is tracked by Git!"
  exit 1
else
  echo "✅ .env file is not tracked"
fi
```

### Secret Rotation

If a secret is leaked:

1. **Immediately** rotate the secret
2. Update GitHub Secrets with new value
3. Update production environment
4. Review commit history for the leak
5. Consider using `git filter-branch` or `BFG Repo-Cleaner` to remove from history

---

## 2. API Key Security

### Storage

```javascript
// ❌ WRONG - API key in code
const apiKey = 'sk_live_abc123def456';

// ✅ CORRECT - API key from environment
const apiKey = process.env.API_KEY;

if (!apiKey) {
  throw new Error('API_KEY environment variable is required');
}
```

### Validation

```javascript
// Validate API key format
function validateApiKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  
  if (key.length < 32) {
    throw new Error('API key must be at least 32 characters');
  }
  
  if (!/^[a-zA-Z0-9_\-]+$/.test(key)) {
    throw new Error('API key contains invalid characters');
  }
  
  return true;
}
```

### API Key in Headers

```javascript
// API Key authentication middleware
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'API key is required'
      }
    });
  }
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key'
      }
    });
  }
  
  next();
}

// Apply to protected routes
app.use('/api/v1', authenticateApiKey);
```

### Rate Limiting per API Key

```javascript
const rateLimit = require('express-rate-limit');

const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per API key
  keyGenerator: (req) => {
    return req.headers['authorization'] || req.ip;
  },
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

app.use('/api/v1', apiKeyLimiter);
```

---

## 3. Path Traversal Protection

### Implementation

Path traversal attacks attempt to access files outside the allowed directory using sequences like `../`.

#### Secure Path Validation

```javascript
const path = require('path');

const PROJECT_ROOT = process.cwd();
const ALLOWED_DIRS = ['src', 'tests', 'CONTRACTS', 'ops'];

function validatePath(requestedPath) {
  if (!requestedPath) {
    throw new Error('Path is required');
  }

  // Normalize the path and remove ../ sequences
  const normalizedPath = path.normalize(requestedPath)
    .replace(/^(\.\.(\/|\\|$))+/, '');
  
  // Resolve to absolute path
  const fullPath = path.resolve(PROJECT_ROOT, normalizedPath);

  // Ensure the path is within project root
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new Error('Path traversal not allowed');
  }

  // Check if path is in allowed directories
  const relativePath = path.relative(PROJECT_ROOT, fullPath);
  const topLevelDir = relativePath.split(path.sep)[0];
  
  if (topLevelDir && !ALLOWED_DIRS.includes(topLevelDir) && topLevelDir !== '.') {
    throw new Error(`Access to directory '${topLevelDir}' not allowed`);
  }

  return fullPath;
}
```

#### Usage in Routes

```javascript
app.get('/api/v1/files/content', async (req, res) => {
  try {
    const requestedPath = req.query.path;
    
    // Validate path before any file operations
    const fullPath = validatePath(requestedPath);
    
    // Proceed with file read
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content });
    
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: error.message
      }
    });
  }
});
```

### Attack Examples to Block

```javascript
// ❌ These should be blocked:
'/etc/passwd'                    // Absolute path
'../../etc/passwd'               // Parent directory traversal
'../../../.env'                  // Access to .env file
'src/../../.git/config'          // Access to .git directory
'./node_modules/../.env'         // Hidden traversal
```

### Test Cases

```javascript
const assert = require('assert');

// Test path traversal protection
describe('Path Validation Security', () => {
  it('should block absolute paths', () => {
    assert.throws(() => validatePath('/etc/passwd'));
  });
  
  it('should block parent directory traversal', () => {
    assert.throws(() => validatePath('../../etc/passwd'));
  });
  
  it('should allow valid paths', () => {
    const result = validatePath('src/index.js');
    assert(result.includes('src/index.js'));
  });
  
  it('should block access to disallowed directories', () => {
    assert.throws(() => validatePath('.git/config'));
    assert.throws(() => validatePath('node_modules/package.json'));
  });
});
```

---

## 4. Input Validation

### Agent ID Validation

```javascript
function validateAgentId(agentId) {
  // Check type and presence
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('Agent ID must be a non-empty string');
  }
  
  // Check length
  if (agentId.length > 256) {
    throw new Error('Agent ID must be 256 characters or less');
  }
  
  // Check format (alphanumeric, underscore, hyphen, colon, period only)
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(agentId)) {
    throw new Error('Agent ID contains invalid characters');
  }
  
  return agentId;
}
```

### Status Validation

```javascript
const VALID_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  return status;
}
```

### Progress Validation

```javascript
function validateProgress(progress) {
  if (progress !== undefined) {
    if (typeof progress !== 'number') {
      throw new Error('Progress must be a number');
    }
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
  }
  return progress;
}
```

### Request Body Validation Middleware

```javascript
const { body, validationResult } = require('express-validator');

// Validation rules for agent state creation
const agentStateValidation = [
  body('agentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('agentId is required')
    .isLength({ max: 256 })
    .withMessage('agentId must be 256 characters or less')
    .matches(/^[a-zA-Z0-9_\-:.]+$/)
    .withMessage('agentId contains invalid characters'),
  
  body('status')
    .optional()
    .isIn(['pending', 'running', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status value'),
  
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('progress must be a number between 0 and 100'),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

// Apply to routes
app.post('/api/v1/agent/state', 
  agentStateValidation, 
  handleValidationErrors, 
  (req, res) => {
    // Handle request
  }
);
```

### File Size Validation

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function validateFileSize(filePath) {
  const stats = await fs.stat(filePath);
  
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${stats.size} bytes) exceeds 10MB limit`);
  }
  
  return stats.size;
}
```

---

## 5. Rate Limiting

### Global Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

app.use(globalLimiter);
```

### Endpoint-Specific Rate Limiting

```javascript
// Stricter limits for file operations
const fileOperationsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many file operations, please slow down'
    }
  }
});

// Apply to file operation endpoints
app.use('/api/v1/files', fileOperationsLimiter);
```

### Redis-Based Rate Limiting (Distributed)

```javascript
const RedisStore = require('rate-limit-redis');

const redisLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:', // Rate limit key prefix
  }),
  windowMs: 60 * 1000,
  max: 100,
});

app.use(redisLimiter);
```

### Rate Limit Headers

Clients receive these headers:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 85
RateLimit-Reset: 1642584000
```

---

## 6. CORS Configuration

### Basic CORS Setup

```javascript
const cors = require('cors');

// Development - Allow all origins
if (process.env.NODE_ENV === 'development') {
  app.use(cors());
}

// Production - Restrict origins
if (process.env.NODE_ENV === 'production') {
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'https://yourdomain.com',
        'https://app.yourdomain.com',
        'https://api.yourdomain.com'
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600 // 10 minutes
  };
  
  app.use(cors(corsOptions));
}
```

### Environment-Based CORS

```javascript
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
```

### Manual CORS Headers

```javascript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

---

## 7. Error Handling

### Production Error Handling

**CRITICAL**: Never expose stack traces or internal details in production.

```javascript
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Log full error internally
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry)
    // logger.error(err);
  }
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Production: Hide internal errors
  if (process.env.NODE_ENV === 'production') {
    res.status(statusCode).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: statusCode === 500 
          ? 'An internal error occurred' 
          : err.message
      }
    });
  } else {
    // Development: Show full error
    res.status(statusCode).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
        stack: err.stack
      }
    });
  }
});
```

### Structured Error Responses

```javascript
class AppError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Usage
throw new AppError('File not found', 'FILE_NOT_FOUND', 404);
```

### Async Error Handling

```javascript
// Wrapper for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/api/v1/files', asyncHandler(async (req, res) => {
  const files = await getFiles();
  res.json(files);
}));
```

### Standardized Error Codes

```javascript
const ERROR_CODES = {
  // Client errors (4xx)
  INVALID_INPUT: { code: 'INVALID_INPUT', status: 400 },
  INVALID_PATH: { code: 'INVALID_PATH', status: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  FILE_NOT_FOUND: { code: 'FILE_NOT_FOUND', status: 404 },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_LIMIT_EXCEEDED', status: 429 },
  
  // Server errors (5xx)
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 },
};
```

### Logging Best Practices

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Don't log to console in production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Usage
logger.info('Server started', { port: PORT });
logger.error('Database error', { error: err.message, stack: err.stack });
```

---

## 8. Dependencies Security

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# View detailed vulnerability report
npm audit --json
```

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
```

### Dependency Review in CI

```yaml
# .github/workflows/dependency-review.yml
name: 'Dependency Review'
on: [pull_request]

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
      
      - name: Dependency Review
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: moderate
```

### Lock File Integrity

```bash
# Always commit package-lock.json
git add package-lock.json

# Verify lock file integrity
npm ci # Use in CI instead of npm install
```

### Monitoring Known Vulnerabilities

```bash
# Use Snyk for continuous monitoring
npm install -g snyk
snyk auth
snyk test
snyk monitor
```

---

## 9. Redis Security

### Connection Security

```javascript
const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD, // Always use password in production
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
};

const redis = new Redis(redisConfig);
```

### Error Handling

```javascript
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Alert monitoring system
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('close', () => {
  console.warn('Redis connection closed');
});
```

### Key Expiration (TTL)

```javascript
const DEFAULT_TTL = 86400; // 24 hours

// Always set TTL to prevent memory leaks
await redis.setex(key, DEFAULT_TTL, JSON.stringify(data));

// Or use EXPIRE
await redis.set(key, value);
await redis.expire(key, DEFAULT_TTL);
```

### Key Naming Convention

```javascript
// Use prefixes to organize keys
const PREFIXES = {
  AGENT_STATE: 'agent:state:',
  SESSION: 'session:',
  RATE_LIMIT: 'rl:',
  CACHE: 'cache:',
};

const key = `${PREFIXES.AGENT_STATE}${agentId}`;
```

### Redis ACL (Access Control Lists)

```bash
# Create a limited user for the application
redis-cli ACL SETUSER appuser on >password ~agent:* ~session:* +get +set +del +expire

# Use this user in application
REDIS_USER=appuser
REDIS_PASSWORD=password
```

### Connection Pooling

```javascript
// Redis client is already pooled, but limit connections
const redis = new Redis({
  // ... other config
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false, // Don't queue commands when disconnected
  lazyConnect: true, // Don't connect immediately
});

// Connect explicitly
await redis.connect();
```

---

## 10. GitHub Actions Security

### Secure Workflow Configuration

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    # Use specific permissions (principle of least privilege)
    permissions:
      contents: read
      deployments: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci # Use npm ci instead of npm install
        
      - name: Run tests
        run: npm test
        
      - name: Deploy
        env:
          # Use secrets for sensitive data
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          # Deployment script
```

### Pinned Actions Versions

```yaml
# ✅ GOOD - Pin to specific SHA
- uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab # v4.1.1

# ❌ BAD - Using branch or tag (can be changed)
- uses: actions/checkout@main
- uses: actions/checkout@v4
```

### Prevent Secret Exposure

```yaml
# Don't echo secrets
- name: Bad example
  run: echo "Secret is ${{ secrets.API_KEY }}" # ❌ NEVER DO THIS

# Mask secrets in logs
- name: Good example
  run: |
    echo "::add-mask::${{ secrets.API_KEY }}"
    # Use secret safely
```

### Workflow Security Best Practices

```yaml
name: Secure Workflow

on:
  pull_request:
    # Don't run on PRs from forks with secrets
    types: [opened, synchronize]

jobs:
  test:
    # Only run on internal PRs
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          # Prevent script injection
          persist-credentials: false
          
      - name: Run tests
        run: npm test
```

### Code Scanning

```yaml
name: CodeQL Analysis

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

---

## 11. Commit Security

### Pre-Commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for secrets
if git diff --cached --name-only | grep -E '\.(env|key|pem)$'; then
  echo "❌ Error: Attempting to commit sensitive files"
  exit 1
fi

# Check for API keys or secrets in code
if git diff --cached -p | grep -iE '(api[_-]?key|secret|password|token).*=.*["\'][a-zA-Z0-9]{20,}'; then
  echo "❌ Error: Potential secret detected in commit"
  exit 1
fi

# Run tests
npm test
```

### Git Secrets Tool

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
apt-get install git-secrets  # Linux

# Setup
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'password\s*=\s*.+'
git secrets --add 'api[_-]?key\s*=\s*.+'
```

### Commit Message Convention

```bash
# Format: type(scope): message
feat(api): add rate limiting to file operations
fix(security): prevent path traversal in file API
docs(wiki): update security best practices
test(api): add tests for input validation
refactor(redis): improve connection handling
chore(deps): update dependencies
```

### Signed Commits

```bash
# Generate GPG key
gpg --gen-key

# Configure Git to sign commits
git config --global user.signingkey YOUR_GPG_KEY_ID
git config --global commit.gpgsign true

# Verify signature
git log --show-signature
```

---

## 12. File Operation Security

### Secure File Reading

```javascript
const fs = require('fs').promises;
const path = require('path');

async function secureReadFile(requestedPath) {
  // 1. Validate path
  const fullPath = validatePath(requestedPath);
  
  // 2. Check if file exists and is a file (not directory)
  const stats = await fs.stat(fullPath);
  if (!stats.isFile()) {
    throw new Error('Path must be a file');
  }
  
  // 3. Check file size limit
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (stats.size > MAX_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }
  
  // 4. Read file
  const content = await fs.readFile(fullPath, 'utf8');
  
  return {
    path: requestedPath,
    content,
    size: stats.size,
    modified: stats.mtime
  };
}
```

### Secure File Writing

```javascript
async function secureWriteFile(requestedPath, content, options = {}) {
  // 1. Validate path
  const fullPath = validatePath(requestedPath);
  
  // 2. Check content size
  const contentSize = Buffer.byteLength(content, 'utf8');
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (contentSize > MAX_SIZE) {
    throw new Error('Content size exceeds 10MB limit');
  }
  
  // 3. Check if parent directory exists
  const dir = path.dirname(fullPath);
  if (options.createDirs) {
    await fs.mkdir(dir, { recursive: true });
  } else {
    await fs.access(dir); // Throws if doesn't exist
  }
  
  // 4. Write file atomically
  const tempPath = `${fullPath}.tmp`;
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, fullPath);
  
  return { path: requestedPath, size: contentSize };
}
```

### Secure File Deletion

```javascript
async function secureDeleteFile(requestedPath) {
  // 1. Validate path
  const fullPath = validatePath(requestedPath);
  
  // 2. Check if file exists and is a file
  const stats = await fs.stat(fullPath);
  if (!stats.isFile()) {
    throw new Error('Path must be a file');
  }
  
  // 3. Prevent deletion of critical files
  const PROTECTED_FILES = [
    'package.json',
    'package-lock.json',
    '.env',
    '.gitignore'
  ];
  
  const fileName = path.basename(fullPath);
  if (PROTECTED_FILES.includes(fileName)) {
    throw new Error(`Cannot delete protected file: ${fileName}`);
  }
  
  // 4. Delete file
  await fs.unlink(fullPath);
  
  return { path: requestedPath, deleted: true };
}
```

### File Upload Security

```javascript
const multer = require('multer');
const crypto = require('crypto');

// Configure multer for secure uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/uploads'); // Use dedicated upload directory
  },
  filename: (req, file, cb) => {
    // Generate random filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${randomName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedMimes = [
      'text/plain',
      'application/json',
      'application/javascript'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/api/v1/upload', upload.single('file'), (req, res) => {
  // Process uploaded file
  res.json({ file: req.file });
});
```

---

## 13. Common Vulnerabilities

### SQL Injection (if using SQL)

```javascript
// ❌ WRONG - SQL Injection vulnerability
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// ✅ CORRECT - Use parameterized queries
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

### NoSQL Injection (MongoDB)

```javascript
// ❌ WRONG - NoSQL injection vulnerability
const username = req.body.username;
User.findOne({ username: username });

// If username = { $gt: "" }, it matches all users

// ✅ CORRECT - Validate and sanitize input
const username = req.body.username;
if (typeof username !== 'string') {
  throw new Error('Invalid username');
}
User.findOne({ username: username });
```

### Cross-Site Scripting (XSS)

```javascript
const DOMPurify = require('isomorphic-dompurify');

// Sanitize HTML input
function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href']
  });
}

app.post('/api/v1/content', (req, res) => {
  const content = sanitizeHtml(req.body.content);
  // Save sanitized content
});
```

### Command Injection

```javascript
const { execFile } = require('child_process');

// ❌ WRONG - Command injection vulnerability
const filename = req.query.file;
exec(`cat ${filename}`, (error, stdout) => {
  res.send(stdout);
});

// ✅ CORRECT - Use execFile with arguments array
const filename = req.query.file;
execFile('cat', [filename], (error, stdout) => {
  res.send(stdout);
});
```

### Cross-Site Request Forgery (CSRF)

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());

// CSRF protection for state-changing operations
const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/api/v1/data', csrfProtection, (req, res) => {
  // Process form
});
```

### Server-Side Request Forgery (SSRF)

```javascript
const axios = require('axios');
const { URL } = require('url');

async function safeFetch(urlString) {
  const url = new URL(urlString);
  
  // Block private IP ranges
  const BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.',
    '172.16.',
    '192.168.'
  ];
  
  if (BLOCKED_HOSTS.some(blocked => url.hostname.startsWith(blocked))) {
    throw new Error('Access to private networks is not allowed');
  }
  
  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid protocol');
  }
  
  const response = await axios.get(urlString, {
    timeout: 5000,
    maxRedirects: 0
  });
  
  return response.data;
}
```

### Regex Denial of Service (ReDoS)

```javascript
// ❌ WRONG - Catastrophic backtracking
const emailRegex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;

// ✅ CORRECT - Use non-greedy quantifiers or limit input length
function validateEmail(email) {
  if (email.length > 254) return false; // RFC 5321
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
}
```

### Prototype Pollution

```javascript
// ❌ WRONG - Vulnerable to prototype pollution
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key];
  }
  return target;
}

// Exploit: merge({}, JSON.parse('{"__proto__": {"isAdmin": true}}'))

// ✅ CORRECT - Use Object.hasOwnProperty
function safeMerge(target, source) {
  for (let key in source) {
    if (source.hasOwnProperty(key) && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      target[key] = source[key];
    }
  }
  return target;
}
```

---

## 14. Security Checklist

### Pre-Deployment Checklist

Before deploying to production, verify ALL items:

#### ✅ Secrets Management
- [ ] No secrets or API keys in code
- [ ] All secrets stored in GitHub Secrets
- [ ] `.env` files in `.gitignore`
- [ ] `.env.example` documented
- [ ] Secrets rotated if leaked

#### ✅ Authentication & Authorization
- [ ] API key authentication implemented (if needed)
- [ ] Authorization checks for all protected endpoints
- [ ] Token validation working correctly
- [ ] Session management secure

#### ✅ Input Validation
- [ ] All user inputs validated
- [ ] Path traversal protection active
- [ ] File size limits enforced
- [ ] SQL/NoSQL injection prevention
- [ ] XSS protection implemented

#### ✅ Rate Limiting
- [ ] Global rate limiting configured
- [ ] Per-endpoint rate limiting for sensitive operations
- [ ] Rate limit headers returned
- [ ] Redis-based distributed rate limiting (if multi-instance)

#### ✅ CORS Configuration
- [ ] CORS configured for production domains
- [ ] No wildcard (*) origins in production
- [ ] Credentials handling configured
- [ ] Preflight requests handled

#### ✅ Error Handling
- [ ] No stack traces in production responses
- [ ] Structured error logging implemented
- [ ] Error tracking service configured (optional)
- [ ] 4xx/5xx errors return JSON
- [ ] Timeout handling implemented

#### ✅ File Operations
- [ ] Path validation on all file operations
- [ ] File size limits enforced (10MB)
- [ ] Allowed directories whitelist configured
- [ ] Protected files cannot be deleted
- [ ] Atomic write operations

#### ✅ Dependencies
- [ ] `npm audit` passes with no critical vulnerabilities
- [ ] Dependencies up to date
- [ ] Dependabot configured
- [ ] Lock files committed
- [ ] CI runs `npm ci`

#### ✅ Redis Security
- [ ] Redis password configured
- [ ] TLS enabled in production
- [ ] Connection timeout set
- [ ] Error handling implemented
- [ ] TTL set on all keys

#### ✅ GitHub Actions
- [ ] Actions pinned to specific SHAs
- [ ] Minimal permissions configured
- [ ] No secrets in logs
- [ ] Code scanning enabled
- [ ] Dependency review enabled

#### ✅ Monitoring & Logging
- [ ] Health check endpoint implemented
- [ ] Structured logging configured
- [ ] Error logs collected
- [ ] Performance monitoring (optional)
- [ ] Uptime monitoring (optional)

#### ✅ Network Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Request timeout configured
- [ ] Connection limits set

#### ✅ Documentation
- [ ] Security practices documented
- [ ] API endpoints documented
- [ ] Error codes documented
- [ ] Deployment process documented

---

## Security Headers

Add these security headers to all responses:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true,
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

## Incident Response

If a security incident occurs:

1. **Immediately**: Rotate all affected credentials
2. **Assess**: Determine scope of the breach
3. **Contain**: Block malicious traffic/users
4. **Document**: Record what happened
5. **Fix**: Patch the vulnerability
6. **Review**: Update security practices
7. **Notify**: Inform affected parties if required

---

## Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides)
- [Redis Security](https://redis.io/topics/security)

---

**Last Updated:** 2026-01-25  
**Next Review:** 2026-04-25

---

_This document must be reviewed and updated quarterly or after any security incident._
