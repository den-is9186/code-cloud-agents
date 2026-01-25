# Monitoring and Logging

> **Purpose:** Comprehensive monitoring, logging, and debugging strategies for Code Cloud Agents

---

## Overview

Effective monitoring and logging are critical for:
- **Debugging**: Quickly identify and fix issues
- **Performance**: Track response times and resource usage
- **Security**: Detect and respond to security incidents
- **Observability**: Understand system behavior in production

---

## Health Checks

### Primary Health Check Endpoint

**Endpoint:** `GET /health`

**Response Format:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0",
  "db": {
    "status": "connected",
    "latency": 12
  },
  "services": {
    "aider": "operational",
    "github": "operational"
  }
}
```

### Health Check Requirements

#### Must Include
- ✅ `status`: Overall system status (`ok`, `degraded`, `down`)
- ✅ `timestamp`: ISO 8601 timestamp
- ✅ `db.status`: Database connectivity status
- ✅ Component-level checks for critical dependencies

#### Implementation Example

```javascript
// Node.js/Express example
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    db: { status: 'disconnected' },
    services: {}
  };

  try {
    // Check database
    const dbStart = Date.now();
    await db.query('SELECT 1');
    health.db = {
      status: 'connected',
      latency: Date.now() - dbStart
    };
  } catch (error) {
    health.status = 'degraded';
    health.db = { status: 'error', error: error.message };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Health Check Best Practices

- **Lightweight**: Keep checks fast (<1 second)
- **Non-destructive**: Never modify data
- **Cached**: Cache component checks for 10-30 seconds
- **Detailed**: Include latency and version info
- **Standardized**: Use consistent status values

---

## Structured Logging

### Log Format Standard

**Always use JSON for production logs:**

```json
{
  "timestamp": "2025-01-15T10:30:15.123Z",
  "level": "info",
  "service": "code-cloud-agents",
  "message": "Task processed successfully",
  "context": {
    "taskId": "task-123",
    "model": "claude-sonnet-4",
    "duration": 45.2
  },
  "trace": {
    "requestId": "req-abc-123",
    "userId": "user-456"
  }
}
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO 8601 | Yes | When the event occurred |
| `level` | String | Yes | Log level (see below) |
| `service` | String | Yes | Service name |
| `message` | String | Yes | Human-readable message |
| `context` | Object | No | Event-specific data |
| `trace` | Object | No | Request/correlation IDs |

### Recommended Logging Libraries

#### Node.js
```bash
npm install pino
```

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

logger.info({ taskId: 'task-123', duration: 45 }, 'Task processed');
```

#### Python
```bash
pip install structlog
```

```python
import structlog

logger = structlog.get_logger()

logger.info("task_processed", 
  task_id="task-123",
  duration=45.2,
  model="claude-sonnet-4"
)
```

---

## Log Levels

### Standard Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Failures requiring immediate attention | API call failed, database connection lost |
| `warn` | Potential issues, degraded performance | Rate limit approaching, slow response |
| `info` | Important business events | Task started/completed, user action |
| `debug` | Detailed diagnostic information | Function entry/exit, variable values |
| `trace` | Very verbose, fine-grained debugging | Loop iterations, every DB query |

### Production Log Level

**Default:** `info`

```bash
# Environment variable
LOG_LEVEL=info

# Only in debugging scenarios
LOG_LEVEL=debug
```

### Log Level Best Practices

#### ✅ DO:
```javascript
// Good: Informative, actionable
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error: err.message, stack: err.stack }, 'DB query failed');
```

#### ❌ DON'T:
```javascript
// Bad: Too verbose for production
logger.info('Function started');
logger.info('Function ended');

// Bad: Not structured
console.log('Error: ' + err);
```

---

## Monitoring Strategies

### Metrics to Track

#### Application Metrics
- **Response Time**: P50, P95, P99 latencies
- **Error Rate**: Errors per minute/hour
- **Request Rate**: Requests per second
- **Throughput**: Tasks processed per minute

#### System Metrics
- **CPU Usage**: Percentage and load average
- **Memory Usage**: Heap size, RSS
- **Disk I/O**: Read/write operations
- **Network I/O**: Bytes sent/received

#### Business Metrics
- **Tasks Completed**: Count by type
- **Build Success Rate**: Percentage
- **Queue Length**: Number of pending tasks
- **Model Usage**: API calls per model

### Monitoring Tools

#### Application Performance Monitoring (APM)
- **Datadog**: Full-stack observability
- **New Relic**: Application monitoring
- **Sentry**: Error tracking and performance
- **Prometheus + Grafana**: Open-source metrics

#### Uptime Monitoring
- **UptimeRobot**: Free basic monitoring
- **Pingdom**: Advanced uptime checks
- **StatusCake**: Multi-location checks

---

## Debugging Workflows

### Local Development Debugging

#### Enable Debug Logging
```bash
# Node.js
DEBUG=* npm start

# Python
LOG_LEVEL=debug python app.py
```

#### Use Debugger
```javascript
// Node.js
node --inspect-brk app.js
// Then attach Chrome DevTools

// VS Code: Add breakpoint and press F5
```

#### Check Logs
```bash
# Follow logs in real-time
tail -f logs/app.log | jq .

# Search for errors
grep '"level":"error"' logs/app.log | jq .
```

### Production Debugging

#### 1. Check Health Endpoint
```bash
curl https://your-app.com/health | jq .
```

#### 2. Review Recent Logs
```bash
# Filter errors in last hour
grep '"level":"error"' logs/app.log | \
  grep "$(date -u -d '1 hour ago' '+%Y-%m-%d')" | \
  jq -r '.message'
```

#### 3. Check Metrics Dashboard
- Open monitoring dashboard (Datadog, Grafana, etc.)
- Look for spikes in error rate
- Check resource usage (CPU, memory)

#### 4. Trace Requests
```bash
# Find all logs for specific request
grep '"requestId":"req-abc-123"' logs/app.log | jq .
```

### Common Issues and Debugging Steps

#### Issue: High Error Rate

**Steps:**
1. Check `/health` endpoint
2. Review error logs: `grep '"level":"error"'`
3. Check database connectivity
4. Review recent deployments
5. Check external service status

#### Issue: Slow Performance

**Steps:**
1. Check response time metrics
2. Review slow query logs
3. Check CPU/memory usage
4. Look for N+1 queries
5. Review caching strategy

#### Issue: Failed Tasks

**Steps:**
1. Check task queue: `cat task-queue.txt`
2. Review GitHub Actions logs
3. Check Aider API connectivity
4. Verify API key validity
5. Review task complexity

---

## Request Tracing

### Correlation IDs

Generate unique ID for each request:

```javascript
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  logger.info({ requestId: req.id, path: req.path }, 'Request received');
  next();
});
```

### Distributed Tracing

For microservices, use:
- **OpenTelemetry**: Standard tracing
- **Jaeger**: Distributed tracing platform
- **Zipkin**: Trace visualization

---

## Log Retention and Storage

### Retention Policies

| Environment | Retention | Storage |
|-------------|-----------|---------|
| Development | 7 days | Local files |
| Staging | 30 days | Centralized logging |
| Production | 90 days | Centralized logging + archive |

### Storage Solutions

#### Local Development
```bash
# Rotate logs daily
npm install rotating-file-stream
```

#### Production
- **CloudWatch Logs** (AWS)
- **Google Cloud Logging**
- **Elasticsearch + Kibana** (ELK Stack)
- **Loki + Grafana** (lightweight alternative)

---

## Security Considerations

### Never Log Sensitive Data

❌ **DON'T:**
```javascript
logger.info({ password: req.body.password }, 'Login attempt');
logger.debug({ apiKey: process.env.API_KEY }, 'Config loaded');
logger.info({ creditCard: user.card }, 'Payment processed');
```

✅ **DO:**
```javascript
logger.info({ userId: user.id }, 'Login attempt');
logger.info('Config loaded successfully');
logger.info({ userId: user.id, amount: 99.99 }, 'Payment processed');
```

### Sensitive Fields to Redact

- Passwords
- API keys
- Tokens (JWT, OAuth)
- Credit card numbers
- Social security numbers
- Personal identifiable information (PII)

### Log Sanitization

```javascript
function sanitize(obj) {
  const sensitive = ['password', 'apiKey', 'token', 'secret'];
  const sanitized = { ...obj };
  
  for (const key of sensitive) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

logger.info(sanitize(userData), 'User data processed');
```

---

## Alerting Rules

### Critical Alerts (Page immediately)
- Health check fails for 2+ minutes
- Error rate > 5% for 5 minutes
- Database connection lost
- Disk space > 90%

### Warning Alerts (Notify during business hours)
- Response time P95 > 2 seconds
- Error rate > 1% for 15 minutes
- Memory usage > 80%
- Queue length > 100 tasks

### Example Alert Configuration

```yaml
# Prometheus AlertManager example
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% over 5 minutes"
```

---

## Performance Monitoring

### Response Time Tracking

```javascript
const onFinished = require('on-finished');

app.use((req, res, next) => {
  const start = Date.now();
  
  onFinished(res, () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    }, 'Request completed');
  });
  
  next();
});
```

### Database Query Monitoring

```javascript
// PostgreSQL example
db.on('query', (query) => {
  if (query.duration > 1000) {
    logger.warn({
      query: query.sql,
      duration: query.duration
    }, 'Slow query detected');
  }
});
```

---

## Best Practices Summary

### DO:
✅ Use structured JSON logging
✅ Include correlation/request IDs
✅ Log all errors with stack traces
✅ Monitor health check endpoint
✅ Set up alerts for critical issues
✅ Use appropriate log levels
✅ Sanitize sensitive data

### DON'T:
❌ Log sensitive information
❌ Use console.log in production
❌ Log inside tight loops
❌ Skip health checks
❌ Ignore warning signs
❌ Over-log (excessive verbosity)

---

## Related Documentation

- [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) - Pre-deployment requirements
- [MASTER_RUNBOOK.md](../MASTER_RUNBOOK.md) - Development workflow
- [Auto Build System](./Auto-Build-System.md) - Build monitoring specifics
