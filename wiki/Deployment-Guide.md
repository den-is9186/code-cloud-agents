# Deployment Guide

> **Complete deployment guide for Code Cloud Agents**  
> Based on Production Checklist and current project architecture

**Last Updated:** 2026-01-25  
**Version:** 1.0.0

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Platforms](#deployment-platforms)
   - [Vercel](#vercel-deployment)
   - [Render](#render-deployment)
   - [Fly.io](#flyio-deployment)
   - [Docker](#docker-deployment)
4. [Database Setup](#database-setup)
5. [CI/CD Integration](#cicd-integration)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
10. [Best Practices](#best-practices)

---

## Pre-Deployment Checklist

Before deploying to production, ensure ALL items are checked:

### ✅ Security

```bash
# Verify no secrets in code
grep -r "sk-ant-api" src/ tests/
grep -r "ghp_" src/ tests/

# Check .gitignore includes .env
grep ".env" .gitignore

# Verify dependencies have no vulnerabilities
npm audit
npm audit fix
```

- [ ] Rate Limiting configured
- [ ] CORS properly set for production origins
- [ ] Input validation on all endpoints
- [ ] All secrets in GitHub Secrets (not in code)
- [ ] `.env` in `.gitignore`
- [ ] No API keys hardcoded
- [ ] Dependencies updated (no known vulnerabilities)

### ✅ Testing

```bash
# Run full test suite
npm run test

# Check coverage
npm run test:coverage

# Coverage should be ≥ 80%
```

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Code coverage ≥ 80%
- [ ] Regression tests complete

### ✅ Documentation

- [ ] API contracts up-to-date (`CONTRACTS/api_contract.md`)
- [ ] Data contracts up-to-date (`CONTRACTS/data_contract.md`)
- [ ] README.md current
- [ ] PROJECT_STATE.md reflects latest status
- [ ] `.env.example` complete with all required vars

### ✅ Error Handling & Monitoring

- [ ] Graceful error handling implemented
- [ ] Structured JSON logging configured
- [ ] No stack traces exposed in production
- [ ] Health check endpoint (`/health`) implemented
- [ ] 4xx/5xx errors return JSON responses

### ✅ Build & Deploy

```bash
# Test production build
NODE_ENV=production npm start

# Verify smoke tests pass
curl http://localhost:8080/health
```

- [ ] Production build succeeds
- [ ] Smoke tests pass
- [ ] Rollback plan documented

---

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file (NEVER commit this):

```bash
# ═══════════════════════════════════════════════════════════════
# PRODUCTION ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════

# APP CONFIG
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# ANTHROPIC API
ANTHROPIC_API_KEY=sk-ant-api03-your-production-key

# AIDER CONFIG
AIDER_MODEL=claude-sonnet-4-5-20250929
AIDER_AUTO_COMMITS=true

# GITHUB
GITHUB_TOKEN=ghp_your_production_token

# DATABASE (Redis)
REDIS_URL=redis://username:password@redis-host.com:6379
REDIS_TLS=true
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000

# CORS (comma-separated origins)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# RATE LIMITING
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# MONITORING (optional)
SENTRY_DSN=https://your-sentry-dsn
LOG_DRAIN_URL=https://your-log-service.com
```

### Security Best Practices

```bash
# Generate secure secrets
openssl rand -base64 32

# Rotate secrets regularly
# Update in: GitHub Secrets + Deployment Platform

# Never log sensitive data
# ❌ Bad: console.log('API Key:', process.env.ANTHROPIC_API_KEY)
# ✅ Good: console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY)
```

---

## Deployment Platforms

### Vercel Deployment

**Best for:** Static sites, Next.js apps, serverless functions

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

#### Step 2: Configure Vercel

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Step 3: Set Environment Variables

```bash
# Via CLI
vercel env add ANTHROPIC_API_KEY production
vercel env add REDIS_URL production
vercel env add NODE_ENV production

# Or via Dashboard:
# https://vercel.com/your-project/settings/environment-variables
```

#### Step 4: Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment
vercel ls
vercel logs
```

#### Step 5: Configure Domain

```bash
# Add custom domain
vercel domains add yourdomain.com
vercel alias set your-deployment-url.vercel.app yourdomain.com
```

---

### Render Deployment

**Best for:** Full-stack apps, background workers, databases

#### Step 1: Create `render.yaml`

```yaml
services:
  # Web Service
  - type: web
    name: code-cloud-agents
    env: node
    plan: starter
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
      - key: ANTHROPIC_API_KEY
        sync: false # Set in dashboard
      - key: REDIS_URL
        fromDatabase:
          name: redis
          property: connectionString
    
    # Auto-deploy on push to main
    autoDeploy: true
    branch: main

# Redis Database
databases:
  - name: redis
    plan: starter
    ipAllowList: []
```

#### Step 2: Connect to GitHub

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`

#### Step 3: Set Secrets

```bash
# Via Render Dashboard:
# 1. Go to your service
# 2. Environment tab
# 3. Add:
#    - ANTHROPIC_API_KEY
#    - GITHUB_TOKEN
#    - Any other secrets
```

#### Step 4: Deploy

```bash
# Deployment happens automatically on git push
git push origin main

# Or trigger manually in Dashboard
# Services → Your Service → Manual Deploy
```

#### Step 5: Monitor

```bash
# View logs in Dashboard or via CLI
curl https://api.render.com/v1/services/srv-xxx/logs \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

---

### Fly.io Deployment

**Best for:** Global edge deployment, low-latency apps

#### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Login
fly auth login
```

#### Step 2: Initialize App

```bash
fly launch --no-deploy

# Follow prompts:
# - App name: code-cloud-agents
# - Region: Choose nearest
# - PostgreSQL: No (we use Redis)
# - Redis: Yes (Upstash)
```

This creates `fly.toml`:

```toml
app = "code-cloud-agents"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 250
    soft_limit = 200

[[http_service.checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

#### Step 3: Set Secrets

```bash
# Set secrets
fly secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-key
fly secrets set GITHUB_TOKEN=ghp_your-token
fly secrets set REDIS_URL=redis://...

# List secrets
fly secrets list
```

#### Step 4: Add Redis (Upstash)

```bash
# Create Upstash Redis
fly redis create

# Or link existing Upstash instance
fly secrets set REDIS_URL=redis://username:password@host:port
```

#### Step 5: Deploy

```bash
# Deploy
fly deploy

# Check status
fly status

# View logs
fly logs

# SSH into instance
fly ssh console
```

#### Step 6: Scale

```bash
# Scale instances
fly scale count 2

# Scale VM size
fly scale vm shared-cpu-2x --memory 512

# Set regions
fly regions add ams lhr
```

---

### Docker Deployment

**Best for:** Self-hosted, Kubernetes, any container platform

#### Step 1: Create Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy source
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
```

#### Step 2: Create `.dockerignore`

```
node_modules
npm-debug.log
.env
.env.*
!.env.example
.git
.github
*.md
tests
coverage
.vscode
.idea
```

#### Step 3: Build Image

```bash
# Build
docker build -t code-cloud-agents:latest .

# Test locally
docker run -d \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e ANTHROPIC_API_KEY=your-key \
  -e REDIS_URL=redis://localhost:6379 \
  --name code-cloud-agents \
  code-cloud-agents:latest

# Check logs
docker logs -f code-cloud-agents

# Test health
curl http://localhost:8080/health

# Stop
docker stop code-cloud-agents
docker rm code-cloud-agents
```

#### Step 4: Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.production
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

#### Step 5: Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale app
docker-compose up -d --scale app=3

# Stop
docker-compose down
```

#### Step 6: Push to Registry

```bash
# Docker Hub
docker tag code-cloud-agents:latest yourusername/code-cloud-agents:latest
docker push yourusername/code-cloud-agents:latest

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker tag code-cloud-agents:latest ghcr.io/den-is9186/code-cloud-agents:latest
docker push ghcr.io/den-is9186/code-cloud-agents:latest

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag code-cloud-agents:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/code-cloud-agents:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/code-cloud-agents:latest
```

---

## Database Setup

### Redis Cloud

#### Option 1: Redis Cloud (Managed)

```bash
# 1. Sign up at https://redis.com/try-free/
# 2. Create new database
# 3. Copy connection string

# Connection format:
redis://username:password@redis-12345.cloud.redislabs.com:12345
```

**Configuration:**

```javascript
// src/db/redis.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

module.exports = redis;
```

#### Option 2: Upstash (Serverless)

```bash
# 1. Sign up at https://upstash.com
# 2. Create Redis database
# 3. Choose region closest to your deployment
# 4. Copy REST URL or Redis URL

# REST API (for serverless):
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Or traditional Redis URL:
REDIS_URL=rediss://default:your-password@your-redis.upstash.io:6379
```

**Using Upstash REST API:**

```javascript
// src/db/upstash.js
const fetch = require('node-fetch');

class UpstashRedis {
  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL;
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  async execute(command, ...args) {
    const response = await fetch(`${this.url}/${command}/${args.join('/')}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
    
    const data = await response.json();
    return data.result;
  }

  async get(key) {
    return this.execute('GET', key);
  }

  async set(key, value, ex) {
    if (ex) {
      return this.execute('SET', key, value, 'EX', ex);
    }
    return this.execute('SET', key, value);
  }

  async del(key) {
    return this.execute('DEL', key);
  }
}

module.exports = new UpstashRedis();
```

#### Connection Testing

```bash
# Test Redis connection
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.ping().then(r => console.log('Ping:', r)).catch(e => console.error(e));
"
```

---

## CI/CD Integration

### GitHub Actions (Current Setup)

The project already has GitHub Actions configured. Enhance for production:

#### Create `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Check coverage
        run: npm run test:coverage
      
      - name: Security audit
        run: npm audit --audit-level=high

  deploy-vercel:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-render:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"

  deploy-flyio:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Fly
        uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  notify:
    needs: [deploy-vercel, deploy-render, deploy-flyio]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        if: env.SLACK_WEBHOOK_URL != ''
        with:
          status: ${{ job.status }}
          text: 'Deployment to production: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Required GitHub Secrets

```bash
# Add secrets in: Repository → Settings → Secrets and variables → Actions

# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id

# Render
RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxx

# Fly.io
FLY_API_TOKEN=your-fly-token

# Application
ANTHROPIC_API_KEY=sk-ant-api03-your-key
REDIS_URL=redis://your-redis-url

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
SENTRY_DSN=https://your-sentry-dsn
```

---

## Health Checks & Monitoring

### Health Check Endpoint

Ensure `/health` endpoint is implemented:

```javascript
// src/routes/health.js
const express = require('express');
const router = express.Router();
const redis = require('../db/redis');

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };

  // Check Redis
  try {
    await redis.ping();
    health.services.redis = 'ok';
  } catch (error) {
    health.services.redis = 'error';
    health.status = 'degraded';
  }

  // Check GitHub API (if applicable)
  try {
    // Add your GitHub API check here
    health.services.github = 'ok';
  } catch (error) {
    health.services.github = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

### Uptime Monitoring

#### Option 1: UptimeRobot (Free)

```bash
# 1. Sign up at https://uptimerobot.com
# 2. Add new monitor:
#    - Type: HTTP(s)
#    - URL: https://yourdomain.com/health
#    - Interval: 5 minutes
#    - Expected content: "ok"
```

#### Option 2: Betterstack (Formerly Better Uptime)

```bash
# 1. Sign up at https://betterstack.com
# 2. Create monitor for /health endpoint
# 3. Set up alerts (email, Slack, PagerDuty)
```

#### Option 3: Health Check Script

```bash
#!/bin/bash
# health-check.sh

URL="${1:-http://localhost:8080/health}"
EXPECTED_STATUS="ok"

echo "🔍 Checking health: $URL"

RESPONSE=$(curl -s -w "\n%{http_code}" "$URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ Health check failed: HTTP $HTTP_CODE"
  exit 1
fi

STATUS=$(echo "$BODY" | jq -r '.status')
if [ "$STATUS" != "$EXPECTED_STATUS" ]; then
  echo "❌ Health check failed: Status is '$STATUS', expected '$EXPECTED_STATUS'"
  exit 1
fi

echo "✅ Health check passed"
```

### Logging

#### Structured Logging Example

```javascript
// src/utils/logger.js
class Logger {
  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version
    };

    if (process.env.NODE_ENV === 'production') {
      // JSON format for production
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable for development
      console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, meta);
    }
  }

  info(message, meta) { this.log('info', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  error(message, meta) { this.log('error', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }
}

module.exports = new Logger();
```

---

## Rollback Procedures

### Quick Rollback Guide

#### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>

# Or via dashboard:
# 1. Go to project
# 2. Deployments tab
# 3. Click "..." on previous deployment
# 4. Select "Promote to Production"
```

#### Render

```bash
# Via Dashboard:
# 1. Go to service
# 2. Events tab
# 3. Find successful deployment
# 4. Click "Rollback to this deploy"
```

#### Fly.io

```bash
# List releases
fly releases

# Rollback to previous release
fly releases rollback <version>

# Example: Rollback to v2
fly releases rollback v2
```

#### Docker

```bash
# Tag previous image as latest
docker tag code-cloud-agents:v1.0.0 code-cloud-agents:latest

# Or pull previous image
docker pull yourusername/code-cloud-agents:v1.0.0
docker tag yourusername/code-cloud-agents:v1.0.0 yourusername/code-cloud-agents:latest

# Restart with previous version
docker-compose down
docker-compose up -d
```

#### Git Revert

```bash
# Revert last commit
git revert HEAD
git push origin main

# Revert specific commit
git revert <commit-hash>
git push origin main

# Revert range of commits
git revert HEAD~3..HEAD
git push origin main
```

### Emergency Rollback Procedure

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "================================"

# 1. Identify last good commit
LAST_GOOD_COMMIT=$(git log --oneline --grep="deploy:" | head -n 2 | tail -n 1 | cut -d' ' -f1)
echo "Last good commit: $LAST_GOOD_COMMIT"

# 2. Confirm
read -p "Rollback to $LAST_GOOD_COMMIT? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# 3. Create rollback branch
ROLLBACK_BRANCH="rollback/$(date +%Y%m%d-%H%M%S)"
git checkout -b "$ROLLBACK_BRANCH"

# 4. Revert
git revert --no-commit HEAD..$LAST_GOOD_COMMIT
git commit -m "emergency: rollback to $LAST_GOOD_COMMIT"

# 5. Push
git push origin "$ROLLBACK_BRANCH"

# 6. Notify
echo "✅ Rollback complete"
echo "Branch: $ROLLBACK_BRANCH"
echo "Please create PR and merge to main"
```

---

## Post-Deployment Verification

### Smoke Tests

```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="${1:-https://yourdomain.com}"

echo "🔍 Running smoke tests against $BASE_URL"
echo "=========================================="

# Test 1: Health endpoint
echo -n "1. Health check... "
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $HEALTH"
  exit 1
fi

# Test 2: API endpoints
echo -n "2. API files list... "
FILES=$(curl -s "$BASE_URL/api/v1/files?path=src")
if echo "$FILES" | jq -e '.files | length > 0' > /dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $FILES"
  exit 1
fi

# Test 3: Response time
echo -n "3. Response time... "
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/health")
if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  echo "✅ PASS (${RESPONSE_TIME}s)"
else
  echo "⚠️  SLOW (${RESPONSE_TIME}s)"
fi

# Test 4: HTTPS
echo -n "4. HTTPS redirect... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${BASE_URL#https://}")
if [ "$HTTP_CODE" -eq 301 ] || [ "$HTTP_CODE" -eq 308 ]; then
  echo "✅ PASS"
else
  echo "⚠️  WARNING: HTTP not redirecting (code: $HTTP_CODE)"
fi

# Test 5: CORS
echo -n "5. CORS headers... "
CORS=$(curl -s -H "Origin: https://yourdomain.com" -I "$BASE_URL/health" | grep -i "access-control-allow-origin")
if [ -n "$CORS" ]; then
  echo "✅ PASS"
else
  echo "⚠️  WARNING: CORS headers not found"
fi

echo ""
echo "✅ Smoke tests complete"
```

### Manual Verification Checklist

- [ ] Application loads without errors
- [ ] Health endpoint returns 200 OK
- [ ] All API endpoints respond correctly
- [ ] Database connections working
- [ ] Logs are being generated correctly
- [ ] No errors in production logs
- [ ] Response times are acceptable (< 1s)
- [ ] SSL certificate is valid
- [ ] HTTPS redirect working
- [ ] CORS configured correctly
- [ ] Environment variables loaded
- [ ] Background jobs running (if applicable)

---

## Common Issues & Troubleshooting

### Issue: Application Won't Start

**Symptoms:** Container exits immediately, "Cannot start" errors

**Solutions:**

```bash
# Check logs
docker logs <container-id>
fly logs
vercel logs

# Common causes:
# 1. Missing environment variables
env | grep -E 'ANTHROPIC|REDIS|NODE_ENV'

# 2. Port binding issues
# Ensure PORT env var matches container
export PORT=8080

# 3. Node version mismatch
node --version  # Should be 20.x

# 4. Missing dependencies
npm ci
```

### Issue: Redis Connection Fails

**Symptoms:** "ECONNREFUSED", "ETIMEDOUT", "Redis error"

**Solutions:**

```bash
# 1. Verify Redis URL format
echo $REDIS_URL
# Should be: redis://username:password@host:port

# 2. Check Redis is accessible
redis-cli -u $REDIS_URL ping
# Should return: PONG

# 3. Verify TLS settings
# For Redis Cloud/Upstash, enable TLS:
export REDIS_TLS=true

# 4. Test connection
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});
redis.ping()
  .then(r => console.log('Success:', r))
  .catch(e => console.error('Error:', e));
"
```

### Issue: Health Check Failing

**Symptoms:** Service marked as unhealthy, restarts frequently

**Solutions:**

```bash
# 1. Check health endpoint locally
curl http://localhost:8080/health

# 2. Increase timeout
# In fly.toml:
[[http_service.checks]]
  timeout = "10s"  # Increase from 5s

# 3. Check if service is actually ready
# Add startup delay:
[[http_service.checks]]
  grace_period = "30s"

# 4. Debug health check
# Add logging:
app.get('/health', (req, res) => {
  console.log('Health check called');
  // ... rest of health check
});
```

### Issue: High Memory Usage

**Symptoms:** Out of memory errors, container killed

**Solutions:**

```bash
# 1. Check current memory usage
docker stats <container-id>

# 2. Increase memory limit
# fly.toml:
[[vm]]
  memory_mb = 512  # Increase from 256

# 3. Find memory leaks
# Add heap snapshot
npm install --save-dev heapdump
# In code:
const heapdump = require('heapdump');
heapdump.writeSnapshot();

# 4. Enable garbage collection logs
node --expose-gc --trace-gc src/index.js
```

### Issue: Deployment Timeout

**Symptoms:** "Deployment timeout", "Build took too long"

**Solutions:**

```bash
# 1. Reduce dependency installation time
npm ci --only=production

# 2. Use build cache
# In Dockerfile:
COPY package*.json ./
RUN npm ci
COPY . .  # Copy source after deps

# 3. Increase timeout
# For Vercel, in vercel.json:
{
  "builds": [{
    "src": "src/index.js",
    "use": "@vercel/node",
    "config": {
      "maxLambdaSize": "50mb"
    }
  }]
}

# 4. Split build steps
# Use multi-stage Docker builds
```

### Issue: CORS Errors

**Symptoms:** "No 'Access-Control-Allow-Origin' header"

**Solutions:**

```javascript
// Enable CORS properly
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// For preflight requests
app.options('*', cors());
```

---

## Best Practices

### 1. Environment Management

```bash
# Use different .env files per environment
.env.local           # Local development
.env.staging         # Staging environment
.env.production      # Production (NEVER commit)

# Load with:
NODE_ENV=production node -r dotenv/config src/index.js dotenv_config_path=.env.production
```

### 2. Secrets Management

```bash
# ✅ DO: Use environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;

# ❌ DON'T: Hardcode secrets
const apiKey = 'sk-ant-api03-xxx';

# Use secret management services
# - GitHub Secrets (CI/CD)
# - AWS Secrets Manager
# - HashiCorp Vault
# - Doppler
```

### 3. Deployment Strategy

```bash
# Blue-Green Deployment
# 1. Deploy new version (green)
# 2. Run smoke tests
# 3. Switch traffic to green
# 4. Keep blue for rollback

# Canary Deployment
# 1. Deploy to 10% of instances
# 2. Monitor metrics
# 3. Gradually increase to 100%
# 4. Rollback if errors spike
```

### 4. Monitoring & Alerting

```javascript
// Set up alerts for:
// - Error rate > 1%
// - Response time > 1s
// - Memory usage > 80%
// - CPU usage > 80%
// - Health check failures

// Use services like:
// - Datadog
// - New Relic
// - Grafana + Prometheus
// - Sentry (errors)
```

### 5. Database Migrations

```bash
# Always test migrations in staging first
npm run migrate:staging

# Back up before production migration
# For Redis, use BGSAVE
redis-cli BGSAVE

# Run migrations
npm run migrate:production

# Have rollback plan ready
npm run migrate:rollback
```

### 6. Zero-Downtime Deployments

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connections
  await redis.quit();
  
  // Wait for ongoing requests to complete
  setTimeout(() => {
    process.exit(0);
  }, 10000);
});
```

### 7. Version Tagging

```bash
# Tag releases
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Use semantic versioning
# MAJOR.MINOR.PATCH
# 1.0.0 → 1.0.1 (patch)
# 1.0.1 → 1.1.0 (minor)
# 1.1.0 → 2.0.0 (major/breaking)
```

### 8. Performance Optimization

```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Set cache headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
});

// Use connection pooling
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  lazyConnect: true
});
```

### 9. Security Headers

```javascript
// Add security headers
const helmet = require('helmet');
app.use(helmet());

// Or manually:
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});
```

### 10. Documentation

```bash
# Keep deployment docs updated
# Document in:
# - This Deployment Guide
# - PROJECT_STATE.md (status)
# - CHANGELOG.md (changes)

# After each deployment:
git commit -m "deploy: v1.0.0 to production"
git tag v1.0.0
git push origin main --tags
```

---

## Quick Reference

### Deployment Commands Cheat Sheet

```bash
# Vercel
vercel --prod                    # Deploy to production
vercel logs                      # View logs
vercel env ls                    # List env vars
vercel rollback                  # Rollback deployment

# Render
curl -X POST $RENDER_DEPLOY_HOOK # Trigger deploy
# (Most actions via dashboard)

# Fly.io
fly deploy                       # Deploy
fly logs                         # View logs
fly status                       # Check status
fly scale count 2                # Scale instances
fly releases rollback v2         # Rollback

# Docker
docker build -t app .            # Build image
docker run -p 8080:8080 app      # Run container
docker logs -f <container>       # View logs
docker-compose up -d             # Start with compose
docker-compose down              # Stop all
```

### Health Check URLs

```bash
# After deployment, verify:
curl https://yourdomain.com/health
curl https://yourdomain.com/api/v1/files

# Should return:
# {"status":"ok", ...}
```

---

## Support & Resources

### Documentation Links

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Fly.io Docs](https://fly.io/docs)
- [Docker Docs](https://docs.docker.com)
- [Redis Cloud](https://redis.com/docs)
- [Upstash Docs](https://docs.upstash.com)

### Project Documentation

- [Production Checklist](../PRODUCTION_CHECKLIST.md)
- [Project State](../PROJECT_STATE.md)
- [API Contract](../CONTRACTS/api_contract.md)
- [Master Runbook](../MASTER_RUNBOOK.md)

### Getting Help

1. Check this deployment guide
2. Review platform-specific docs
3. Check GitHub Issues
4. Contact team lead

---

**Last Updated:** 2026-01-25  
**Maintained By:** Code Cloud Agents Team  
**Version:** 1.0.0
