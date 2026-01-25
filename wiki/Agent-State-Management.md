# Agent State Management

## Table of Contents

- [Overview](#overview)
- [What is Agent State Management?](#what-is-agent-state-management)
- [Agent State Lifecycle](#agent-state-lifecycle)
- [State Schema](#state-schema)
- [API Endpoints](#api-endpoints)
  - [Create or Update State](#create-or-update-state)
  - [Get State](#get-state)
  - [Retry Failed Task](#retry-failed-task)
  - [List All States](#list-all-states)
  - [Delete State](#delete-state)
- [State Transitions](#state-transitions)
- [Retry Logic](#retry-logic)
- [TTL and Garbage Collection](#ttl-and-garbage-collection)
- [Best Practices](#best-practices)
- [Use Cases](#use-cases)

---

## Overview

The Agent State Management API provides a robust system for tracking and managing the execution state of autonomous agents. It uses Redis as the backend for fast, reliable state persistence with automatic expiration.

**Key Features:**
- ✅ Track agent execution status (pending, running, completed, failed, cancelled)
- ✅ Automatic retry mechanism with configurable limits
- ✅ Progress tracking (0-100%)
- ✅ Custom metadata support
- ✅ TTL-based automatic cleanup
- ✅ Error history preservation
- ✅ Pagination support for listing states

---

## What is Agent State Management?

Agent State Management is a centralized system for:

1. **State Persistence**: Store and retrieve the current state of agent tasks
2. **Progress Tracking**: Monitor task completion percentage in real-time
3. **Error Handling**: Track failures and automatically retry tasks
4. **State Transitions**: Manage the lifecycle from pending → running → completed/failed
5. **Garbage Collection**: Automatically clean up old states after TTL expiration

This system enables:
- Multiple agents to coordinate work
- Recovery from failures through automatic retries
- Monitoring of long-running tasks
- Historical tracking of task execution

---

## Agent State Lifecycle

```
┌─────────┐
│ PENDING │ ← Initial state when task is created
└────┬────┘
     │
     v
┌─────────┐
│ RUNNING │ ← Agent actively processing the task
└────┬────┘
     │
     ├──────────┐
     v          v
┌───────────┐  ┌────────┐
│ COMPLETED │  │ FAILED │ ← Task failed, can be retried
└───────────┘  └────┬───┘
                    │
                    v
               ┌────────┐
               │ RETRY  │ ← Returns to PENDING state
               └────────┘
                    │
                    v
               ┌─────────┐
               │ PENDING │ (retry attempt)
               └─────────┘

Additional Terminal State:
┌───────────┐
│ CANCELLED │ ← Task manually cancelled
└───────────┘
```

---

## State Schema

### Agent State Object

```javascript
{
  "agentId": "string",           // Unique identifier for the agent/task
  "status": "string",            // pending | running | completed | failed | cancelled
  "progress": number,            // 0-100 indicating completion percentage
  "metadata": object,            // Custom key-value pairs
  "retryCount": number,          // Number of retry attempts made
  "maxRetries": number,          // Maximum allowed retries (default: 3)
  "createdAt": "ISO8601",        // Timestamp when state was created
  "updatedAt": "ISO8601",        // Timestamp of last update
  
  // Optional fields (present based on state)
  "lastError": "string",         // Error message from last failure
  "failedAt": "ISO8601",         // Timestamp of failure
  "completedAt": "ISO8601",      // Timestamp of completion
  "retriedAt": "ISO8601",        // Timestamp of last retry
  "errorHistory": [{             // Array of previous errors
    "error": "string",
    "failedAt": "ISO8601",
    "retryNumber": number
  }]
}
```

### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `agentId` | string | Unique identifier | Required, max 256 chars, alphanumeric + `_-:.` |
| `status` | enum | Current execution state | One of: pending, running, completed, failed, cancelled |
| `progress` | number | Task completion percentage | 0-100 |
| `metadata` | object | Custom application data | Any JSON object |
| `retryCount` | number | Retry attempts made | Auto-incremented on retry |
| `maxRetries` | number | Retry limit | Default: 3 |
| `createdAt` | ISO8601 | Creation timestamp | Auto-generated |
| `updatedAt` | ISO8601 | Last update timestamp | Auto-updated |

---

## API Endpoints

### Create or Update State

**Endpoint:** `POST /api/v1/agent/state`

Creates a new agent state or updates an existing one.

#### Request Body

```json
{
  "agentId": "agent-123",
  "status": "running",
  "progress": 50,
  "metadata": {
    "taskType": "data-processing",
    "inputFile": "dataset.csv"
  },
  "ttl": 86400,
  "error": "Optional error message if status is failed"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | ✅ Yes | Unique agent identifier |
| `status` | string | ❌ No | Task status (default: "pending") |
| `progress` | number | ❌ No | Completion percentage (default: 0) |
| `metadata` | object | ❌ No | Custom metadata |
| `ttl` | number | ❌ No | Time-to-live in seconds (default: 86400) |
| `error` | string | ❌ No | Error message (used when status is "failed") |

#### Response

```json
{
  "agentId": "agent-123",
  "state": {
    "agentId": "agent-123",
    "status": "running",
    "progress": 50,
    "metadata": {
      "taskType": "data-processing",
      "inputFile": "dataset.csv"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "ttl": 86400
}
```

#### Example: Create State (curl)

```bash
curl -X POST http://localhost:3000/api/v1/agent/state \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-123",
    "status": "pending",
    "metadata": {
      "task": "Process customer data",
      "priority": "high"
    }
  }'
```

#### Example: Update Progress (JavaScript)

```javascript
async function updateProgress(agentId, progress) {
  const response = await fetch('http://localhost:3000/api/v1/agent/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      status: 'running',
      progress
    })
  });
  
  return await response.json();
}

// Update progress to 75%
await updateProgress('agent-123', 75);
```

#### Example: Mark as Failed

```bash
curl -X POST http://localhost:3000/api/v1/agent/state \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-123",
    "status": "failed",
    "error": "Database connection timeout"
  }'
```

---

### Get State

**Endpoint:** `GET /api/v1/agent/state/:agentId`

Retrieves the current state of a specific agent.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `agentId` | The unique identifier of the agent |

#### Response

```json
{
  "agentId": "agent-123",
  "state": {
    "agentId": "agent-123",
    "status": "running",
    "progress": 75,
    "metadata": {
      "taskType": "data-processing"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:45:00.000Z"
  },
  "ttl": 82800
}
```

#### Example (curl)

```bash
curl http://localhost:3000/api/v1/agent/state/agent-123
```

#### Example (JavaScript)

```javascript
async function getAgentState(agentId) {
  const response = await fetch(
    `http://localhost:3000/api/v1/agent/state/${agentId}`
  );
  
  if (response.status === 404) {
    throw new Error('Agent state not found');
  }
  
  return await response.json();
}

const { state, ttl } = await getAgentState('agent-123');
console.log(`Status: ${state.status}, Progress: ${state.progress}%`);
console.log(`TTL: ${ttl} seconds remaining`);
```

#### Error Response (404)

```json
{
  "error": {
    "code": "STATE_NOT_FOUND",
    "message": "Agent state not found for agentId: agent-123"
  }
}
```

---

### Retry Failed Task

**Endpoint:** `POST /api/v1/agent/state/:agentId/retry`

Retries a failed agent task by resetting it to pending state.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `agentId` | The unique identifier of the agent |

#### Behavior

1. Validates task status is "failed"
2. Checks retry count against max retries
3. Increments retry counter
4. Resets status to "pending"
5. Preserves error in error history
6. Resets progress to 0

#### Response

```json
{
  "agentId": "agent-123",
  "state": {
    "agentId": "agent-123",
    "status": "pending",
    "progress": 0,
    "retryCount": 1,
    "maxRetries": 3,
    "retriedAt": "2024-01-15T11:00:00.000Z",
    "errorHistory": [
      {
        "error": "Database connection timeout",
        "failedAt": "2024-01-15T10:50:00.000Z",
        "retryNumber": 0
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "retryCount": 1,
  "maxRetries": 3,
  "retriesRemaining": 2
}
```

#### Example (curl)

```bash
curl -X POST http://localhost:3000/api/v1/agent/state/agent-123/retry
```

#### Example (JavaScript)

```javascript
async function retryFailedTask(agentId) {
  const response = await fetch(
    `http://localhost:3000/api/v1/agent/state/${agentId}/retry`,
    { method: 'POST' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
}

try {
  const result = await retryFailedTask('agent-123');
  console.log(`Retry ${result.retryCount}/${result.maxRetries}`);
  console.log(`Retries remaining: ${result.retriesRemaining}`);
} catch (error) {
  console.error('Retry failed:', error.message);
}
```

#### Error Responses

**Invalid State (400)**
```json
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot retry task with status: running. Only failed tasks can be retried."
  }
}
```

**Max Retries Exceeded (400)**
```json
{
  "error": {
    "code": "MAX_RETRIES_EXCEEDED",
    "message": "Maximum retry limit (3) has been reached for this task."
  }
}
```

---

### List All States

**Endpoint:** `GET /api/v1/agent/states`

Lists all agent states with optional filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status (pending, running, completed, failed, cancelled) |
| `limit` | number | 100 | Maximum number of results |
| `offset` | number | 0 | Number of results to skip |

#### Response

```json
{
  "states": [
    {
      "agentId": "agent-123",
      "status": "running",
      "progress": 75,
      "retryCount": 0,
      "maxRetries": 3,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:45:00.000Z"
    },
    {
      "agentId": "agent-456",
      "status": "completed",
      "progress": 100,
      "retryCount": 1,
      "maxRetries": 3,
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T09:30:00.000Z",
      "completedAt": "2024-01-15T09:30:00.000Z"
    }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

#### Example: List All States (curl)

```bash
curl http://localhost:3000/api/v1/agent/states
```

#### Example: Filter by Status (curl)

```bash
# Get only running tasks
curl "http://localhost:3000/api/v1/agent/states?status=running"

# Get failed tasks
curl "http://localhost:3000/api/v1/agent/states?status=failed"
```

#### Example: Pagination (curl)

```bash
# Get first 10 results
curl "http://localhost:3000/api/v1/agent/states?limit=10&offset=0"

# Get next 10 results
curl "http://localhost:3000/api/v1/agent/states?limit=10&offset=10"
```

#### Example (JavaScript)

```javascript
async function listAgentStates(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(
    `http://localhost:3000/api/v1/agent/states?${params}`
  );
  
  return await response.json();
}

// Get all running agents
const running = await listAgentStates({ status: 'running' });
console.log(`${running.total} agents currently running`);

// Get first page of failed tasks
const failed = await listAgentStates({ 
  status: 'failed',
  limit: 20,
  offset: 0
});
```

---

### Delete State

**Endpoint:** `DELETE /api/v1/agent/state/:agentId`

Permanently deletes an agent state.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `agentId` | The unique identifier of the agent |

#### Response

```json
{
  "agentId": "agent-123",
  "deleted": true
}
```

#### Example (curl)

```bash
curl -X DELETE http://localhost:3000/api/v1/agent/state/agent-123
```

#### Example (JavaScript)

```javascript
async function deleteAgentState(agentId) {
  const response = await fetch(
    `http://localhost:3000/api/v1/agent/state/${agentId}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete agent state');
  }
  
  return await response.json();
}

await deleteAgentState('agent-123');
console.log('Agent state deleted successfully');
```

#### Error Response (404)

```json
{
  "error": {
    "code": "STATE_NOT_FOUND",
    "message": "Agent state not found for agentId: agent-123"
  }
}
```

---

## State Transitions

### Valid State Transitions

```
pending → running
pending → cancelled
running → completed
running → failed
running → cancelled
failed → pending (via retry)
```

### Invalid State Transitions

These transitions are NOT automatically prevented but should be avoided:

```
completed → running  ❌ (completed tasks should not be restarted)
completed → failed   ❌ (illogical state change)
cancelled → running  ❌ (cancelled tasks should not auto-resume)
```

### State Transition Example

```javascript
// Complete workflow example
async function executeTask(agentId, taskFn) {
  try {
    // 1. Create initial state
    await updateState(agentId, { status: 'pending' });
    
    // 2. Start execution
    await updateState(agentId, { status: 'running', progress: 0 });
    
    // 3. Update progress during execution
    await updateState(agentId, { status: 'running', progress: 33 });
    await taskFn(); // Do work
    await updateState(agentId, { status: 'running', progress: 66 });
    
    // 4. Complete
    await updateState(agentId, { status: 'completed', progress: 100 });
    
  } catch (error) {
    // 5. Handle failure
    await updateState(agentId, { 
      status: 'failed', 
      error: error.message 
    });
    throw error;
  }
}

async function updateState(agentId, updates) {
  return await fetch('http://localhost:3000/api/v1/agent/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, ...updates })
  }).then(r => r.json());
}
```

---

## Retry Logic

### Automatic Retry Mechanism

The retry system provides fault tolerance for transient failures.

#### Key Features

1. **Configurable Retry Limit**: Default 3 retries, adjustable per task
2. **Error History**: Preserves all previous errors
3. **Retry Counter**: Tracks number of attempts made
4. **Automatic Reset**: Resets progress and status on retry

#### Retry Flow

```
┌────────┐
│ FAILED │
└───┬────┘
    │
    ├─ Check retry count < maxRetries?
    │
    ├─ YES ─> Increment retryCount
    │         Reset to PENDING
    │         Reset progress to 0
    │         Save error to errorHistory
    │
    └─ NO ──> Return error:
              MAX_RETRIES_EXCEEDED
```

#### Example: Implementing Retry Logic

```javascript
async function executeWithRetry(agentId, taskFn, maxRetries = 3) {
  // Create initial state
  await fetch('http://localhost:3000/api/v1/agent/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      status: 'pending',
      metadata: { maxRetries }
    })
  });
  
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      // Update to running
      await fetch('http://localhost:3000/api/v1/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          status: 'running'
        })
      });
      
      // Execute task
      await taskFn();
      
      // Mark as completed
      await fetch('http://localhost:3000/api/v1/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          status: 'completed',
          progress: 100
        })
      });
      
      return; // Success!
      
    } catch (error) {
      // Mark as failed
      await fetch('http://localhost:3000/api/v1/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          status: 'failed',
          error: error.message
        })
      });
      
      if (retryCount < maxRetries) {
        // Trigger retry
        const retryResponse = await fetch(
          `http://localhost:3000/api/v1/agent/state/${agentId}/retry`,
          { method: 'POST' }
        );
        
        if (retryResponse.ok) {
          retryCount++;
          console.log(`Retry ${retryCount}/${maxRetries}...`);
          continue;
        }
      }
      
      throw new Error(`Task failed after ${retryCount} retries: ${error.message}`);
    }
  }
}
```

#### Example: Manual Retry with Exponential Backoff

```javascript
async function retryWithBackoff(agentId, delayMs = 1000) {
  const response = await fetch(
    `http://localhost:3000/api/v1/agent/state/${agentId}/retry`,
    { method: 'POST' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const { retryCount } = await response.json();
  
  // Exponential backoff: 1s, 2s, 4s, 8s...
  const delay = delayMs * Math.pow(2, retryCount - 1);
  
  console.log(`Waiting ${delay}ms before retry ${retryCount}...`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return retryCount;
}
```

---

## TTL and Garbage Collection

### Time-To-Live (TTL)

Agent states automatically expire after a specified time period to prevent Redis memory bloat.

#### Default Configuration

- **Default TTL**: 86,400 seconds (24 hours)
- **Configurable**: Can be set per state via the `ttl` parameter

#### How TTL Works

1. When a state is created/updated, Redis sets an expiration timer
2. After TTL expires, Redis automatically deletes the key
3. The state index is cleaned up when listing states

#### Setting Custom TTL

```javascript
// Create state with 1 hour TTL
await fetch('http://localhost:3000/api/v1/agent/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'short-lived-task',
    status: 'pending',
    ttl: 3600  // 1 hour in seconds
  })
});

// Create state with 7 days TTL
await fetch('http://localhost:3000/api/v1/agent/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'long-running-task',
    status: 'pending',
    ttl: 604800  // 7 days in seconds
  })
});
```

#### Checking Remaining TTL

```bash
curl http://localhost:3000/api/v1/agent/state/agent-123
```

Response includes remaining TTL:
```json
{
  "agentId": "agent-123",
  "state": { ... },
  "ttl": 82800  // Seconds remaining (23 hours)
}
```

#### TTL Best Practices

| Task Duration | Recommended TTL | Reason |
|--------------|----------------|---------|
| < 1 hour | 7200s (2 hours) | Short-lived tasks don't need long retention |
| 1-24 hours | 86400s (24 hours) | Default value, good for most cases |
| > 24 hours | 604800s (7 days) | Long-running tasks need extended tracking |
| Critical tasks | 2592000s (30 days) | Important audit trail |

### Garbage Collection

#### Automatic Cleanup

1. **TTL Expiration**: Redis automatically removes expired keys
2. **Index Cleanup**: List endpoint removes stale entries from index
3. **Manual Deletion**: Use DELETE endpoint for immediate removal

#### Monitoring Expired States

```javascript
// Get all states and check for near-expiration
async function getExpiringStates(thresholdSeconds = 3600) {
  const response = await fetch('http://localhost:3000/api/v1/agent/states');
  const { states } = await response.json();
  
  const expiring = [];
  
  for (const state of states) {
    const stateDetail = await fetch(
      `http://localhost:3000/api/v1/agent/state/${state.agentId}`
    ).then(r => r.json());
    
    if (stateDetail.ttl < thresholdSeconds) {
      expiring.push({
        agentId: state.agentId,
        ttl: stateDetail.ttl,
        expiresIn: `${Math.floor(stateDetail.ttl / 60)} minutes`
      });
    }
  }
  
  return expiring;
}

// Find states expiring in next hour
const expiring = await getExpiringStates(3600);
console.log(`${expiring.length} states expiring soon`);
```

---

## Best Practices

### 1. Use Meaningful Agent IDs

```javascript
// ✅ GOOD: Descriptive, hierarchical IDs
const agentId = `user:123:upload:abc-def-ghi`;
const agentId = `pipeline:etl:stage-2:20240115`;

// ❌ BAD: Generic, hard to track
const agentId = `agent1`;
const agentId = `task`;
```

### 2. Update Progress Regularly

```javascript
// ✅ GOOD: Regular progress updates
async function processItems(agentId, items) {
  const total = items.length;
  
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    
    // Update every 10%
    if (i % Math.ceil(total / 10) === 0) {
      await updateState(agentId, {
        status: 'running',
        progress: Math.floor((i / total) * 100)
      });
    }
  }
}

// ❌ BAD: No progress updates
async function processItems(items) {
  for (const item of items) {
    await processItem(item);
  }
}
```

### 3. Always Handle Failures

```javascript
// ✅ GOOD: Proper error handling
async function executeTask(agentId) {
  try {
    await updateState(agentId, { status: 'running' });
    await doWork();
    await updateState(agentId, { status: 'completed', progress: 100 });
  } catch (error) {
    await updateState(agentId, { 
      status: 'failed', 
      error: error.message 
    });
    throw error;
  }
}

// ❌ BAD: No failure tracking
async function executeTask(agentId) {
  await updateState(agentId, { status: 'running' });
  await doWork();
  await updateState(agentId, { status: 'completed' });
}
```

### 4. Use Metadata for Context

```javascript
// ✅ GOOD: Rich metadata
await createState({
  agentId: 'data-import-123',
  status: 'pending',
  metadata: {
    taskType: 'data-import',
    source: 's3://bucket/data.csv',
    destination: 'postgres://db/table',
    rowCount: 10000,
    priority: 'high',
    owner: 'user@example.com'
  }
});

// ❌ BAD: No context
await createState({
  agentId: 'task-123',
  status: 'pending'
});
```

### 5. Set Appropriate TTLs

```javascript
// ✅ GOOD: TTL matches task duration
const shortTask = {
  agentId: 'quick-check',
  ttl: 3600  // 1 hour for quick tasks
};

const longTask = {
  agentId: 'weekly-report',
  ttl: 604800  // 7 days for weekly jobs
};

// ❌ BAD: Same TTL for everything
const task = {
  agentId: 'any-task',
  ttl: 86400  // Always 24 hours
};
```

### 6. Clean Up Completed States

```javascript
// ✅ GOOD: Delete after processing
async function processAndCleanup(agentId) {
  const result = await processTask(agentId);
  
  // Store result elsewhere if needed
  await saveResult(result);
  
  // Clean up state
  await fetch(`http://localhost:3000/api/v1/agent/state/${agentId}`, {
    method: 'DELETE'
  });
}

// ⚠️ OK: Let TTL handle cleanup (for audit trail)
async function processWithAudit(agentId) {
  await processTask(agentId);
  // State expires automatically after TTL
}
```

### 7. Implement Health Checks

```javascript
// Monitor agent health
async function checkAgentHealth() {
  const response = await fetch('http://localhost:3000/api/v1/agent/states');
  const { states } = await response.json();
  
  const health = {
    total: states.length,
    running: states.filter(s => s.status === 'running').length,
    failed: states.filter(s => s.status === 'failed').length,
    stale: states.filter(s => {
      const age = Date.now() - new Date(s.updatedAt);
      return s.status === 'running' && age > 3600000; // 1 hour
    }).length
  };
  
  if (health.stale > 0) {
    console.warn(`${health.stale} agents appear stale`);
  }
  
  return health;
}
```

### 8. Validate Agent IDs

```javascript
// ✅ GOOD: Validate before creating
function isValidAgentId(agentId) {
  if (!agentId || typeof agentId !== 'string') return false;
  if (agentId.length > 256) return false;
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(agentId)) return false;
  return true;
}

if (isValidAgentId(userInput)) {
  await createState({ agentId: userInput, status: 'pending' });
}

// ❌ BAD: No validation
await createState({ agentId: userInput, status: 'pending' });
```

---

## Use Cases

### 1. Long-Running Data Processing

```javascript
async function processLargeDataset(datasetId) {
  const agentId = `dataset:${datasetId}:processing`;
  const chunks = await loadDatasetChunks(datasetId);
  
  // Create state
  await fetch('http://localhost:3000/api/v1/agent/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      status: 'running',
      metadata: {
        datasetId,
        totalChunks: chunks.length,
        startedAt: new Date().toISOString()
      },
      ttl: 604800  // 7 days
    })
  });
  
  // Process chunks
  for (let i = 0; i < chunks.length; i++) {
    try {
      await processChunk(chunks[i]);
      
      // Update progress
      const progress = Math.floor(((i + 1) / chunks.length) * 100);
      await fetch('http://localhost:3000/api/v1/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          status: 'running',
          progress,
          metadata: {
            processedChunks: i + 1,
            totalChunks: chunks.length
          }
        })
      });
    } catch (error) {
      // Mark failed and let retry mechanism handle it
      await fetch('http://localhost:3000/api/v1/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          status: 'failed',
          error: error.message
        })
      });
      throw error;
    }
  }
  
  // Complete
  await fetch('http://localhost:3000/api/v1/agent/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      status: 'completed',
      progress: 100
    })
  });
}
```

### 2. Multi-Agent Coordination

```javascript
// Coordinator that spawns multiple agents
async function coordinateMultiAgentTask(taskId) {
  const coordinatorId = `coordinator:${taskId}`;
  const agentIds = [];
  
  // Create coordinator state
  await createState({
    agentId: coordinatorId,
    status: 'running',
    metadata: { role: 'coordinator', taskId }
  });
  
  // Spawn worker agents
  const workers = ['worker-1', 'worker-2', 'worker-3'];
  for (const worker of workers) {
    const agentId = `${taskId}:${worker}`;
    agentIds.push(agentId);
    
    await createState({
      agentId,
      status: 'pending',
      metadata: { role: 'worker', coordinator: coordinatorId }
    });
    
    // Start worker (async)
    startWorker(agentId);
  }
  
  // Monitor workers
  while (true) {
    const states = await Promise.all(
      agentIds.map(id => getState(id))
    );
    
    const completed = states.filter(s => s.state.status === 'completed').length;
    const failed = states.filter(s => s.state.status === 'failed').length;
    
    // Update coordinator progress
    await updateState(coordinatorId, {
      status: 'running',
      progress: Math.floor((completed / agentIds.length) * 100),
      metadata: {
        completed,
        failed,
        total: agentIds.length
      }
    });
    
    // Check if all done
    if (completed + failed === agentIds.length) {
      break;
    }
    
    await sleep(5000);
  }
  
  // Mark coordinator complete
  await updateState(coordinatorId, {
    status: 'completed',
    progress: 100
  });
}
```

### 3. Workflow with Checkpoints

```javascript
async function executeWorkflowWithCheckpoints(workflowId) {
  const agentId = `workflow:${workflowId}`;
  
  const checkpoints = [
    { name: 'validate', weight: 10 },
    { name: 'extract', weight: 30 },
    { name: 'transform', weight: 40 },
    { name: 'load', weight: 20 }
  ];
  
  await createState({
    agentId,
    status: 'running',
    metadata: {
      workflow: 'ETL',
      checkpoints: checkpoints.map(c => c.name)
    }
  });
  
  let cumulativeProgress = 0;
  
  for (const checkpoint of checkpoints) {
    try {
      // Execute checkpoint
      await executeCheckpoint(checkpoint.name);
      
      // Update progress
      cumulativeProgress += checkpoint.weight;
      await updateState(agentId, {
        status: 'running',
        progress: cumulativeProgress,
        metadata: {
          currentCheckpoint: checkpoint.name,
          completedCheckpoints: checkpoints
            .slice(0, checkpoints.indexOf(checkpoint) + 1)
            .map(c => c.name)
        }
      });
    } catch (error) {
      // Save checkpoint for resume
      await updateState(agentId, {
        status: 'failed',
        error: `Failed at checkpoint: ${checkpoint.name}`,
        metadata: {
          failedCheckpoint: checkpoint.name,
          canResume: true
        }
      });
      throw error;
    }
  }
  
  await updateState(agentId, {
    status: 'completed',
    progress: 100
  });
}
```

### 4. Rate-Limited API Client

```javascript
async function rateLimitedApiCalls(agentId, endpoints) {
  const RATE_LIMIT = 100; // requests per minute
  const DELAY = 60000 / RATE_LIMIT;
  
  await createState({
    agentId,
    status: 'running',
    metadata: {
      totalRequests: endpoints.length,
      rateLimit: RATE_LIMIT
    }
  });
  
  for (let i = 0; i < endpoints.length; i++) {
    try {
      await fetch(endpoints[i]);
      
      // Update every 10 requests
      if (i % 10 === 0) {
        await updateState(agentId, {
          status: 'running',
          progress: Math.floor((i / endpoints.length) * 100),
          metadata: {
            processed: i,
            total: endpoints.length,
            remaining: endpoints.length - i
          }
        });
      }
      
      // Rate limiting delay
      await sleep(DELAY);
      
    } catch (error) {
      await updateState(agentId, {
        status: 'failed',
        error: `Failed at request ${i}: ${error.message}`
      });
      
      // Auto-retry
      await retryTask(agentId);
      break;
    }
  }
  
  await updateState(agentId, {
    status: 'completed',
    progress: 100
  });
}
```

### 5. Background Job Queue

```javascript
// Job queue processor
class JobQueue {
  constructor() {
    this.processing = false;
  }
  
  async start() {
    this.processing = true;
    
    while (this.processing) {
      try {
        // Get pending jobs
        const response = await fetch(
          'http://localhost:3000/api/v1/agent/states?status=pending&limit=1'
        );
        const { states } = await response.json();
        
        if (states.length === 0) {
          await sleep(5000);
          continue;
        }
        
        const job = states[0];
        
        // Mark as running
        await updateState(job.agentId, { status: 'running' });
        
        // Execute
        try {
          await this.executeJob(job);
          
          await updateState(job.agentId, {
            status: 'completed',
            progress: 100
          });
        } catch (error) {
          await updateState(job.agentId, {
            status: 'failed',
            error: error.message
          });
          
          // Auto-retry if possible
          try {
            await retryTask(job.agentId);
          } catch (retryError) {
            console.error('Max retries exceeded:', job.agentId);
          }
        }
      } catch (error) {
        console.error('Queue processing error:', error);
        await sleep(5000);
      }
    }
  }
  
  stop() {
    this.processing = false;
  }
  
  async executeJob(job) {
    // Job execution logic
    console.log('Executing job:', job.agentId);
    // ...
  }
}

// Usage
const queue = new JobQueue();
queue.start();
```

---

## Related Documentation

- [API Reference](./API-Reference.md) - Complete API documentation
- [Error Codes Reference](./Error-Codes-Reference.md) - All error codes and handling
- [Redis Configuration](./Configuration-Reference.md#redis) - Redis setup and configuration
- [Supervisor API](./API-Reference.md#supervisor-api) - Task queue integration

---

## Summary

The Agent State Management API provides:

✅ **Reliability**: Automatic retry mechanism with error history  
✅ **Visibility**: Real-time progress tracking and status monitoring  
✅ **Scalability**: Redis-backed storage for high throughput  
✅ **Simplicity**: RESTful API with clear semantics  
✅ **Maintenance**: TTL-based automatic cleanup  

Use it to build robust, observable, and maintainable agent systems.
