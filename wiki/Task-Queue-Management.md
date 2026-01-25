# Task Queue Management

> **Complete Guide to Task Queue System**  
> File-based task queue with Redis-backed state management for asynchronous task processing

**Last Updated:** 2026-01-25  
**Version:** 1.1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Queue File Format](#queue-file-format)
3. [API Endpoints](#api-endpoints)
4. [Queue Processing Workflow](#queue-processing-workflow)
5. [Integration with GitHub Actions](#integration-with-github-actions)
6. [Best Practices](#best-practices)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Task Queue System?

The Task Queue System is a lightweight, file-based queue management solution that enables asynchronous task processing with persistent state tracking. It combines:

- **File-based Queue**: Simple text file (`task-queue.txt`) for task persistence
- **Redis State Management**: Tracks execution status, progress, and retry logic
- **RESTful API**: Full CRUD operations for queue management
- **GitHub Actions Integration**: Automated processing via scheduled workflows

### Key Features

- ✅ **Simple Text Format**: Human-readable queue file
- ✅ **Persistent State**: Redis-backed state tracking with TTL
- ✅ **Automatic Retry**: Configurable retry logic for failed tasks
- ✅ **Progress Tracking**: Real-time progress updates per task
- ✅ **FIFO Processing**: First-in, first-out queue processing
- ✅ **API-Driven**: Full control via REST API
- ✅ **GitHub Actions Ready**: Automated processing workflows

### Architecture

```
┌─────────────────┐
│  task-queue.txt │  ← File-based queue storage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Server    │  ← Express.js REST API
│   (index.js)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis Store    │  ← State & metadata storage
└─────────────────┘
```

---

## Queue File Format

### File Location

```
/home/runner/work/code-cloud-agents/code-cloud-agents/task-queue.txt
```

### Format Structure

The queue file uses a simple line-based format:

```text
# Task Queue
# Eine Task pro Zeile
# GitHub Actions arbeitet alle 4h die nächste Task ab
# Queue processing started - Sun Jan 25 21:06:34 CET 2026

Task description line 1
Task description line 2
Task description line 3
```

### Format Rules

1. **One Task Per Line**: Each non-empty line is a task
2. **Comments Start with #**: Lines beginning with `#` are ignored
3. **Empty Lines Ignored**: Blank lines are skipped
4. **UTF-8 Encoding**: File must be UTF-8 encoded
5. **No Line Length Limit**: Task descriptions can be any length
6. **FIFO Order**: First line = First task to process

### Example Queue File

```text
# Task Queue
# Eine Task pro Zeile
# GitHub Actions arbeitet alle 4h die nächste Task ab
# Queue processing started - Sun Jan 25 21:06:34 CET 2026

Create user authentication module with JWT
Add rate limiting to all API endpoints
Write integration tests for file operations API
Update API documentation with new endpoints
Refactor Redis connection handling for better error recovery
```

---

## API Endpoints

### Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

### Authentication

Currently no authentication required. Future versions will support:
```http
Authorization: Bearer <api_key>
```

---

### 1. Get All Tasks in Queue

Get the complete list of tasks with their current state.

```http
GET /api/v1/supervisor/queue
```

#### Response 200

```json
{
  "tasks": [
    {
      "index": 0,
      "task": "Create user authentication module with JWT",
      "taskId": "queue:0:Q3JlYXRlIHVzZXI",
      "state": {
        "agentId": "queue:0:Q3JlYXRlIHVzZXI",
        "status": "running",
        "progress": 45,
        "metadata": {
          "task": "Create user authentication module with JWT",
          "queueIndex": 0,
          "processedAt": "2026-01-25T12:00:00Z"
        },
        "retryCount": 0,
        "maxRetries": 3,
        "createdAt": "2026-01-25T12:00:00Z",
        "updatedAt": "2026-01-25T12:15:00Z"
      }
    },
    {
      "index": 1,
      "task": "Add rate limiting to all API endpoints",
      "taskId": "queue:1:QWRkIHJhdGUgbG",
      "state": null
    }
  ],
  "total": 2
}
```

#### cURL Example

```bash
curl http://localhost:3000/api/v1/supervisor/queue
```

#### JavaScript Example

```javascript
// Using fetch API
const response = await fetch('http://localhost:3000/api/v1/supervisor/queue');
const data = await response.json();

console.log(`Total tasks: ${data.total}`);
data.tasks.forEach((task, index) => {
  console.log(`${index}: ${task.task}`);
  if (task.state) {
    console.log(`   Status: ${task.state.status} (${task.state.progress}%)`);
  }
});
```

---

### 2. Add Task to Queue

Add a new task to the queue at a specific position or at the end.

```http
POST /api/v1/supervisor/queue
Content-Type: application/json

{
  "task": "Create login page with React",
  "position": 0
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | Yes | Task description (non-empty) |
| `position` | number | No | Insert position (0-based index). If omitted, adds to end |

#### Response 200

```json
{
  "task": "Create login page with React",
  "position": 0,
  "total": 3
}
```

#### Response 400

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Task cannot be empty or whitespace only"
  }
}
```

#### cURL Examples

```bash
# Add task to end of queue
curl -X POST http://localhost:3000/api/v1/supervisor/queue \
  -H "Content-Type: application/json" \
  -d '{"task": "Create login page with React"}'

# Add task to beginning of queue (high priority)
curl -X POST http://localhost:3000/api/v1/supervisor/queue \
  -H "Content-Type: application/json" \
  -d '{"task": "Fix critical security bug", "position": 0}'
```

#### JavaScript Example

```javascript
async function addTask(task, position = null) {
  const body = { task };
  if (position !== null) body.position = position;
  
  const response = await fetch('http://localhost:3000/api/v1/supervisor/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  console.log(`Task added at position ${data.position}`);
  return data;
}

// Add to end
await addTask('Create user dashboard');

// Add as high priority
await addTask('Fix production bug', 0);
```

---

### 3. Remove Task from Queue

Remove a task at a specific index from the queue.

```http
DELETE /api/v1/supervisor/queue/:index
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | number | 0-based index of task to remove |

#### Response 200

```json
{
  "task": "Create login page with React",
  "index": 2,
  "total": 4
}
```

#### Response 404

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "No task at index 5"
  }
}
```

#### cURL Example

```bash
# Remove task at index 2
curl -X DELETE http://localhost:3000/api/v1/supervisor/queue/2
```

#### JavaScript Example

```javascript
async function removeTask(index) {
  const response = await fetch(
    `http://localhost:3000/api/v1/supervisor/queue/${index}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  console.log(`Removed: ${data.task}`);
  console.log(`Remaining tasks: ${data.total}`);
  return data;
}

await removeTask(2);
```

---

### 4. Process Next Task

Mark the first task in the queue as running and create its execution state.

```http
POST /api/v1/supervisor/queue/process
```

#### Response 200

```json
{
  "task": "Create user authentication module with JWT",
  "taskId": "queue:0:Q3JlYXRlIHVzZXI",
  "state": {
    "agentId": "queue:0:Q3JlYXRlIHVzZXI",
    "status": "running",
    "progress": 0,
    "metadata": {
      "task": "Create user authentication module with JWT",
      "queueIndex": 0,
      "processedAt": "2026-01-25T12:00:00Z"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2026-01-25T12:00:00Z",
    "updatedAt": "2026-01-25T12:00:00Z"
  },
  "message": "Task marked as running. Call completion endpoint when done."
}
```

#### Response 404

```json
{
  "error": {
    "code": "QUEUE_EMPTY",
    "message": "No tasks in queue"
  }
}
```

#### cURL Example

```bash
curl -X POST http://localhost:3000/api/v1/supervisor/queue/process
```

#### JavaScript Example

```javascript
async function processNextTask() {
  const response = await fetch(
    'http://localhost:3000/api/v1/supervisor/queue/process',
    { method: 'POST' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    if (error.error.code === 'QUEUE_EMPTY') {
      console.log('No tasks to process');
      return null;
    }
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  console.log(`Processing: ${data.task}`);
  console.log(`Task ID: ${data.taskId}`);
  
  return data;
}

const task = await processNextTask();
if (task) {
  // Execute the task
  await executeTask(task);
}
```

---

### 5. Complete Task

Mark a task as completed or failed and optionally remove it from the queue.

```http
POST /api/v1/supervisor/queue/complete
Content-Type: application/json

{
  "taskId": "queue:0:Q3JlYXRlIHVzZXI",
  "status": "completed"
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task ID from process response |
| `status` | string | Yes | `"completed"` or `"failed"` |
| `error` | string | No | Error message (required if status is "failed") |

#### Response 200

```json
{
  "taskId": "queue:0:Q3JlYXRlIHVzZXI",
  "state": {
    "agentId": "queue:0:Q3JlYXRlIHVzZXI",
    "status": "completed",
    "progress": 100,
    "metadata": {
      "task": "Create user authentication module with JWT",
      "queueIndex": 0,
      "processedAt": "2026-01-25T12:00:00Z"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2026-01-25T12:00:00Z",
    "updatedAt": "2026-01-25T12:30:00Z",
    "completedAt": "2026-01-25T12:30:00Z"
  },
  "queueLength": 4
}
```

#### Response 404

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found: queue:0:Q3JlYXRlIHVzZXI"
  }
}
```

#### cURL Examples

```bash
# Mark as completed
curl -X POST http://localhost:3000/api/v1/supervisor/queue/complete \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "queue:0:Q3JlYXRlIHVzZXI",
    "status": "completed"
  }'

# Mark as failed
curl -X POST http://localhost:3000/api/v1/supervisor/queue/complete \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "queue:0:Q3JlYXRlIHVzZXI",
    "status": "failed",
    "error": "Build failed: missing dependencies"
  }'
```

#### JavaScript Example

```javascript
async function completeTask(taskId, success, error = null) {
  const body = {
    taskId,
    status: success ? 'completed' : 'failed'
  };
  
  if (!success && error) {
    body.error = error;
  }
  
  const response = await fetch(
    'http://localhost:3000/api/v1/supervisor/queue/complete',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  
  const data = await response.json();
  console.log(`Task ${data.state.status}`);
  if (data.queueLength !== null) {
    console.log(`Remaining tasks: ${data.queueLength}`);
  }
  
  return data;
}

// Success
await completeTask(taskId, true);

// Failure
await completeTask(taskId, false, 'Build failed: syntax error');
```

---

### 6. Get Supervisor Status

Get overall queue status including running tasks.

```http
GET /api/v1/supervisor/status
```

#### Response 200

```json
{
  "queueLength": 5,
  "runningTasks": 1,
  "tasks": [
    {
      "agentId": "queue:0:Q3JlYXRlIHVzZXI",
      "status": "running",
      "progress": 65,
      "metadata": {
        "task": "Create user authentication module with JWT",
        "queueIndex": 0,
        "processedAt": "2026-01-25T12:00:00Z"
      },
      "retryCount": 0,
      "maxRetries": 3,
      "createdAt": "2026-01-25T12:00:00Z",
      "updatedAt": "2026-01-25T12:20:00Z"
    }
  ]
}
```

#### cURL Example

```bash
curl http://localhost:3000/api/v1/supervisor/status
```

#### JavaScript Example

```javascript
async function getSupervisorStatus() {
  const response = await fetch('http://localhost:3000/api/v1/supervisor/status');
  const data = await response.json();
  
  console.log(`Queue Length: ${data.queueLength}`);
  console.log(`Running Tasks: ${data.runningTasks}`);
  
  data.tasks.forEach(task => {
    console.log(`  - ${task.metadata.task}`);
    console.log(`    Progress: ${task.progress}%`);
  });
  
  return data;
}

await getSupervisorStatus();
```

---

## Queue Processing Workflow

### Complete Processing Flow

```
┌──────────────────┐
│   Add Task       │
│   (POST /queue)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Task in Queue   │ ← Waiting in task-queue.txt
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Process Next    │
│  (POST /process) │ ← Create state: "running"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Execute Task    │ ← External processor (GitHub Actions, etc.)
│  Update Progress │ ← POST /agent/state (optional)
└────────┬─────────┘
         │
         ▼
    ┌───┴───┐
    │Success│
    │   ?   │
    └───┬───┘
        │
    ┌───┴────────┐
    │            │
    ▼            ▼
┌────────┐  ┌────────┐
│Success │  │ Failed │
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌────────────────────┐
│   Complete Task    │
│  (POST /complete)  │
└────────┬───────────┘
         │
         ▼
    ┌────┴────┐
    │Success? │
    └────┬────┘
         │
    ┌────┴─────────┐
    │              │
    ▼              ▼
┌────────┐    ┌────────┐
│ Remove │    │ Keep & │
│ from   │    │ Retry? │
│ Queue  │    └───┬────┘
└────────┘        │
                  ▼
            ┌──────────┐
            │ Retry if │
            │ < maxRet │
            └──────────┘
```

### State Lifecycle

```javascript
// 1. Task is queued
// State: None (only in file)

// 2. Task processing starts
{
  status: "running",
  progress: 0,
  retryCount: 0
}

// 3. Progress updates (optional)
{
  status: "running",
  progress: 50,
  retryCount: 0
}

// 4a. Task succeeds
{
  status: "completed",
  progress: 100,
  completedAt: "2026-01-25T12:30:00Z"
}
// → Removed from queue

// 4b. Task fails
{
  status: "failed",
  progress: 50,
  lastError: "Build failed",
  failedAt: "2026-01-25T12:30:00Z",
  retryCount: 0
}
// → Kept in queue, can retry
```

### Retry Logic

Tasks that fail can be automatically retried:

1. **Maximum Retries**: 3 by default (configurable)
2. **Retry Tracking**: `retryCount` incremented on each retry
3. **Error History**: Previous errors stored in `errorHistory`
4. **Manual Retry**: Use Agent State Management API `/api/v1/agent/state/:agentId/retry`

---

## Integration with GitHub Actions

### Workflow Setup

Create a workflow file at `.github/workflows/process-queue.yml`:

```yaml
name: Process Task Queue

on:
  schedule:
    # Run every 4 hours
    - cron: '0 */4 * * *'
  workflow_dispatch:
    # Allow manual triggering

jobs:
  process-task:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start Redis
        uses: supercharge/redis-github-action@1.4.0
        with:
          redis-version: 7
      
      - name: Start API server
        run: |
          npm start &
          sleep 5
        env:
          PORT: 3000
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      
      - name: Process next task
        id: process
        run: |
          RESPONSE=$(curl -X POST http://localhost:3000/api/v1/supervisor/queue/process)
          echo "response=$RESPONSE" >> $GITHUB_OUTPUT
          
          TASK=$(echo $RESPONSE | jq -r '.task')
          TASK_ID=$(echo $RESPONSE | jq -r '.taskId')
          
          echo "task=$TASK" >> $GITHUB_OUTPUT
          echo "taskId=$TASK_ID" >> $GITHUB_OUTPUT
          
          if [ "$TASK" = "null" ]; then
            echo "No tasks in queue"
            exit 0
          fi
      
      - name: Execute task
        if: steps.process.outputs.task != 'null'
        id: execute
        run: |
          # Your task execution logic here
          echo "Executing: ${{ steps.process.outputs.task }}"
          
          # Example: Run Aider for code generation
          # aider --message "${{ steps.process.outputs.task }}"
          
          # Set status based on success
          if [ $? -eq 0 ]; then
            echo "status=completed" >> $GITHUB_OUTPUT
          else
            echo "status=failed" >> $GITHUB_OUTPUT
            echo "error=Task execution failed" >> $GITHUB_OUTPUT
          fi
      
      - name: Complete task
        if: steps.process.outputs.task != 'null'
        run: |
          STATUS="${{ steps.execute.outputs.status }}"
          ERROR="${{ steps.execute.outputs.error }}"
          
          PAYLOAD=$(jq -n \
            --arg taskId "${{ steps.process.outputs.taskId }}" \
            --arg status "$STATUS" \
            --arg error "$ERROR" \
            '{taskId: $taskId, status: $status, error: $error}')
          
          curl -X POST http://localhost:3000/api/v1/supervisor/queue/complete \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD"
      
      - name: Commit and push changes
        if: steps.execute.outputs.status == 'completed'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Task completed: ${{ steps.process.outputs.task }}" || echo "No changes"
          git push
```

### Queue Update Workflow

Create a workflow to update the queue file:

```yaml
name: Add Task to Queue

on:
  workflow_dispatch:
    inputs:
      task:
        description: 'Task description'
        required: true
        type: string
      priority:
        description: 'Priority (normal/high)'
        required: false
        default: 'normal'
        type: choice
        options:
          - normal
          - high

jobs:
  add-task:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start Redis
        uses: supercharge/redis-github-action@1.4.0
        with:
          redis-version: 7
      
      - name: Start API server
        run: |
          npm start &
          sleep 5
        env:
          PORT: 3000
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      
      - name: Add task to queue
        run: |
          POSITION=""
          if [ "${{ inputs.priority }}" = "high" ]; then
            POSITION="0"
          fi
          
          PAYLOAD=$(jq -n \
            --arg task "${{ inputs.task }}" \
            --arg position "$POSITION" \
            '{task: $task} + if $position != "" then {position: ($position | tonumber)} else {} end')
          
          curl -X POST http://localhost:3000/api/v1/supervisor/queue \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD"
      
      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add task-queue.txt
          git commit -m "Add task: ${{ inputs.task }}"
          git push
```

### Manual Queue Management Script

Create `queue-task.sh` for local queue management:

```bash
#!/bin/bash
# queue-task.sh - Add tasks to queue

API_URL="${API_URL:-http://localhost:3000}"

if [ -z "$1" ]; then
  echo "Usage: ./queue-task.sh 'Task description' [position]"
  exit 1
fi

TASK="$1"
POSITION="${2:-}"

# Build JSON payload
if [ -n "$POSITION" ]; then
  PAYLOAD=$(jq -n --arg task "$TASK" --arg pos "$POSITION" \
    '{task: $task, position: ($pos | tonumber)}')
else
  PAYLOAD=$(jq -n --arg task "$TASK" '{task: $task}')
fi

# Add to queue
curl -X POST "$API_URL/api/v1/supervisor/queue" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo ""
echo "Task queued successfully!"
```

Usage:
```bash
chmod +x queue-task.sh

# Add to end
./queue-task.sh "Create login page"

# Add to beginning (high priority)
./queue-task.sh "Fix critical bug" 0
```

---

## Best Practices

### 1. Task Description Guidelines

✅ **Good Task Descriptions:**
```
Create user authentication module with JWT and bcrypt
Add rate limiting to all API endpoints (100 req/min)
Refactor Redis connection with retry logic and error handling
Write integration tests for file operations API (CRUD)
```

❌ **Poor Task Descriptions:**
```
Fix stuff
Update code
Make it better
Do the thing
```

**Rules:**
- Be specific and actionable
- Include technical details
- Mention dependencies if any
- Use imperative mood (Create, Add, Fix, Update)

### 2. Queue Management

**Priority Handling:**
```javascript
// High priority - add to front
await addTask("Fix production bug", 0);

// Normal priority - add to end
await addTask("Add feature X");

// Medium priority - insert after critical tasks
const queue = await getQueue();
const criticalCount = 3; // First 3 are critical
await addTask("Important update", criticalCount);
```

**Queue Length Monitoring:**
```javascript
// Monitor queue size
const status = await getSupervisorStatus();
if (status.queueLength > 10) {
  console.warn('Queue is getting long!');
}

// Alert on backlog
if (status.queueLength > 20) {
  // Send notification
  await notifyAdmin('Task queue has 20+ items');
}
```

### 3. Error Handling

**Graceful Failure:**
```javascript
async function processTaskSafely(taskId) {
  try {
    // Execute task
    await executeTask(taskId);
    
    // Mark as completed
    await completeTask(taskId, true);
  } catch (error) {
    console.error('Task failed:', error);
    
    // Mark as failed with error
    await completeTask(taskId, false, error.message);
    
    // Check if retry is needed
    const state = await getAgentState(taskId);
    if (state.retryCount < state.maxRetries) {
      console.log(`Task will be retried (${state.retryCount}/${state.maxRetries})`);
    } else {
      console.error('Max retries reached, manual intervention required');
      await notifyAdmin(`Task failed after ${state.maxRetries} retries: ${error.message}`);
    }
  }
}
```

### 4. Progress Tracking

**Update Progress During Execution:**
```javascript
async function executeWithProgress(taskId, task) {
  // Start
  await updateAgentState(taskId, {
    status: 'running',
    progress: 0
  });
  
  // Step 1
  await step1();
  await updateAgentState(taskId, { progress: 25 });
  
  // Step 2
  await step2();
  await updateAgentState(taskId, { progress: 50 });
  
  // Step 3
  await step3();
  await updateAgentState(taskId, { progress: 75 });
  
  // Complete
  await step4();
  await updateAgentState(taskId, { progress: 100 });
}

// Helper function
async function updateAgentState(agentId, updates) {
  const response = await fetch('http://localhost:3000/api/v1/agent/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, ...updates })
  });
  return response.json();
}
```

### 5. State Cleanup

**Automatic Cleanup with TTL:**
```javascript
// States expire after 24 hours by default
// Override TTL for longer retention
await updateAgentState(taskId, {
  status: 'completed',
  ttl: 7 * 24 * 60 * 60 // 7 days
});
```

**Manual Cleanup:**
```javascript
// Clean up old completed tasks
async function cleanupCompletedTasks() {
  const states = await fetch('http://localhost:3000/api/v1/agent/states?status=completed')
    .then(r => r.json());
  
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const state of states.states) {
    const completedAt = new Date(state.completedAt).getTime();
    if (completedAt < oneWeekAgo) {
      await fetch(`http://localhost:3000/api/v1/agent/state/${state.agentId}`, {
        method: 'DELETE'
      });
    }
  }
}
```

### 6. Concurrent Processing

**Single Worker Pattern:**
```javascript
// Ensure only one task processes at a time
let isProcessing = false;

async function processQueue() {
  if (isProcessing) {
    console.log('Already processing a task');
    return;
  }
  
  isProcessing = true;
  try {
    const task = await processNextTask();
    if (task) {
      await executeTask(task);
    }
  } finally {
    isProcessing = false;
  }
}

// Run every 5 minutes
setInterval(processQueue, 5 * 60 * 1000);
```

**Multi-Worker Pattern:**
```javascript
// Multiple workers can process different tasks
const maxWorkers = 3;

async function workerLoop(workerId) {
  while (true) {
    const status = await getSupervisorStatus();
    
    // Check if we can take more tasks
    if (status.runningTasks < maxWorkers) {
      const task = await processNextTask();
      if (task) {
        // Process in background
        executeTask(task).catch(err => {
          console.error(`Worker ${workerId} failed:`, err);
        });
      }
    }
    
    // Wait before checking again
    await sleep(10000); // 10 seconds
  }
}

// Start workers
for (let i = 0; i < maxWorkers; i++) {
  workerLoop(i);
}
```

---

## Examples

### Complete Task Processing Example

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

class TaskQueueProcessor {
  constructor() {
    this.isProcessing = false;
  }
  
  async addTask(task, highPriority = false) {
    const payload = { task };
    if (highPriority) payload.position = 0;
    
    const response = await axios.post(
      `${API_BASE}/api/v1/supervisor/queue`,
      payload
    );
    
    console.log(`Task added: ${response.data.task}`);
    return response.data;
  }
  
  async processNext() {
    if (this.isProcessing) {
      console.log('Already processing a task');
      return null;
    }
    
    this.isProcessing = true;
    
    try {
      // Get next task
      const processResponse = await axios.post(
        `${API_BASE}/api/v1/supervisor/queue/process`
      );
      
      const { task, taskId, state } = processResponse.data;
      console.log(`Processing: ${task}`);
      
      // Execute task with progress tracking
      const success = await this.executeTask(taskId, task);
      
      // Complete task
      await axios.post(
        `${API_BASE}/api/v1/supervisor/queue/complete`,
        {
          taskId,
          status: success ? 'completed' : 'failed',
          error: success ? undefined : 'Task execution failed'
        }
      );
      
      console.log(`Task ${success ? 'completed' : 'failed'}`);
      return { task, taskId, success };
      
    } catch (error) {
      if (error.response?.data?.error?.code === 'QUEUE_EMPTY') {
        console.log('Queue is empty');
        return null;
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
  
  async executeTask(taskId, task) {
    try {
      // Update: 0% - Starting
      await this.updateProgress(taskId, 0, 'Starting task');
      
      // Simulate task execution with progress updates
      await this.sleep(2000);
      await this.updateProgress(taskId, 25, 'Phase 1 complete');
      
      await this.sleep(2000);
      await this.updateProgress(taskId, 50, 'Phase 2 complete');
      
      await this.sleep(2000);
      await this.updateProgress(taskId, 75, 'Phase 3 complete');
      
      await this.sleep(2000);
      await this.updateProgress(taskId, 100, 'Task complete');
      
      return true; // Success
      
    } catch (error) {
      console.error('Task execution failed:', error);
      await this.updateProgress(taskId, null, 'Failed', error.message);
      return false; // Failure
    }
  }
  
  async updateProgress(agentId, progress, message, error = null) {
    const payload = {
      agentId,
      metadata: { lastMessage: message }
    };
    
    if (progress !== null) {
      payload.progress = progress;
    }
    
    if (error) {
      payload.status = 'failed';
      payload.error = error;
    }
    
    await axios.post(`${API_BASE}/api/v1/agent/state`, payload);
  }
  
  async getStatus() {
    const response = await axios.get(`${API_BASE}/api/v1/supervisor/status`);
    return response.data;
  }
  
  async getQueue() {
    const response = await axios.get(`${API_BASE}/api/v1/supervisor/queue`);
    return response.data;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async run() {
    console.log('Starting task queue processor...');
    
    while (true) {
      try {
        const result = await this.processNext();
        
        if (!result) {
          // No tasks, wait longer
          await this.sleep(30000); // 30 seconds
        } else {
          // Task processed, check immediately for next
          await this.sleep(1000); // 1 second
        }
        
      } catch (error) {
        console.error('Error in processing loop:', error);
        await this.sleep(10000); // Wait 10 seconds on error
      }
    }
  }
}

// Usage
const processor = new TaskQueueProcessor();

// Add some tasks
await processor.addTask('Create user authentication module');
await processor.addTask('Add rate limiting to API');
await processor.addTask('Write integration tests');

// Start processing loop
processor.run();
```

### Monitoring Dashboard Example

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
const API_BASE = 'http://localhost:3000';

app.get('/dashboard', async (req, res) => {
  try {
    // Get queue and status
    const [queueData, statusData] = await Promise.all([
      axios.get(`${API_BASE}/api/v1/supervisor/queue`).then(r => r.data),
      axios.get(`${API_BASE}/api/v1/supervisor/status`).then(r => r.data)
    ]);
    
    res.json({
      summary: {
        totalTasks: queueData.total,
        runningTasks: statusData.runningTasks,
        pendingTasks: queueData.total - statusData.runningTasks
      },
      queue: queueData.tasks,
      running: statusData.tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080, () => {
  console.log('Dashboard running on http://localhost:8080/dashboard');
});
```

---

## Troubleshooting

### Common Issues

#### 1. Queue File Not Found

**Problem:** API returns empty queue or errors

**Solution:**
```bash
# Check if file exists
ls -la task-queue.txt

# Create if missing
cat > task-queue.txt << 'EOF'
# Task Queue
# Eine Task pro Zeile
# GitHub Actions arbeitet alle 4h die nächste Task ab
# Queue processing started - $(date)

EOF
```

#### 2. Redis Connection Failed

**Problem:** Health check fails with Redis disconnected

**Solution:**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server

# Check connection with environment variables
REDIS_HOST=localhost REDIS_PORT=6379 npm start
```

#### 3. Task State Not Updating

**Problem:** Progress updates not reflected

**Solution:**
```javascript
// Check state exists
const state = await fetch(`${API_BASE}/api/v1/agent/state/${agentId}`)
  .then(r => r.json());

// Verify TTL hasn't expired
if (state.ttl === null || state.ttl < 60) {
  console.warn('State TTL is low or expired');
  // Refresh TTL
  await updateAgentState(agentId, { ttl: 86400 });
}
```

#### 4. Tasks Not Being Removed

**Problem:** Completed tasks remain in queue

**Solution:**
```javascript
// Ensure status is exactly "completed"
await completeTask(taskId, 'completed'); // Wrong
await completeTask(taskId, true); // Correct

// Manually remove if needed
await axios.delete(`${API_BASE}/api/v1/supervisor/queue/0`);
```

#### 5. Queue Processing Stuck

**Problem:** Task marked as running but not progressing

**Solution:**
```javascript
// Check running tasks
const status = await getSupervisorStatus();
console.log('Running tasks:', status.tasks);

// Force complete or fail stuck task
await axios.post(`${API_BASE}/api/v1/supervisor/queue/complete`, {
  taskId: stuckTaskId,
  status: 'failed',
  error: 'Task timeout - manually failed'
});

// Restart processing
await axios.post(`${API_BASE}/api/v1/supervisor/queue/process`);
```

### Debug Commands

```bash
# Check queue file
cat task-queue.txt

# Check Redis keys
redis-cli KEYS "agent:state:queue:*"

# Check specific task state
redis-cli GET "agent:state:queue:0:Q3JlYXRlIHVzZXI"

# Clear all task states
redis-cli KEYS "agent:state:queue:*" | xargs redis-cli DEL

# Monitor Redis operations
redis-cli MONITOR
```

### API Testing

```bash
# Test health
curl http://localhost:3000/health | jq .

# Test queue get
curl http://localhost:3000/api/v1/supervisor/queue | jq .

# Test queue add
curl -X POST http://localhost:3000/api/v1/supervisor/queue \
  -H "Content-Type: application/json" \
  -d '{"task": "Test task"}' | jq .

# Test process
curl -X POST http://localhost:3000/api/v1/supervisor/queue/process | jq .

# Test status
curl http://localhost:3000/api/v1/supervisor/status | jq .
```

---

## Related Documentation

- [Agent State Management](./Agent-State-Management.md) - Detailed agent state API
- [API Reference](./API-Reference.md) - Complete API documentation
- [GitHub Actions Workflows](./GitHub-Actions-Workflows.md) - Workflow integration
- [Error Codes Reference](./Error-Codes-Reference.md) - Error handling guide

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [FAQ](./FAQ.md)
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated:** 2026-01-25  
**Version:** 1.1.0  
**Maintainer:** Code Cloud Agents Team
