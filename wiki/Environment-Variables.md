# Environment Variables

> Comprehensive documentation of all environment variables used in Code Cloud Agents

**Last Updated:** 2025-01-25  
**Version:** 1.0.0

---

## Table of Contents

- [Quick Start](#quick-start)
- [Server Configuration](#server-configuration)
- [Redis Configuration](#redis-configuration)
- [GitHub Configuration](#github-configuration)
- [Anthropic API Configuration](#anthropic-api-configuration)
- [Aider Configuration](#aider-configuration)
- [Logging Configuration](#logging-configuration)
- [Database Configuration (Phase 2)](#database-configuration-phase-2)
- [Notification Services (Phase 2)](#notification-services-phase-2)
- [Security Best Practices](#security-best-practices)
- [Setup Instructions](#setup-instructions)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Edit .env and add your API keys
nano .env

# 3. Verify configuration
node -e "require('dotenv').config(); console.log('✅ Config loaded');"
```

---

## Server Configuration

### `PORT`

**Description:** HTTP server port for the Express application

**Required:** No  
**Default:** `3000`  
**Example:** `8080`  
**Type:** Integer (1-65535)

**Where Used:**
- `src/index.js` (line 1063)
- Main server startup

**Security Considerations:**
- Use non-privileged ports (>1024) in development
- Production: Use reverse proxy (nginx) on port 80/443
- Ensure port is not blocked by firewall

```bash
PORT=8080
```

---

### `NODE_ENV`

**Description:** Application environment mode

**Required:** No  
**Default:** `development`  
**Example:** `production`  
**Allowed Values:** `development`, `production`, `test`

**Where Used:**
- Error handling (stack traces in dev only)
- Logging verbosity
- Performance optimizations

**Security Considerations:**
- **NEVER** use `development` in production
- Stack traces are disabled in production mode
- Enables strict security headers in production

```bash
NODE_ENV=production
```

---

## Redis Configuration

### `REDIS_HOST`

**Description:** Redis server hostname or IP address

**Required:** No  
**Default:** `localhost`  
**Example:** `redis.example.com` or `10.0.0.5`

**Where Used:**
- `src/index.js` (line 10)
- Agent state management
- Task queue operations
- Session storage

**Security Considerations:**
- Use private network/VPC in production
- Enable TLS for remote connections
- Never expose Redis to public internet

```bash
REDIS_HOST=localhost
```

---

### `REDIS_PORT`

**Description:** Redis server port number

**Required:** No  
**Default:** `6379`  
**Example:** `6379`  
**Type:** Integer (1-65535)

**Where Used:**
- `src/index.js` (line 11)
- Redis connection configuration

**Security Considerations:**
- Change default port to reduce automated attacks
- Use firewall rules to restrict access
- Consider using non-standard port in production

```bash
REDIS_PORT=6379
```

---

### `REDIS_PASSWORD` *(Not Currently Used)*

**Description:** Redis authentication password

**Required:** No (will be required in Phase 2)  
**Default:** None  
**Example:** `your-secure-redis-password`

**Future Implementation:**
- Will be added for production deployments
- Required for Redis Cloud/managed services
- Part of Phase 2 security hardening

**Security Considerations:**
- Use strong, randomly generated passwords
- Rotate regularly (every 90 days)
- Never commit to version control

```bash
# REDIS_PASSWORD=your-secure-redis-password
```

---

### `REDIS_TLS` *(Not Currently Used)*

**Description:** Enable TLS/SSL for Redis connections

**Required:** No (will be required in Phase 2)  
**Default:** `false`  
**Example:** `true`

**Future Implementation:**
- Required for production Redis connections
- Mandatory for Redis Cloud services

```bash
# REDIS_TLS=true
```

---

## GitHub Configuration

### `GITHUB_TOKEN`

**Description:** GitHub Personal Access Token for API operations

**Required:** Conditional
- **Local Development:** Yes (if using GitHub API features)
- **GitHub Actions:** No (automatically provided)

**Default:** None  
**Example:** `ghp_1234567890abcdefghijklmnopqrstuvwxyz`

**Where Used:**
- `.github/workflows/auto-build.yml` (line 36)
- Git operations (checkout, push)
- GitHub API calls (in future phases)

**Permissions Required:**
- `contents: write` - Push commits
- `workflows: write` - Trigger workflows (optional)

**Security Considerations:**
- **CRITICAL:** Store in GitHub Secrets, never in code
- Use fine-grained tokens with minimal permissions
- Set expiration date (max 90 days)
- Rotate immediately if compromised
- Never log or display token

**Setup:**
```bash
# Local development only
GITHUB_TOKEN=ghp_your_token_here

# GitHub Actions (automatic)
# Set in: Settings → Secrets and variables → Actions
# Name: GITHUB_TOKEN (or use default ${{ secrets.GITHUB_TOKEN }})
```

**Token Creation:**
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens
2. Generate new token (fine-grained)
3. Select repository access
4. Set permissions: `contents: write`
5. Copy token immediately (shown only once)

---

## Anthropic API Configuration

### `ANTHROPIC_API_KEY`

**Description:** API key for Claude AI models via Anthropic API

**Required:** Yes (for AI-powered code generation)  
**Default:** None  
**Example:** `sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`

**Where Used:**
- `.github/workflows/auto-build.yml` (line 76)
- Aider AI agent (passed via environment)
- All AI-powered code generation tasks

**Supported Models:**
- `claude-sonnet-4-5-20250929` (default, recommended)
- `claude-opus-4-5` (most capable, slower)
- Other Claude models as released

**Security Considerations:**
- **CRITICAL:** Store in GitHub Secrets only
- Never commit to repository
- Monitor API usage for anomalies
- Rotate if compromised
- Set up billing alerts
- Use separate keys for dev/prod

**Setup:**
```bash
# Local development
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# GitHub Actions (required)
# Set in: Settings → Secrets and variables → Actions
# Name: ANTHROPIC_API_KEY
```

**Cost Considerations:**
- Monitor token usage via Anthropic Console
- Set monthly spending limits
- Claude Sonnet 4.5: ~$3 per 1M input tokens
- Claude Opus 4.5: ~$15 per 1M input tokens

**Rate Limits:**
- Tier 1: 50 requests/minute
- Tier 2: 1,000 requests/minute
- Tier 3: 2,000 requests/minute
- Handle 429 errors with exponential backoff

**Get API Key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up/login
3. Navigate to API Keys
4. Create new key
5. Copy immediately (shown only once)

---

## Aider Configuration

### `AIDER_MODEL`

**Description:** Default AI model for Aider code generation

**Required:** No  
**Default:** `claude-sonnet-4`  
**Example:** `claude-sonnet-4-5-20250929`

**Where Used:**
- `.env.example` (line 11)
- Workflow dispatch override (`.github/workflows/auto-build.yml` line 101)

**Supported Values:**
- `claude-sonnet-4` - Latest Sonnet (alias)
- `claude-sonnet-4-5-20250929` - Specific version
- `claude-opus-4-5` - Most capable model
- `gpt-4` - OpenAI alternative (requires `OPENAI_API_KEY`)

**Notes:**
- Can be overridden in workflow dispatch UI
- Affects quality, speed, and cost
- Sonnet recommended for balance

```bash
AIDER_MODEL=claude-sonnet-4-5-20250929
```

---

### `AIDER_AUTO_COMMITS`

**Description:** Enable automatic git commits by Aider

**Required:** No  
**Default:** `true` (in workflow)  
**Example:** `true`  
**Type:** Boolean (`true` or `false`)

**Where Used:**
- `.env.example` (line 12)
- Passed to Aider as `--auto-commits` flag

**Behavior:**
- `true`: Aider commits after each successful change
- `false`: Changes staged but not committed

**Notes:**
- Should be `true` in CI/CD
- Can be `false` for local development

```bash
AIDER_AUTO_COMMITS=true
```

---

## Logging Configuration

### `LOG_LEVEL`

**Description:** Application logging verbosity level

**Required:** No  
**Default:** `info` (production), `debug` (development)  
**Example:** `debug`

**Allowed Values:**
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (recommended for production)
- `debug` - Detailed debugging information
- `trace` - Very verbose (performance impact)

**Where Used:**
- Console output
- Structured logging (future: winston/pino)
- Error tracking

**Security Considerations:**
- Never log sensitive data (API keys, passwords, tokens)
- Use `info` or `warn` in production
- Rotate log files regularly
- Consider log aggregation (e.g., CloudWatch, Datadog)

```bash
LOG_LEVEL=info
```

---

## Database Configuration (Phase 2)

### `DATABASE_URL`

**Description:** PostgreSQL connection string

**Required:** No (Phase 2 feature)  
**Default:** None  
**Example:** `postgresql://user:password@localhost:5432/code_cloud_agents`

**Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

**Where Used:**
- Build history tracking (future)
- Agent state persistence (future)
- Analytics (future)

**Security Considerations:**
- Use environment variable, never hardcode
- Encrypt connections (SSL/TLS required)
- Use least-privilege database user
- Rotate credentials regularly
- Enable connection pooling

**Current Status:** Not implemented (using Redis for state)

**Future Schema:** See `CONTRACTS/data_contract.md`

```bash
# Phase 2
# DATABASE_URL=postgresql://user:pass@localhost:5432/code_cloud_agents
```

---

## Notification Services (Phase 2)

### `SLACK_WEBHOOK_URL`

**Description:** Slack webhook URL for build notifications

**Required:** No (optional feature)  
**Default:** None  
**Example:** `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

**Where Used:**
- Build completion notifications (future)
- Error alerts (future)

**Setup:**
1. Create Slack app
2. Enable Incoming Webhooks
3. Add webhook to workspace
4. Copy webhook URL

```bash
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

### `DISCORD_WEBHOOK_URL`

**Description:** Discord webhook URL for build notifications

**Required:** No (optional feature)  
**Default:** None  
**Example:** `https://discord.com/api/webhooks/123456789/abcdefghijklmnop`

**Where Used:**
- Build completion notifications (future)
- Error alerts (future)

**Setup:**
1. Server Settings → Integrations → Webhooks
2. New Webhook
3. Copy webhook URL

```bash
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Security Best Practices

### ✅ DO

- ✅ Store all secrets in GitHub Secrets
- ✅ Use `.env` files locally (never commit)
- ✅ Rotate API keys every 90 days
- ✅ Use separate keys for dev/staging/prod
- ✅ Enable 2FA on all service accounts
- ✅ Monitor API usage for anomalies
- ✅ Set up billing alerts
- ✅ Use fine-grained permissions
- ✅ Encrypt sensitive data at rest
- ✅ Use TLS/SSL for all connections

### ❌ DON'T

- ❌ Commit `.env` files to git
- ❌ Share API keys via Slack/email
- ❌ Log sensitive environment variables
- ❌ Use production keys in development
- ❌ Hardcode secrets in source code
- ❌ Use weak or default passwords
- ❌ Expose Redis/Database to public internet
- ❌ Ignore security warnings
- ❌ Use `development` mode in production

---

## Setup Instructions

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/den-is9186/code-cloud-agents.git
cd code-cloud-agents

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with your values
nano .env  # or vim, code, etc.

# 4. Install dependencies
npm install

# 5. Start Redis (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# 6. Start application
npm run dev

# 7. Verify health
curl http://localhost:8080/health
```

---

### GitHub Actions Setup

```bash
# 1. Go to repository settings
# Navigate to: Settings → Secrets and variables → Actions

# 2. Add required secrets:
# Click "New repository secret"

# Secret 1: ANTHROPIC_API_KEY
Name: ANTHROPIC_API_KEY
Value: sk-ant-api03-your-key-here

# Secret 2: GITHUB_TOKEN (optional, auto-provided)
# Default ${{ secrets.GITHUB_TOKEN }} works for most cases
# Only add custom token if you need additional permissions

# 3. Verify workflow
# Go to Actions tab
# Run "Auto Build with Aider" workflow manually
# Check for successful execution
```

---

### Production Deployment

```bash
# Example: Deploying to Render/Fly/Vercel

# 1. Set environment variables in platform
# Render: Dashboard → Environment
# Fly: fly secrets set KEY=value
# Vercel: Settings → Environment Variables

# Required:
ANTHROPIC_API_KEY=sk-ant-api03-xxx
NODE_ENV=production
PORT=8080
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379

# Optional (recommended):
LOG_LEVEL=info
REDIS_PASSWORD=secure-password

# 2. Deploy
git push origin main  # If auto-deploy enabled

# 3. Verify
curl https://your-app.com/health
```

---

## Troubleshooting

### Problem: `ECONNREFUSED` connecting to Redis

**Error:**
```
Redis connection error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**

1. **Check if Redis is running:**
   ```bash
   # Docker
   docker ps | grep redis
   
   # Linux
   sudo systemctl status redis
   
   # macOS
   brew services list | grep redis
   ```

2. **Start Redis:**
   ```bash
   # Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Linux
   sudo systemctl start redis
   
   # macOS
   brew services start redis
   ```

3. **Verify REDIS_HOST and REDIS_PORT:**
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

4. **Test connection:**
   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
   # Should return: PONG
   ```

---

### Problem: `401 Unauthorized` from Anthropic API

**Error:**
```
❌ Aider Build fehlgeschlagen
Error: API authentication failed
```

**Solutions:**

1. **Verify API key is set:**
   ```bash
   # Local
   echo $ANTHROPIC_API_KEY
   
   # GitHub Actions: Check Secrets settings
   ```

2. **Check key format:**
   - Must start with `sk-ant-api03-`
   - No spaces or quotes
   - 95-100 characters long

3. **Test API key:**
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'
   ```

4. **Regenerate key:**
   - Go to console.anthropic.com
   - Revoke old key
   - Generate new key
   - Update GitHub Secret

---

### Problem: Port already in use

**Error:**
```
Server error: listen EADDRINUSE: address already in use :::8080
```

**Solutions:**

1. **Find process using port:**
   ```bash
   # Linux/macOS
   lsof -i :8080
   
   # Windows
   netstat -ano | findstr :8080
   ```

2. **Kill process:**
   ```bash
   # Linux/macOS
   kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. **Use different port:**
   ```bash
   PORT=3001 npm start
   ```

---

### Problem: GitHub Actions workflow not triggering

**Error:**
```
Scheduled workflow not running every 3 minutes
```

**Solutions:**

1. **Check workflow is enabled:**
   - Go to Actions tab
   - Check if workflow is listed
   - Ensure it's not disabled

2. **Verify cron syntax:**
   ```yaml
   schedule:
     - cron: '*/3 * * * *'  # Every 3 minutes
   ```

3. **Check task queue:**
   ```bash
   cat task-queue.txt
   # Should have non-comment lines
   ```

4. **Manually trigger:**
   - Actions tab → Auto Build → Run workflow
   - Check logs for errors

5. **Note:** GitHub Actions scheduled workflows may have delays (5-10 min)

---

### Problem: Environment variables not loading

**Error:**
```
PORT is undefined
Config loaded: false
```

**Solutions:**

1. **Verify .env file exists:**
   ```bash
   ls -la .env
   ```

2. **Check file format:**
   ```bash
   cat .env
   # Should be: KEY=value (no spaces around =)
   ```

3. **Install dotenv (if needed):**
   ```bash
   npm install dotenv
   ```

4. **Load in application:**
   ```javascript
   require('dotenv').config();
   console.log('PORT:', process.env.PORT);
   ```

5. **Check file permissions:**
   ```bash
   chmod 600 .env
   ```

---

### Problem: Redis authentication failed

**Error:**
```
ReplyError: NOAUTH Authentication required
```

**Solutions:**

1. **Add REDIS_PASSWORD:**
   ```bash
   REDIS_PASSWORD=your-password
   ```

2. **Update Redis config:**
   ```javascript
   // src/index.js
   const redis = new Redis({
     host: process.env.REDIS_HOST,
     port: process.env.REDIS_PORT,
     password: process.env.REDIS_PASSWORD
   });
   ```

3. **Or disable auth (development only):**
   ```bash
   # In redis.conf
   # requirepass your-password
   ```

---

### Problem: API rate limit exceeded

**Error:**
```
Error: Rate limit exceeded (429)
```

**Solutions:**

1. **Check Anthropic usage:**
   - Go to console.anthropic.com
   - View usage dashboard

2. **Implement backoff:**
   - Workflow already has retry logic
   - Wait 1 minute between failed attempts

3. **Upgrade tier:**
   - Contact Anthropic support
   - Request higher rate limits

4. **Optimize prompts:**
   - Reduce token usage
   - Use more specific tasks
   - Break large tasks into smaller ones

---

### Problem: Workflow timeout

**Error:**
```
The job running on runner X has exceeded the maximum execution time of 60 minutes
```

**Solutions:**

1. **Break task into smaller pieces:**
   - Split large refactoring into multiple tasks
   - Use queue for sequential processing

2. **Increase timeout (if needed):**
   ```yaml
   # .github/workflows/auto-build.yml
   jobs:
     build:
       timeout-minutes: 90  # Max: 360 for Pro/Enterprise
   ```

3. **Use faster model:**
   - Switch from Opus to Sonnet
   - Trades quality for speed

4. **Optimize task description:**
   - Be more specific
   - Reduce scope

---

## Environment Variables Checklist

Use this checklist to verify your environment configuration:

### Development
- [ ] `.env` file created from `.env.example`
- [ ] `ANTHROPIC_API_KEY` set and valid
- [ ] `PORT` configured (default: 3000)
- [ ] `REDIS_HOST` and `REDIS_PORT` set
- [ ] Redis running and accessible
- [ ] `NODE_ENV=development`
- [ ] `LOG_LEVEL=debug`

### GitHub Actions
- [ ] `ANTHROPIC_API_KEY` in GitHub Secrets
- [ ] Workflow file present (`.github/workflows/auto-build.yml`)
- [ ] Workflow enabled in Actions tab
- [ ] Repository permissions: `contents: write`
- [ ] Task queue file created (`task-queue.txt`)

### Production
- [ ] All secrets stored securely (not in code)
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info`
- [ ] Redis connection secured (TLS + password)
- [ ] API keys rotated within 90 days
- [ ] Monitoring enabled
- [ ] Backup strategy configured
- [ ] Rate limiting active
- [ ] Error tracking configured

---

## Related Documentation

- **Security:** [ops/POLICY.md](../ops/POLICY.md)
- **Contracts:** [CONTRACTS/api_contract.md](../CONTRACTS/api_contract.md)
- **Deployment:** [MASTER_RUNBOOK.md](../MASTER_RUNBOOK.md)
- **Production:** [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md)

---

## Support

**Issues:** Found a problem? [Open an issue](https://github.com/den-is9186/code-cloud-agents/issues)

**Questions:** Check [PROJECT_STATE.md](../PROJECT_STATE.md) for project status

---

**Version History:**
- `1.0.0` (2026-01-25): Initial documentation
