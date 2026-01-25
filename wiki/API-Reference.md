# API Reference

**Version:** 1.1.0  
**Last Updated:** 2025-01-25

## Overview

The Code Cloud Agents API provides programmatic access to manage AI agent tasks, file operations, and task queue management within GitHub Actions workflows. This RESTful API enables you to:

- Monitor system health and service status
- Manage agent execution states with retry capabilities
- Queue and process automated tasks
- Perform secure file operations within allowed directories

## Base URL

| Environment | URL |
|------------|-----|
| Development | `http://localhost:3000` |
| Production | TBD |

## Authentication

**Current:** No authentication required (runs in protected GitHub Actions context)  
**Future:** API key authentication via Bearer token

```http
Authorization: Bearer <api_key>
```

## Rate Limiting

- **Default:** 100 requests/minute
- **File Operations:** 50 requests/minute

Rate limit information is returned in response headers:

```http
X-RateLimit-Remaining: 95
```

---

## Endpoints

### Table of Contents

- [Health Check](#health-check)
- [Agent State Management](#agent-state-management)
  - [Create/Update Agent State](#createupdate-agent-state)
  - [Get Agent State](#get-agent-state)
  - [List All Agent States](#list-all-agent-states)
  - [Retry Failed Task](#retry-failed-task)
  - [Delete Agent State](#delete-agent-state)
- [Task Queue Management](#task-queue-management)
  - [Get Queue](#get-queue)
  - [Add Task to Queue](#add-task-to-queue)
  - [Remove Task from Queue](#remove-task-from-queue)
  - [Process Next Task](#process-next-task)
  - [Complete Task](#complete-task)
  - [Get Supervisor Status](#get-supervisor-status)
- [File Operations](#file-operations)
  - [List Files](#list-files)
  - [Read File](#read-file)
  - [Write File](#write-file)
  - [Delete File](#delete-file)

---

## Health Check

### GET /health

Check system status and service availability.

**Parameters:** None

**Response 200 - Healthy:**

```json
{
  "status": "healthy",
  "redis": "connected"
}
```

**Response 503 - Unhealthy:**

```json
{
  "status": "unhealthy",
  "redis": "disconnected",
  "error": "Connection refused"
}
```

**Example (curl):**

```bash
curl http://localhost:3000/health
```

**Example (JavaScript):**

```javascript
const response = await fetch('http://localhost:3000/health');
const health = await response.json();
console.log(health.status);
```

---

## Agent State Management

Manage execution states for AI agents with built-in retry capabilities.

### Create/Update Agent State

**POST** `/api/v1/agent/state`

Create a new agent state or update an existing one. Includes automatic retry tracking for failed tasks.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string | Yes | Unique agent identifier (alphanumeric, underscore, hyphen, colon, period; max 256 chars) |
| `status` | string | No | One of: `pending`, `running`, `completed`, `failed`, `cancelled` |
| `progress` | number | No | Progress percentage (0-100) |
| `metadata` | object | No | Custom metadata for the agent |
| `ttl` | number | No | Time-to-live in seconds (default: 86400 = 24 hours) |
| `error` | string | No | Error message (used when status is `failed`) |

**Response 200:**

```json
{
  "agentId": "build:abc123",
  "state": {
    "agentId": "build:abc123",
    "status": "running",
    "progress": 45,
    "metadata": {
      "task": "Build React app",
      "branch": "feature/login"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2025-01-25T12:00:00.000Z",
    "updatedAt": "2025-01-25T12:05:30.000Z"
  },
  "ttl": 86400
}
```

**Error 400:**

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "agentId is required"
  }
}
```

**Example (curl):**

```bash
curl -X POST http://localhost:3000/api/v1/agent/state \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "build:abc123",
    "status": "running",
    "progress": 45,
    "metadata": {
      "task": "Build React app"
    }
  }'
```

**Example (JavaScript):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/agent/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'build:abc123',
    status: 'running',
    progress: 45,
    metadata: { task: 'Build React app' }
  })
});
const result = await response.json();
```

---

### Get Agent State

**GET** `/api/v1/agent/state/:agentId`

Retrieve the current state of a specific agent.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | string | Unique agent identifier |

**Response 200:**

```json
{
  "agentId": "build:abc123",
  "state": {
    "agentId": "build:abc123",
    "status": "completed",
    "progress": 100,
    "metadata": {
      "task": "Build React app",
      "filesChanged": 12
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2025-01-25T12:00:00.000Z",
    "updatedAt": "2025-01-25T12:15:00.000Z",
    "completedAt": "2025-01-25T12:15:00.000Z"
  },
  "ttl": 85200
}
```

**Error 404:**

```json
{
  "error": {
    "code": "STATE_NOT_FOUND",
    "message": "Agent state not found for agentId: build:abc123"
  }
}
```

**Example (curl):**

```bash
curl http://localhost:3000/api/v1/agent/state/build:abc123
```

**Example (JavaScript):**

```javascript
const agentId = 'build:abc123';
const response = await fetch(`http://localhost:3000/api/v1/agent/state/${agentId}`);
const data = await response.json();
```

---

### List All Agent States

**GET** `/api/v1/agent/states`

List all agent states with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `status` | string | Filter by status (`pending`, `running`, `completed`, `failed`, `cancelled`) | All statuses |
| `limit` | number | Maximum results per page (1-100) | 100 |
| `offset` | number | Number of results to skip | 0 |

**Response 200:**

```json
{
  "states": [
    {
      "agentId": "build:abc123",
      "status": "completed",
      "progress": 100,
      "metadata": { "task": "Build React app" },
      "retryCount": 0,
      "maxRetries": 3,
      "createdAt": "2025-01-25T12:00:00.000Z",
      "updatedAt": "2025-01-25T12:15:00.000Z",
      "completedAt": "2025-01-25T12:15:00.000Z"
    },
    {
      "agentId": "test:def456",
      "status": "running",
      "progress": 60,
      "metadata": { "task": "Run unit tests" },
      "retryCount": 0,
      "maxRetries": 3,
      "createdAt": "2025-01-25T12:10:00.000Z",
      "updatedAt": "2025-01-25T12:18:00.000Z"
    }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

**Example (curl):**

```bash
# Get all running agents
curl "http://localhost:3000/api/v1/agent/states?status=running&limit=50"
```

**Example (JavaScript):**

```javascript
const params = new URLSearchParams({
  status: 'running',
  limit: 50,
  offset: 0
});
const response = await fetch(`http://localhost:3000/api/v1/agent/states?${params}`);
const data = await response.json();
```

---

### Retry Failed Task

**POST** `/api/v1/agent/state/:agentId/retry`

Retry a failed agent task. Maximum retry limit is configurable (default: 3).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | string | Unique agent identifier |

**Response 200:**

```json
{
  "agentId": "build:abc123",
  "state": {
    "agentId": "build:abc123",
    "status": "pending",
    "progress": 0,
    "metadata": { "task": "Build React app" },
    "retryCount": 1,
    "maxRetries": 3,
    "retriedAt": "2025-01-25T12:30:00.000Z",
    "errorHistory": [
      {
        "error": "Build timeout",
        "failedAt": "2025-01-25T12:20:00.000Z",
        "retryNumber": 0
      }
    ],
    "createdAt": "2025-01-25T12:00:00.000Z",
    "updatedAt": "2025-01-25T12:30:00.000Z"
  },
  "retryCount": 1,
  "maxRetries": 3,
  "retriesRemaining": 2
}
```

**Error 400 - Cannot Retry:**

```json
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot retry task with status: running. Only failed tasks can be retried."
  }
}
```

**Error 400 - Max Retries Exceeded:**

```json
{
  "error": {
    "code": "MAX_RETRIES_EXCEEDED",
    "message": "Maximum retry limit (3) has been reached for this task."
  }
}
```

**Example (curl):**

```bash
curl -X POST http://localhost:3000/api/v1/agent/state/build:abc123/retry
```

**Example (JavaScript):**

```javascript
const agentId = 'build:abc123';
const response = await fetch(`http://localhost:3000/api/v1/agent/state/${agentId}/retry`, {
  method: 'POST'
});
const result = await response.json();
```

---

### Delete Agent State

**DELETE** `/api/v1/agent/state/:agentId`

Remove an agent state from the system.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | string | Unique agent identifier |

**Response 200:**

```json
{
  "agentId": "build:abc123",
  "deleted": true
}
```

**Error 404:**

```json
{
  "error": {
    "code": "STATE_NOT_FOUND",
    "message": "Agent state not found for agentId: build:abc123"
  }
}
```

**Example (curl):**

```bash
curl -X DELETE http://localhost:3000/api/v1/agent/state/build:abc123
```

**Example (JavaScript):**

```javascript
const agentId = 'build:abc123';
const response = await fetch(`http://localhost:3000/api/v1/agent/state/${agentId}`, {
  method: 'DELETE'
});
const result = await response.json();
```

---

## Task Queue Management

Manage a persistent task queue processed by GitHub Actions workflows.

### Get Queue

**GET** `/api/v1/supervisor/queue`

Retrieve all tasks in the queue with their current states.

**Response 200:**

```json
{
  "tasks": [
    {
      "index": 0,
      "task": "Create login page with React",
      "taskId": "queue:0:Q3JlYXRlIGxvZ2lu",
      "state": {
        "agentId": "queue:0:Q3JlYXRlIGxvZ2lu",
        "status": "running",
        "progress": 30,
        "metadata": {
          "task": "Create login page with React",
          "queueIndex": 0,
          "processedAt": "2025-01-25T12:00:00.000Z"
        },
        "retryCount": 0,
        "maxRetries": 3,
        "createdAt": "2025-01-25T12:00:00.000Z",
        "updatedAt": "2025-01-25T12:10:00.000Z"
      }
    },
    {
      "index": 1,
      "task": "Add unit tests for authentication",
      "taskId": "queue:1:QWRkIHVuaXQgdGVz",
      "state": null
    }
  ],
  "total": 2
}
```

**Example (curl):**

```bash
curl http://localhost:3000/api/v1/supervisor/queue
```

**Example (JavaScript):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/supervisor/queue');
const queue = await response.json();
console.log(`${queue.total} tasks in queue`);
```

---

### Add Task to Queue

**POST** `/api/v1/supervisor/queue`

Add a new task to the queue at a specific position or at the end.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | Yes | Task description (non-empty) |
| `position` | number | No | Queue position (0-based index). If omitted, task is added to the end |

**Response 200:**

```json
{
  "task": "Create login page with React",
  "position": 0,
  "total": 3
}
```

**Error 400:**

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Task must be a non-empty string"
  }
}
```

**Example (curl):**

```bash
# Add task to end of queue
curl -X POST http://localhost:3000/api/v1/supervisor/queue \
  -H "Content-Type: application/json" \
  -d '{"task": "Create login page with React"}'

# Add task at specific position (priority)
curl -X POST http://localhost:3000/api/v1/supervisor/queue \
  -H "Content-Type: application/json" \
  -d '{"task": "Urgent: Fix security issue", "position": 0}'
```

**Example (JavaScript):**

```javascript
// Add to end
const response = await fetch('http://localhost:3000/api/v1/supervisor/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ task: 'Create login page with React' })
});

// Add at specific position
const priorityResponse = await fetch('http://localhost:3000/api/v1/supervisor/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    task: 'Urgent: Fix security issue', 
    position: 0 
  })
});
```

---

### Remove Task from Queue

**DELETE** `/api/v1/supervisor/queue/:index`

Remove a task from the queue by its index position.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | number | Queue position (0-based) |

**Response 200:**

```json
{
  "task": "Create login page with React",
  "index": 0,
  "total": 2
}
```

**Error 404:**

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "No task at index 5"
  }
}
```

**Example (curl):**

```bash
# Remove task at index 0
curl -X DELETE http://localhost:3000/api/v1/supervisor/queue/0
```

**Example (JavaScript):**

```javascript
const index = 0;
const response = await fetch(`http://localhost:3000/api/v1/supervisor/queue/${index}`, {
  method: 'DELETE'
});
const result = await response.json();
```

---

### Process Next Task

**POST** `/api/v1/supervisor/queue/process`

Mark the first task in the queue as running. This endpoint is typically called by GitHub Actions workflows.

**Response 200:**

```json
{
  "task": "Create login page with React",
  "taskId": "queue:0:Q3JlYXRlIGxvZ2lu",
  "state": {
    "agentId": "queue:0:Q3JlYXRlIGxvZ2lu",
    "status": "running",
    "progress": 0,
    "metadata": {
      "task": "Create login page with React",
      "queueIndex": 0,
      "processedAt": "2025-01-25T12:00:00.000Z"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2025-01-25T12:00:00.000Z",
    "updatedAt": "2025-01-25T12:00:00.000Z"
  },
  "message": "Task marked as running. Call completion endpoint when done."
}
```

**Error 404:**

```json
{
  "error": {
    "code": "QUEUE_EMPTY",
    "message": "No tasks in queue"
  }
}
```

**Example (curl):**

```bash
curl -X POST http://localhost:3000/api/v1/supervisor/queue/process
```

**Example (JavaScript):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/supervisor/queue/process', {
  method: 'POST'
});
const task = await response.json();
```

---

### Complete Task

**POST** `/api/v1/supervisor/queue/complete`

Mark a task as completed or failed. Completed tasks are removed from the queue.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task ID returned from process endpoint |
| `status` | string | Yes | Either `completed` or `failed` |
| `error` | string | No | Error message (required if status is `failed`) |

**Response 200:**

```json
{
  "taskId": "queue:0:Q3JlYXRlIGxvZ2lu",
  "state": {
    "agentId": "queue:0:Q3JlYXRlIGxvZ2lu",
    "status": "completed",
    "progress": 100,
    "metadata": {
      "task": "Create login page with React",
      "queueIndex": 0,
      "processedAt": "2025-01-25T12:00:00.000Z"
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2025-01-25T12:00:00.000Z",
    "updatedAt": "2025-01-25T12:15:00.000Z",
    "completedAt": "2025-01-25T12:15:00.000Z"
  },
  "queueLength": 1
}
```

**Error 404:**

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found: queue:0:Q3JlYXRlIGxvZ2lu"
  }
}
```

**Example (curl):**

```bash
# Mark as completed
curl -X POST http://localhost:3000/api/v1/supervisor/queue/complete \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "queue:0:Q3JlYXRlIGxvZ2lu",
    "status": "completed"
  }'

# Mark as failed
curl -X POST http://localhost:3000/api/v1/supervisor/queue/complete \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "queue:0:Q3JlYXRlIGxvZ2lu",
    "status": "failed",
    "error": "Build timeout after 30 minutes"
  }'
```

**Example (JavaScript):**

```javascript
// Mark as completed
const response = await fetch('http://localhost:3000/api/v1/supervisor/queue/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: 'queue:0:Q3JlYXRlIGxvZ2lu',
    status: 'completed'
  })
});

// Mark as failed
const failedResponse = await fetch('http://localhost:3000/api/v1/supervisor/queue/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: 'queue:0:Q3JlYXRlIGxvZ2lu',
    status: 'failed',
    error: 'Build timeout after 30 minutes'
  })
});
```

---

### Get Supervisor Status

**GET** `/api/v1/supervisor/status`

Get overall supervisor status including queue length and running tasks.

**Response 200:**

```json
{
  "queueLength": 3,
  "runningTasks": 1,
  "tasks": [
    {
      "agentId": "queue:0:Q3JlYXRlIGxvZ2lu",
      "status": "running",
      "progress": 45,
      "metadata": {
        "task": "Create login page with React",
        "queueIndex": 0,
        "processedAt": "2025-01-25T12:00:00.000Z"
      },
      "retryCount": 0,
      "maxRetries": 3,
      "createdAt": "2025-01-25T12:00:00.000Z",
      "updatedAt": "2025-01-25T12:10:00.000Z"
    }
  ]
}
```

**Example (curl):**

```bash
curl http://localhost:3000/api/v1/supervisor/status
```

**Example (JavaScript):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/supervisor/status');
const status = await response.json();
console.log(`Queue: ${status.queueLength} | Running: ${status.runningTasks}`);
```

---

## File Operations

Secure file operations within allowed directories. All paths are validated to prevent directory traversal attacks.

### List Files

**GET** `/api/v1/files`

List files and directories within a specified path.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `path` | string | Relative path from project root | `.` (root) |
| `recursive` | boolean | List files recursively (not fully implemented) | `false` |

**Allowed Directories:** `src`, `tests`, `CONTRACTS`, `ops`

**Response 200:**

```json
{
  "path": "src",
  "files": [
    {
      "name": "index.js",
      "type": "file",
      "size": 25648,
      "modified": "2025-01-25T12:00:00.000Z"
    },
    {
      "name": "utils",
      "type": "directory",
      "modified": "2025-01-25T11:30:00.000Z"
    }
  ]
}
```

**Error 400:**

```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path traversal not allowed"
  }
}
```

**Error 404:**

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Directory not found: src/unknown"
  }
}
```

**Example (curl):**

```bash
# List files in src directory
curl "http://localhost:3000/api/v1/files?path=src"

# List files in root
curl "http://localhost:3000/api/v1/files"
```

**Example (JavaScript):**

```javascript
const path = 'src';
const response = await fetch(`http://localhost:3000/api/v1/files?path=${encodeURIComponent(path)}`);
const data = await response.json();
data.files.forEach(file => {
  console.log(`${file.type}: ${file.name}`);
});
```

---

### Read File

**GET** `/api/v1/files/content`

Read the contents of a file. Maximum file size: 10MB.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative path to file from project root |

**Response 200:**

```json
{
  "path": "src/index.js",
  "content": "const express = require('express');\n...",
  "encoding": "utf8",
  "size": 25648,
  "modified": "2025-01-25T12:00:00.000Z"
}
```

**Error 400 - Invalid Path:**

```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path must be a file"
  }
}
```

**Error 400 - File Too Large:**

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 10MB limit"
  }
}
```

**Error 404:**

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: src/missing.js"
  }
}
```

**Example (curl):**

```bash
curl "http://localhost:3000/api/v1/files/content?path=src/index.js"
```

**Example (JavaScript):**

```javascript
const filePath = 'src/index.js';
const response = await fetch(`http://localhost:3000/api/v1/files/content?path=${encodeURIComponent(filePath)}`);
const file = await response.json();
console.log(file.content);
```

---

### Write File

**POST** `/api/v1/files/content`

Create a new file or update an existing file's content.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Relative path to file from project root |
| `content` | string | Yes | File content (can be empty string) |
| `createDirs` | boolean | No | Create parent directories if they don't exist (default: false) |

**Response 200:**

```json
{
  "path": "src/newfile.js",
  "size": 156,
  "created": true,
  "modified": "2025-01-25T12:30:00.000Z"
}
```

**Error 400 - Directory Not Found:**

```json
{
  "error": {
    "code": "DIRECTORY_NOT_FOUND",
    "message": "Parent directory does not exist. Set createDirs: true to create it."
  }
}
```

**Error 400 - Invalid Path:**

```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Access to directory 'node_modules' not allowed"
  }
}
```

**Example (curl):**

```bash
# Create new file
curl -X POST http://localhost:3000/api/v1/files/content \
  -H "Content-Type: application/json" \
  -d '{
    "path": "src/utils/helper.js",
    "content": "module.exports = { hello: () => \"world\" };",
    "createDirs": true
  }'

# Update existing file
curl -X POST http://localhost:3000/api/v1/files/content \
  -H "Content-Type: application/json" \
  -d '{
    "path": "src/index.js",
    "content": "const express = require(\"express\");\n// Updated content"
  }'
```

**Example (JavaScript):**

```javascript
// Create new file with directories
const response = await fetch('http://localhost:3000/api/v1/files/content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'src/utils/helper.js',
    content: 'module.exports = { hello: () => "world" };',
    createDirs: true
  })
});

// Update existing file
const updateResponse = await fetch('http://localhost:3000/api/v1/files/content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'src/index.js',
    content: updatedContent
  })
});
```

---

### Delete File

**DELETE** `/api/v1/files/content`

Delete a file from the filesystem.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative path to file from project root |

**Response 200:**

```json
{
  "path": "src/oldfile.js",
  "deleted": true
}
```

**Error 400:**

```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path must be a file"
  }
}
```

**Error 404:**

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: src/oldfile.js"
  }
}
```

**Example (curl):**

```bash
curl -X DELETE "http://localhost:3000/api/v1/files/content?path=src/oldfile.js"
```

**Example (JavaScript):**

```javascript
const filePath = 'src/oldfile.js';
const response = await fetch(`http://localhost:3000/api/v1/files/content?path=${encodeURIComponent(filePath)}`, {
  method: 'DELETE'
});
const result = await response.json();
```

---

## Error Handling

All API errors follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Request contains invalid or missing parameters |
| `INVALID_PATH` | 400 | File path is invalid or not allowed |
| `INVALID_STATE` | 400 | Operation not allowed in current state |
| `FILE_TOO_LARGE` | 400 | File exceeds 10MB size limit |
| `DIRECTORY_NOT_FOUND` | 400 | Parent directory doesn't exist |
| `MAX_RETRIES_EXCEEDED` | 400 | Task retry limit reached |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `STATE_NOT_FOUND` | 404 | Agent state not found |
| `FILE_NOT_FOUND` | 404 | File or directory not found |
| `TASK_NOT_FOUND` | 404 | Task not found in queue |
| `QUEUE_EMPTY` | 404 | No tasks available in queue |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVER_ERROR` | 500 | Unexpected server error |

---

## Security

### Path Traversal Protection

All file operations implement strict path validation:

- **No `..` segments** - Parent directory references are stripped
- **Relative paths only** - All paths must be relative to project root
- **Directory whitelist** - Only `src`, `tests`, `CONTRACTS`, and `ops` directories are accessible
- **Path normalization** - Paths are normalized before validation

**Examples of blocked paths:**

```bash
../../../etc/passwd          # Traversal attempt
/etc/passwd                  # Absolute path
src/../../etc/passwd         # Normalized traversal
node_modules/package.json    # Not in whitelist
```

### File Size Limits

- **Maximum file size:** 10MB per file
- **Request body limit:** 10MB
- **Files per request:** 100 (applies to batch operations)

### Request Timeouts

- **Request timeout:** 30 seconds
- **Response timeout:** 30 seconds

### Redis Connection

- **Retry strategy:** Exponential backoff (max 2 seconds)
- **Max retries per request:** 3
- **Connection pooling:** Automatic via ioredis

---

## Versioning

The API uses URL-based versioning: `/api/v1/...`

**Breaking changes** will result in a new version (e.g., `/api/v2/...`). Non-breaking changes are made to existing versions.

### Deprecation Policy

- Deprecated endpoints are supported for **6 months** after deprecation notice
- Deprecation is announced via API response headers:
  ```http
  Deprecation: true
  Sunset: 2026-07-25T00:00:00Z
  ```

---

## Support & Additional Resources

For questions, issues, or feature requests:

- **GitHub Issues:** [code-cloud-agents/issues](https://github.com/your-org/code-cloud-agents/issues)
- **Documentation:** See `/docs` directory in repository
- **Contract Reference:** `/CONTRACTS/api_contract.md`

---

**Last Updated:** 2025-01-25  
**API Version:** 1.1.0
