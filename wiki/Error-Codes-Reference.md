# Error Codes Reference

Complete reference for all API error codes in Code Cloud Agents.

## Quick Reference Table

| Error Code | HTTP Status | Category | Description |
|---|---|---|---|
| `INVALID_INPUT` | 400 | Client Error | Invalid or missing request parameters |
| `INVALID_PATH` | 400 | Client Error | Invalid file path or path traversal attempt |
| `INVALID_STATE` | 400 | Client Error | Operation not allowed in current state |
| `FILE_TOO_LARGE` | 400 | Client Error | File exceeds 10MB size limit |
| `DIRECTORY_NOT_FOUND` | 400 | Client Error | Parent directory does not exist |
| `UNAUTHORIZED` | 401 | Client Error | Missing or invalid authentication |
| `FILE_NOT_FOUND` | 404 | Client Error | Requested file does not exist |
| `STATE_NOT_FOUND` | 404 | Client Error | Agent state not found |
| `TASK_NOT_FOUND` | 404 | Client Error | Task not found in queue |
| `QUEUE_EMPTY` | 404 | Client Error | No tasks available in queue |
| `RATE_LIMIT` | 429 | Client Error | Too many requests |
| `MAX_RETRIES_EXCEEDED` | 400 | Client Error | Maximum retry limit reached |
| `INTERNAL_ERROR` | 500 | Server Error | Internal server error |
| `SERVER_ERROR` | 500 | Server Error | Generic server error |

---

## Client Errors (4xx)

### INVALID_INPUT

**HTTP Status:** `400 Bad Request`

**Description:** Request contains invalid, missing, or malformed parameters.

**Common Causes:**
- Missing required parameters (e.g., `agentId`, `path`, `task`)
- Invalid data types (e.g., string instead of number)
- Invalid enum values (e.g., status not in allowed list)
- Empty or whitespace-only values
- Agent ID exceeds 256 characters
- Agent ID contains invalid characters
- Progress value not between 0-100

**Example Response:**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "agentId is required"
  }
}
```

**How to Fix:**
- Verify all required parameters are provided
- Check parameter data types match API specification
- Ensure enum values are from allowed list: `pending`, `running`, `completed`, `failed`, `cancelled`
- Agent IDs must be alphanumeric with only `_`, `-`, `:`, `.` allowed
- Progress must be 0-100
- Task strings must be non-empty and trimmed
- Review the API contract for correct request format

---

### INVALID_PATH

**HTTP Status:** `400 Bad Request`

**Description:** File path is invalid, contains path traversal attempts, or points to a disallowed directory.

**Common Causes:**
- Path contains `..` segments (path traversal)
- Path points outside project root
- Path points to non-whitelisted directory
- Path is not a file when file is required
- Path is not a directory when directory is required

**Allowed Directories:**
- `src`
- `tests`
- `CONTRACTS`
- `ops`

**Example Response:**
```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path traversal not allowed"
  }
}
```

**How to Fix:**
- Use relative paths from project root
- Remove `..` segments from paths
- Ensure paths are within allowed directories
- Use correct path type (file vs directory) for operation
- Do not attempt to access system files outside project

---

### INVALID_STATE

**HTTP Status:** `400 Bad Request`

**Description:** The requested operation is not valid for the current state of the resource.

**Common Causes:**
- Attempting to retry a task that is not in `failed` status
- Calling completion on a task that doesn't exist

**Example Response:**
```json
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot retry task with status: running. Only failed tasks can be retried."
  }
}
```

**How to Fix:**
- Check current task/agent state before performing operation
- Only retry tasks with `failed` status
- Ensure task exists before attempting completion
- Follow proper state transitions: `pending` → `running` → `completed`/`failed`

---

### FILE_TOO_LARGE

**HTTP Status:** `400 Bad Request`

**Description:** The requested file exceeds the 10MB size limit.

**Common Causes:**
- Attempting to read a file larger than 10MB
- File has grown beyond limit since last access

**Example Response:**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 10MB limit"
  }
}
```

**How to Fix:**
- Split large files into smaller chunks
- Use alternative methods for large file processing
- Contact administrator if limit needs to be increased
- Consider binary file streaming for large files

---

### DIRECTORY_NOT_FOUND

**HTTP Status:** `400 Bad Request`

**Description:** Parent directory does not exist when trying to write a file.

**Common Causes:**
- Writing to a path where parent directories don't exist
- `createDirs` parameter not set to `true`

**Example Response:**
```json
{
  "error": {
    "code": "DIRECTORY_NOT_FOUND",
    "message": "Parent directory does not exist. Set createDirs: true to create it."
  }
}
```

**How to Fix:**
- Set `createDirs: true` in request body when writing files
- Manually create parent directories first
- Verify the path structure is correct

---

### MAX_RETRIES_EXCEEDED

**HTTP Status:** `400 Bad Request`

**Description:** The task has reached its maximum retry limit (default: 3 retries).

**Common Causes:**
- Task has failed and been retried 3 times
- Attempting to retry a task that has exhausted retries

**Example Response:**
```json
{
  "error": {
    "code": "MAX_RETRIES_EXCEEDED",
    "message": "Maximum retry limit (3) has been reached for this task."
  }
}
```

**How to Fix:**
- Investigate root cause of task failures in error history
- Create a new task instead of retrying
- Fix underlying issues before resubmitting
- Review task metadata and error logs

---

### UNAUTHORIZED

**HTTP Status:** `401 Unauthorized`

**Description:** Missing or invalid authentication credentials.

**Common Causes:**
- Missing `Authorization` header
- Invalid API key
- Expired token

**Example Response:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**How to Fix:**
- Include `Authorization: Bearer <api_key>` header
- Verify API key is valid and not expired
- Check GitHub Actions protected context configuration
- **Note:** Currently no auth required in development mode

---

### FILE_NOT_FOUND

**HTTP Status:** `404 Not Found`

**Description:** The requested file does not exist at the specified path.

**Common Causes:**
- File was deleted
- Incorrect file path
- Typo in filename
- File moved to different location
- Case sensitivity mismatch

**Example Response:**
```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: src/index.js"
  }
}
```

**How to Fix:**
- Verify file exists at specified path
- Check for typos in path or filename
- Use list files endpoint to browse directory
- Ensure case matches exactly (case-sensitive)
- Check if file was moved or renamed

---

### STATE_NOT_FOUND

**HTTP Status:** `404 Not Found`

**Description:** No agent state exists for the specified agent ID.

**Common Causes:**
- Agent state expired (TTL exceeded)
- Agent ID typo
- State was never created
- State was deleted

**Example Response:**
```json
{
  "error": {
    "code": "STATE_NOT_FOUND",
    "message": "Agent state not found for agentId: agent123"
  }
}
```

**How to Fix:**
- Verify agent ID is correct
- Check if state TTL has expired (default: 24 hours)
- Create agent state before accessing it
- List all agent states to find available IDs
- Refresh state before TTL expires

---

### TASK_NOT_FOUND

**HTTP Status:** `404 Not Found`

**Description:** No task exists at the specified queue index or task ID.

**Common Causes:**
- Invalid queue index
- Task was already completed and removed
- Task ID typo

**Example Response:**
```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "No task at index 5"
  }
}
```

**How to Fix:**
- List queue to see available tasks
- Verify index is within queue bounds (0 to length-1)
- Check if task was already processed
- Use correct task ID from queue endpoint

---

### QUEUE_EMPTY

**HTTP Status:** `404 Not Found`

**Description:** Attempted to process the next task but the queue is empty.

**Common Causes:**
- All tasks have been completed
- Queue has not been populated
- No pending tasks

**Example Response:**
```json
{
  "error": {
    "code": "QUEUE_EMPTY",
    "message": "No tasks in queue"
  }
}
```

**How to Fix:**
- Add tasks to queue using POST `/api/v1/supervisor/queue`
- Check supervisor status for queue length
- Wait for new tasks to be added
- This is not necessarily an error if all work is complete

---

### RATE_LIMIT

**HTTP Status:** `429 Too Many Requests`

**Description:** Client has exceeded the rate limit for API requests.

**Rate Limits:**
- Default: 100 requests/minute
- File Operations: 50 requests/minute

**Common Causes:**
- Too many requests in short time period
- Automated script without rate limiting
- Concurrent requests from multiple sources

**Example Response:**
```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded. Please try again later."
  }
}
```

**Response Headers:**
```
X-RateLimit-Remaining: 0
```

**How to Fix:**
- Wait before making additional requests
- Implement exponential backoff in client
- Check `X-RateLimit-Remaining` header
- Reduce request frequency
- Batch operations where possible
- Cache responses to reduce repeated requests

---

## Server Errors (5xx)

### INTERNAL_ERROR

**HTTP Status:** `500 Internal Server Error`

**Description:** An unexpected error occurred on the server while processing the request.

**Common Causes:**
- Redis connection failure
- File system errors (permissions, disk full)
- Unexpected data format in storage
- Bug in server code
- Resource exhaustion

**Example Response:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Redis connection error"
  }
}
```

**How to Fix:**
- Retry the request after a short delay
- Check server health endpoint: `GET /health`
- Verify Redis is running and accessible
- Check server logs for detailed error information
- Contact system administrator if persists
- Report bug with reproduction steps if consistent

---

### SERVER_ERROR

**HTTP Status:** `500 Internal Server Error`

**Description:** Generic server error when a more specific error code is not applicable.

**Common Causes:**
- Unhandled exception
- Service degradation
- Database/Redis unavailable
- Configuration error

**Example Response:**
```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "An internal server error occurred"
  }
}
```

**How to Fix:**
- Check `GET /health` endpoint for service status
- Retry with exponential backoff
- Check Redis connection status
- Review server logs
- Contact administrator for persistent errors

---

## Health Check Responses

### Healthy Service

**HTTP Status:** `200 OK`

```json
{
  "status": "healthy",
  "redis": "connected"
}
```

### Unhealthy Service

**HTTP Status:** `503 Service Unavailable`

```json
{
  "status": "unhealthy",
  "redis": "disconnected",
  "error": "Connection refused"
}
```

**How to Fix:**
- Verify Redis is running
- Check Redis connection configuration
- Review server logs for connectivity issues
- Restart Redis service if needed
- Check network connectivity

---

## Error Response Format

All errors follow this consistent schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description",
    "details": {}
  }
}
```

**Fields:**
- `code`: Machine-readable error identifier
- `message`: Human-readable error description
- `details`: (Optional) Additional context about the error

---

## Best Practices

### Error Handling in Clients

1. **Always check status codes** before parsing response
2. **Implement retry logic** with exponential backoff for 5xx errors
3. **Log error codes** for debugging and monitoring
4. **Display user-friendly messages** based on error codes
5. **Don't retry 4xx errors** except for 429 (rate limit)

### Retry Strategy

```javascript
// Recommended retry logic
const retryableErrors = [500, 502, 503, 504, 429];

async function makeRequest(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.ok) {
      return response.json();
    }
    
    if (!retryableErrors.includes(response.status)) {
      // Don't retry client errors
      throw new Error(await response.text());
    }
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, i), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Max retries exceeded');
}
```

### Validation Before Requests

```javascript
// Validate input before making API calls
function validatePath(path) {
  if (!path) throw new Error('Path is required');
  if (path.includes('..')) throw new Error('Path traversal not allowed');
  
  const allowedDirs = ['src', 'tests', 'CONTRACTS', 'ops'];
  const topDir = path.split('/')[0];
  
  if (!allowedDirs.includes(topDir)) {
    throw new Error(`Directory ${topDir} not allowed`);
  }
}

function validateAgentId(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('Agent ID must be a string');
  }
  if (agentId.length > 256) {
    throw new Error('Agent ID too long');
  }
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(agentId)) {
    throw new Error('Invalid characters in agent ID');
  }
}
```

---

## Related Documentation

- [API Contract](../CONTRACTS/api_contract.md) - Full API specification
- [Architecture Overview](Architecture-Overview.md) - System architecture
- [Development Guide](Development-Guide.md) - Development setup
- [Health Monitoring](Health-Monitoring.md) - Health check documentation

---

**Last Updated:** 2026-01-25  
**Version:** 1.1.0
