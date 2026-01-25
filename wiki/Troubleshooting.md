# Troubleshooting Guide

> Practical solutions to common issues in Code Cloud Agents

**Quick Navigation:**
- [Server Issues](#server-issues)
- [Redis Issues](#redis-issues)
- [Port Conflicts](#port-conflicts)
- [Test Failures](#test-failures)
- [GitHub Actions](#github-actions-issues)
- [API Errors](#api-errors)
- [Aider AI Issues](#aider-ai-issues)
- [Environment Variables](#environment-variable-issues)
- [Dependencies](#dependency-issues)
- [Performance](#performance-problems)
- [Common Error Messages](#common-error-messages)

---

## Server Issues

### Server Won't Start

**Symptoms:**
```
Server error: Error: listen EADDRINUSE: address already in use :::3000
```

**Root Cause:**
Port is already occupied by another process.

**Solution:**
```bash
# Find process using the port
lsof -i :3000
# Or on Linux
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

**Prevention:**
- Always use `PORT` environment variable
- Implement proper graceful shutdown
- Check for running instances before starting

---

### Server Crashes Immediately After Start

**Symptoms:**
```
Server running on port 3000
Server error: Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Root Cause:**
Redis is not running or not accessible.

**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (macOS)
brew services start redis

# Start Redis (Ubuntu/Debian)
sudo systemctl start redis

# Start Redis (Docker)
docker run -d -p 6379:6379 redis:latest

# Verify server can connect
npm start
```

**Prevention:**
- Start Redis before the application
- Use Docker Compose for development
- Implement connection retry logic

---

### Server Hangs on Startup

**Symptoms:**
- No output after "Server running on port..."
- Server doesn't respond to requests
- No error messages

**Root Cause:**
Blocking operations during startup or Redis connection timeout.

**Solution:**
```bash
# Check if Redis is responding
redis-cli ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Restart with debug logging
LOG_LEVEL=debug npm start

# Check if server is actually listening
curl http://localhost:3000/health
```

**Prevention:**
- Use async/await properly
- Set connection timeouts
- Add startup logging

---

## Redis Issues

### Redis Connection Failed

**Symptoms:**
```
Redis connection error: Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Root Cause:**
Redis server is not running or wrong connection settings.

**Solution:**
```bash
# 1. Check if Redis is installed
redis-server --version

# 2. Start Redis
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis-server

# Manually
redis-server

# 3. Verify connection
redis-cli ping

# 4. Check Redis configuration
cat /etc/redis/redis.conf | grep bind
# Should show: bind 127.0.0.1 ::1

# 5. Test with custom host/port
REDIS_HOST=localhost REDIS_PORT=6379 npm start
```

**Prevention:**
- Add Redis to system startup
- Use connection pooling
- Implement retry strategy (already configured)

---

### Redis Out of Memory

**Symptoms:**
```
Redis connection error: OOM command not allowed when used memory > 'maxmemory'
```

**Root Cause:**
Redis has reached its memory limit.

**Solution:**
```bash
# 1. Check current memory usage
redis-cli INFO memory

# 2. Increase maxmemory in redis.conf
sudo nano /etc/redis/redis.conf
# Set: maxmemory 512mb

# 3. Restart Redis
sudo systemctl restart redis

# 4. Clear old data
redis-cli FLUSHDB

# 5. Set expiration on keys
redis-cli EXPIRE agent:state:old-id 3600
```

**Prevention:**
- Set TTL on all keys (already implemented)
- Monitor Redis memory usage
- Clean up expired states regularly

---

### Redis Authentication Failed

**Symptoms:**
```
Redis connection error: NOAUTH Authentication required
```

**Root Cause:**
Redis requires password but none provided.

**Solution:**
```bash
# 1. Check if Redis requires password
redis-cli
# If you get: (error) NOAUTH Authentication required

# 2. Add password to environment
echo "REDIS_PASSWORD=your-password" >> .env

# 3. Update Redis config in src/index.js
# Add password option:
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  // ... rest of config
};
```

**Prevention:**
- Document Redis password in `.env.example`
- Use secure passwords in production
- Rotate credentials regularly

---

## Port Conflicts

### Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Root Cause:**
Another application is using the port.

**Solution:**
```bash
# Option 1: Kill the process
lsof -i :3000
kill -9 <PID>

# Option 2: Use different port
PORT=3001 npm start

# Option 3: Find and stop the application
ps aux | grep node
kill <PID>

# Option 4: Find all Node processes
pkill -f node  # ⚠️ Kills all Node processes!
```

**Prevention:**
- Use unique ports per project
- Always stop servers before starting new ones
- Use process managers like PM2

---

### Cannot Bind to Port (Permission Denied)

**Symptoms:**
```
Error: listen EACCES: permission denied 0.0.0.0:80
```

**Root Cause:**
Ports below 1024 require root privileges.

**Solution:**
```bash
# Option 1: Use port >= 1024
PORT=8080 npm start

# Option 2: Use sudo (NOT recommended)
sudo PORT=80 npm start

# Option 3: Use authbind (Linux)
sudo apt-get install authbind
sudo touch /etc/authbind/byport/80
sudo chmod 500 /etc/authbind/byport/80
sudo chown $USER /etc/authbind/byport/80
authbind --deep npm start

# Option 4: Use reverse proxy (RECOMMENDED)
# Set up Nginx to forward port 80 -> 3000
```

**Prevention:**
- Always use non-privileged ports (>= 1024)
- Use reverse proxy for port 80/443

---

## Test Failures

### All Tests Fail with Redis Error

**Symptoms:**
```
FAIL tests/integration.test.js
  ● Test suite failed to run
    Redis connection error: connect ECONNREFUSED
```

**Root Cause:**
Redis not running during tests.

**Solution:**
```bash
# 1. Start Redis
redis-server &

# 2. Run tests
npm test

# 3. Or use test Redis instance
REDIS_PORT=6380 redis-server &
REDIS_PORT=6380 npm test

# 4. Or mock Redis in tests
# See tests/example.test.js for mock examples
```

**Prevention:**
- Add Redis check to test setup
- Use separate Redis DB for tests
- Document test dependencies

---

### Tests Timeout

**Symptoms:**
```
FAIL tests/integration.test.js
  ● API › POST /api/v1/agent/state
    Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Root Cause:**
Server not responding or tests not closing connections.

**Solution:**
```bash
# 1. Increase timeout in test
jest.setTimeout(10000);

# 2. Check if server is running
curl http://localhost:3000/health

# 3. Close connections after tests
afterAll(async () => {
  await redis.quit();
  await server.close();
});

# 4. Run single test to debug
npm test -- tests/integration.test.js
```

**Prevention:**
- Always close connections in `afterAll`
- Use proper cleanup in tests
- Set appropriate timeouts

---

### Tests Pass Locally, Fail in CI

**Symptoms:**
- All tests pass: `npm test` ✅
- CI fails with timeout or connection errors ❌

**Root Cause:**
Different environment in CI (no Redis, wrong paths, etc.).

**Solution:**
```yaml
# Add Redis service to .github/workflows/test.yml
services:
  redis:
    image: redis:latest
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

# Set environment variables
env:
  REDIS_HOST: localhost
  REDIS_PORT: 6379
  NODE_ENV: test
```

**Prevention:**
- Mirror CI environment locally with Docker
- Document all test dependencies
- Use environment detection in tests

---

## GitHub Actions Issues

### Workflow Not Triggering

**Symptoms:**
- Manual trigger button doesn't appear
- Scheduled workflow doesn't run
- No workflow runs in Actions tab

**Root Cause:**
Syntax errors in workflow file or wrong permissions.

**Solution:**
```bash
# 1. Validate workflow syntax
cd .github/workflows
cat auto-build.yml | grep -A 5 "on:"

# 2. Check if file is committed
git status
git add .github/workflows/auto-build.yml
git commit -m "fix: workflow file"
git push

# 3. Check repository settings
# Go to Settings → Actions → General
# Ensure "Allow all actions and reusable workflows" is selected

# 4. Check branch name
# Workflow must be on default branch (main)
git branch --show-current
```

**Prevention:**
- Use YAML validator
- Test workflows before committing
- Enable Actions immediately after repo creation

---

### Workflow Fails with "Authentication Failed"

**Symptoms:**
```
Error: Authentication failed
fatal: could not read Username for 'https://github.com'
```

**Root Cause:**
Missing or invalid `GITHUB_TOKEN`.

**Solution:**
```yaml
# 1. Ensure token is passed correctly
- name: Checkout Repository
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    
# 2. Add write permissions
permissions:
  contents: write
  
# 3. Configure git properly
- name: Configure Git
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
```

**Prevention:**
- Always add `permissions` section
- Test push operations in workflow
- Use personal access token if needed

---

### Workflow Fails with "Aider Command Not Found"

**Symptoms:**
```
aider: command not found
Error: Process completed with exit code 127
```

**Root Cause:**
Aider not installed or wrong Python version.

**Solution:**
```yaml
# 1. Add Python setup step
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'

# 2. Install Aider
- name: Install Aider
  run: |
    pip install aider-chat
    aider --version

# 3. Verify installation
- name: Verify Aider
  run: which aider
```

**Prevention:**
- Always specify Python version
- Add version checks after installation
- Cache pip dependencies

---

### Workflow Fails with "API Rate Limit"

**Symptoms:**
```
Error: API rate limit exceeded for <IP>
```

**Root Cause:**
Too many API calls to GitHub or Anthropic.

**Solution:**
```bash
# For GitHub API:
# 1. Use authenticated requests
# 2. Add delays between calls
# 3. Use cache when possible

# For Anthropic API:
# 1. Check quota: https://console.anthropic.com/
# 2. Reduce workflow frequency
# 3. Add error handling

# Update cron schedule in workflow
schedule:
  - cron: '0 */4 * * *'  # Every 4 hours instead of 3 minutes
```

**Prevention:**
- Monitor API usage
- Implement exponential backoff
- Cache responses when possible

---

### Workflow Runs But Makes No Changes

**Symptoms:**
- Workflow shows success ✅
- No commits or changes visible
- Aider completes but nothing happens

**Root Cause:**
Empty task queue or Aider configuration issue.

**Solution:**
```bash
# 1. Check task queue locally
cat task-queue.txt
# Ensure it has non-comment lines

# 2. Check Aider logs in workflow
# Look for: "✅ Build abgeschlossen"

# 3. Manually test Aider
aider --yes --auto-commits --model claude-sonnet-4-5-20250929 \
  --message "Add a comment to README.md"

# 4. Check git status after Aider
git status
git log --oneline -5
```

**Prevention:**
- Always verify task queue before scheduling
- Add logging to workflow steps
- Test Aider commands locally first

---

## API Errors

### 400 Bad Request - Invalid Input

**Symptoms:**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "agentId is required"
  }
}
```

**Root Cause:**
Missing or invalid request parameters.

**Solution:**
```bash
# Check API contract: CONTRACTS/api_contract.md

# Example: Create agent state
curl -X POST http://localhost:3000/api/v1/agent/state \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test-agent-123",
    "status": "running",
    "progress": 0
  }'

# Validate agentId format (alphanumeric, -, _, :, .)
# Max 256 characters
```

**Prevention:**
- Read API contract before making requests
- Validate input on client side
- Use TypeScript for type safety

---

### 404 Not Found - State Not Found

**Symptoms:**
```json
{
  "error": {
    "code": "STATE_NOT_FOUND",
    "message": "Agent state not found for agentId: xyz"
  }
}
```

**Root Cause:**
Agent state expired (TTL) or never created.

**Solution:**
```bash
# 1. Check if state exists
redis-cli GET "agent:state:xyz"

# 2. Check TTL
redis-cli TTL "agent:state:xyz"
# -2 means key doesn't exist
# -1 means key exists but has no expiration

# 3. Create state first
curl -X POST http://localhost:3000/api/v1/agent/state \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "xyz",
    "status": "pending"
  }'

# 4. Increase TTL if needed
curl -X POST http://localhost:3000/api/v1/agent/state \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "xyz",
    "status": "running",
    "ttl": 172800
  }'
```

**Prevention:**
- Create states before querying them
- Use longer TTL for long-running tasks
- Implement state creation checks

---

### 503 Service Unavailable - Redis Disconnected

**Symptoms:**
```json
{
  "status": "unhealthy",
  "redis": "disconnected",
  "error": "connect ECONNREFUSED"
}
```

**Root Cause:**
Redis server is down or unreachable.

**Solution:**
```bash
# See "Redis Connection Failed" section above

# Quick fix:
redis-server &
npm restart
```

**Prevention:**
- Monitor Redis health
- Implement automatic reconnection
- Use Redis cluster for HA

---

### 413 Payload Too Large

**Symptoms:**
```
Error: request entity too large
```

**Root Cause:**
Request body exceeds 10MB limit.

**Solution:**
```javascript
// In src/index.js, increase limit:
app.use(express.json({ limit: '50mb' }));

// Or reduce file size before uploading
```

**Prevention:**
- Compress large files
- Use streaming for large uploads
- Implement chunked uploads

---

## Aider AI Issues

### "ANTHROPIC_API_KEY not set"

**Symptoms:**
```
Error: ANTHROPIC_API_KEY environment variable is not set
```

**Root Cause:**
Missing API key in environment.

**Solution:**
```bash
# 1. Get API key from https://console.anthropic.com/

# 2. Add to .env file
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key" >> .env

# 3. For GitHub Actions, add as secret:
# Go to Settings → Secrets → Actions
# Add: ANTHROPIC_API_KEY

# 4. Verify it's set
echo $ANTHROPIC_API_KEY | cut -c1-10
# Should show: sk-ant-api
```

**Prevention:**
- Never commit API keys
- Rotate keys regularly
- Use separate keys for dev/prod

---

### Aider Makes Wrong Changes

**Symptoms:**
- Aider modifies wrong files
- Changes don't match the task
- Unexpected code deletions

**Root Cause:**
Unclear task description or wrong model.

**Solution:**
```bash
# 1. Use more specific instructions
aider --yes --message "Add a health check endpoint at /health that returns JSON {status: 'ok'} - do NOT modify other endpoints"

# 2. Use better model
aider --model claude-sonnet-4-5-20250929 --message "..."

# 3. Review changes before commit
aider --message "..." # Without --yes or --auto-commits
# Review changes manually
git diff
git add -p  # Stage changes selectively

# 4. Revert if needed
git reset --hard HEAD
```

**Prevention:**
- Write clear, specific task descriptions
- Use contracts as reference
- Review Aider changes before pushing

---

### Aider Hangs or Times Out

**Symptoms:**
- Aider starts but never completes
- No output after "Aider v0.x.x"
- Workflow times out after 60 minutes

**Root Cause:**
Large codebase, API issues, or complex task.

**Solution:**
```bash
# 1. Check API connectivity
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":1024,"messages":[{"role":"user","content":"Hi"}]}'

# 2. Simplify task
# Instead of: "Refactor entire application"
# Use: "Refactor src/index.js to use async/await"

# 3. Limit file scope
aider --yes --message "Fix bug" src/index.js

# 4. Increase timeout in workflow
jobs:
  build:
    timeout-minutes: 120  # Instead of 60
```

**Prevention:**
- Break large tasks into smaller ones
- Use file-specific tasks
- Monitor API status

---

### Aider API Rate Limited

**Symptoms:**
```
Error: rate_limit_error: API rate limit exceeded
```

**Root Cause:**
Too many API requests in short time.

**Solution:**
```bash
# 1. Check current rate limits
# Visit: https://console.anthropic.com/account/limits

# 2. Reduce workflow frequency
# In .github/workflows/auto-build.yml:
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours

# 3. Wait before retrying
sleep 60
aider --yes --message "..."

# 4. Use smaller model for simple tasks
aider --model claude-opus-4-5 --message "..."
```

**Prevention:**
- Monitor API usage
- Schedule workflows appropriately
- Implement retry with exponential backoff

---

## Environment Variable Issues

### Variables Not Loading

**Symptoms:**
```javascript
console.log(process.env.PORT); // undefined
```

**Root Cause:**
`.env` file not loaded or wrong location.

**Solution:**
```bash
# 1. Install dotenv
npm install dotenv

# 2. Load at app start
# Add to src/index.js top:
require('dotenv').config();

# 3. Check .env location
ls -la .env
# Must be in project root

# 4. Check .env format
cat .env
# No spaces around =
# PORT=3000 ✅
# PORT = 3000 ❌

# 5. Restart server
npm start
```

**Prevention:**
- Always use `.env.example` as template
- Load dotenv before any imports
- Add `.env` to `.gitignore`

---

### Variables Work Locally, Not in Production

**Symptoms:**
- Local: Works ✅
- Production: `undefined` or default values ❌

**Root Cause:**
Environment variables not set in production.

**Solution:**
```bash
# For GitHub Actions:
# 1. Add to repository secrets
# Settings → Secrets → Actions → New secret

# 2. Use in workflow
env:
  PORT: ${{ secrets.PORT }}
  REDIS_HOST: ${{ secrets.REDIS_HOST }}

# For Docker:
docker run -e PORT=8080 -e REDIS_HOST=redis myapp

# For systemd service:
# Add to /etc/systemd/system/myapp.service
[Service]
Environment="PORT=8080"
Environment="REDIS_HOST=localhost"
```

**Prevention:**
- Document all required env vars in `.env.example`
- Use configuration management
- Validate env vars at startup

---

### Wrong Variable Values

**Symptoms:**
```bash
echo $PORT  # Shows: 3000
# But app uses: 8080
```

**Root Cause:**
Variables overridden or wrong precedence.

**Solution:**
```bash
# Check precedence order:
# 1. Command line: PORT=9000 npm start
# 2. Shell export: export PORT=8080
# 3. .env file: PORT=3000

# Find which is set
echo "CLI: $PORT"
grep PORT .env
node -p "process.env.PORT"

# Clear all and start fresh
unset PORT
rm .env
cp .env.example .env
# Edit .env with correct values
npm start
```

**Prevention:**
- Use consistent variable names
- Document variable precedence
- Avoid shell exports for app vars

---

## Dependency Issues

### `npm install` Fails

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE could not resolve
```

**Root Cause:**
Dependency conflicts or outdated npm.

**Solution:**
```bash
# 1. Update npm
npm install -g npm@latest

# 2. Clear cache
npm cache clean --force

# 3. Delete lock file and node_modules
rm -rf node_modules package-lock.json

# 4. Install with legacy peer deps
npm install --legacy-peer-deps

# 5. Or force install
npm install --force

# 6. Check Node version
node --version
# Ensure >= 14.0.0
```

**Prevention:**
- Keep dependencies updated
- Use exact versions for critical packages
- Commit `package-lock.json`

---

### Module Not Found

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Root Cause:**
Dependencies not installed.

**Solution:**
```bash
# 1. Install dependencies
npm install

# 2. Verify installation
ls node_modules | grep express

# 3. If specific module missing
npm install express

# 4. Check package.json
cat package.json | grep express
```

**Prevention:**
- Run `npm install` after clone
- Commit `package-lock.json`
- Add `npm install` to setup docs

---

### Version Conflicts

**Symptoms:**
```
npm WARN deprecated package@1.0.0: This package is deprecated
```

**Root Cause:**
Using outdated or incompatible package versions.

**Solution:**
```bash
# 1. Check outdated packages
npm outdated

# 2. Update specific package
npm update express

# 3. Update all packages (careful!)
npm update

# 4. Install specific version
npm install express@4.18.2

# 5. Check for security issues
npm audit
npm audit fix
```

**Prevention:**
- Regular dependency updates
- Use Dependabot
- Pin major versions

---

### TypeScript Errors After Update

**Symptoms:**
```
error TS2304: Cannot find name 'Request'
```

**Root Cause:**
Type definitions missing or outdated.

**Solution:**
```bash
# 1. Install type definitions
npm install --save-dev @types/express @types/node

# 2. Update type definitions
npm update @types/express

# 3. Check tsconfig.json
cat tsconfig.json
# Ensure "types" includes needed types

# 4. Restart TypeScript server
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**Prevention:**
- Install type definitions with packages
- Keep types in sync with packages
- Use `@types/*` for all libraries

---

## Performance Problems

### Slow Response Times

**Symptoms:**
- API requests take >1 second
- Health check slow
- High CPU usage

**Root Cause:**
Inefficient queries, blocking operations, or resource exhaustion.

**Solution:**
```bash
# 1. Enable logging to find slow operations
LOG_LEVEL=debug npm start

# 2. Check Redis performance
redis-cli --latency

# 3. Monitor with top/htop
top
# Press 1 to see all cores

# 4. Profile Node.js
node --inspect src/index.js
# Open chrome://inspect

# 5. Check for blocking operations
# Look for synchronous fs operations
grep "Sync" src/**/*.js

# 6. Optimize Redis queries
# Use pipelining for multiple operations
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
const results = await pipeline.exec();
```

**Prevention:**
- Use async operations
- Implement caching
- Monitor performance metrics
- Use connection pooling

---

### Memory Leaks

**Symptoms:**
- Memory usage increases over time
- Server crashes with OOM error
- `ps aux` shows growing RSS

**Root Cause:**
Unreleased resources, event listeners, or circular references.

**Solution:**
```bash
# 1. Monitor memory
node --expose-gc --inspect src/index.js

# 2. Take heap snapshot
# In Chrome DevTools: Memory → Take snapshot

# 3. Check for leaks with clinic
npm install -g clinic
clinic doctor -- node src/index.js
# Make some requests
# Ctrl+C
# View report

# 4. Common leak sources:
# - Event listeners not removed
# - Timers not cleared
# - Circular references
# - Large objects in closures

# 5. Fix example:
# ❌ Bad:
setInterval(() => { ... }, 1000);

# ✅ Good:
const timer = setInterval(() => { ... }, 1000);
// Later:
clearInterval(timer);
```

**Prevention:**
- Always cleanup event listeners
- Clear timers and intervals
- Avoid global variables
- Use weak references when appropriate

---

### High CPU Usage

**Symptoms:**
```
top
CPU: 100% node
```

**Root Cause:**
Infinite loops, blocking operations, or intensive computations.

**Solution:**
```bash
# 1. Find which function is hot
node --prof src/index.js
# Run workload
# Ctrl+C
node --prof-process isolate-*-v8.log > profile.txt
cat profile.txt | head -50

# 2. Check for infinite loops
# Add logging to suspected areas
console.log('Loop iteration:', i);

# 3. Use async for I/O operations
# ❌ Bad:
const data = fs.readFileSync('file.txt');

# ✅ Good:
const data = await fs.promises.readFile('file.txt');

# 4. Limit concurrent operations
const pLimit = require('p-limit');
const limit = pLimit(10);
await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

**Prevention:**
- Profile regularly
- Avoid synchronous operations
- Use worker threads for CPU-intensive tasks
- Implement rate limiting

---

## Common Error Messages

### "Cannot read property 'X' of undefined"

**Cause:** Accessing property of undefined object.

**Solution:**
```javascript
// ❌ Bad:
const value = obj.nested.property;

// ✅ Good:
const value = obj?.nested?.property;
// Or:
const value = obj && obj.nested && obj.nested.property;
```

---

### "ENOENT: no such file or directory"

**Cause:** File or directory doesn't exist.

**Solution:**
```bash
# Check if file exists
ls -la path/to/file

# Create directory
mkdir -p path/to/directory

# Check current directory
pwd

# Use absolute paths
const path = require('path');
const fullPath = path.join(__dirname, 'relative/path');
```

---

### "Maximum call stack size exceeded"

**Cause:** Infinite recursion or very deep recursion.

**Solution:**
```javascript
// Add base case to recursion
function recursive(n) {
  if (n <= 0) return; // Base case
  recursive(n - 1);
}

// Or use iteration
function iterative(n) {
  while (n > 0) {
    n--;
  }
}
```

---

### "UnhandledPromiseRejectionWarning"

**Cause:** Promise rejection not caught.

**Solution:**
```javascript
// ❌ Bad:
fetch('/api').then(r => r.json());

// ✅ Good:
fetch('/api')
  .then(r => r.json())
  .catch(err => console.error(err));

// ✅ Better:
try {
  const response = await fetch('/api');
  const data = await response.json();
} catch (err) {
  console.error(err);
}
```

---

### "EADDRINUSE" (Port in use)

See [Port Conflicts](#port-conflicts) section.

---

### "ECONNREFUSED" (Connection refused)

See [Redis Connection Failed](#redis-connection-failed) section.

---

### "MODULE_NOT_FOUND"

See [Module Not Found](#module-not-found) section.

---

## Getting Help

If none of these solutions work:

1. **Check Logs:**
   ```bash
   LOG_LEVEL=debug npm start 2>&1 | tee debug.log
   ```

2. **Search Issues:**
   - GitHub Issues: https://github.com/den-is9186/code-cloud-agents/issues
   - Stack Overflow: Tag [code-cloud-agents]

3. **Check Documentation:**
   - [Architecture Overview](Architecture-Overview.md)
   - [API Reference](API-Reference.md)
   - [Development Guide](Development-Guide.md)

4. **Ask for Help:**
   - Open a GitHub Issue with:
     - Exact error message
     - Steps to reproduce
     - Your environment (OS, Node version, Redis version)
     - Relevant logs

5. **System Information:**
   ```bash
   # Gather system info for bug reports
   echo "Node: $(node --version)"
   echo "NPM: $(npm --version)"
   echo "OS: $(uname -a)"
   echo "Redis: $(redis-server --version)"
   echo "Aider: $(aider --version)"
   ```

---

## Contributing

Found a solution not listed here? Please contribute!

1. Fork the repository
2. Add your solution to this file
3. Submit a Pull Request

---

**Last Updated:** 2026-01-25
**Maintainer:** @den-is9186
