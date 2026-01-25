# File Operations API

## Table of Contents
- [Overview](#overview)
- [What are File Operations?](#what-are-file-operations)
- [Security and Path Validation](#security-and-path-validation)
- [Allowed Directories](#allowed-directories)
- [File Size Limits](#file-size-limits)
- [API Endpoints](#api-endpoints)
  - [List Files](#list-files)
  - [Read File](#read-file)
  - [Write File](#write-file)
  - [Delete File](#delete-file)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

---

## Overview

The File Operations API provides secure, controlled access to the project's file system. It allows agents and automation workflows to interact with files in specific directories while enforcing strict security policies.

**Base Path:** `/api/v1/files`

---

## What are File Operations?

File Operations are a set of RESTful API endpoints that enable:

- **Listing** directory contents with metadata
- **Reading** file contents safely
- **Writing** or updating files with automatic directory creation
- **Deleting** files with validation

These operations are designed for:
- Agent state persistence
- Configuration management
- Log file access
- Contract and documentation updates
- Test file management

---

## Security and Path Validation

### Path Traversal Protection

All file paths undergo rigorous validation through the `validatePath()` function:

```javascript
function validatePath(requestedPath) {
  // 1. Path is required
  if (!requestedPath) {
    throw new Error('Path is required');
  }

  // 2. Normalize and prevent path traversal
  const normalizedPath = path.normalize(requestedPath)
    .replace(/^(\.\.(\/|\\|$))+/, '');
  
  // 3. Resolve relative to project root
  const fullPath = path.resolve(PROJECT_ROOT, normalizedPath);

  // 4. Ensure path stays within project root
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new Error('Path traversal not allowed');
  }

  // 5. Check if path is in allowed directories
  const relativePath = path.relative(PROJECT_ROOT, fullPath);
  const topLevelDir = relativePath.split(path.sep)[0];
  
  if (topLevelDir && !ALLOWED_DIRS.includes(topLevelDir)) {
    throw new Error(`Access to directory '${topLevelDir}' not allowed`);
  }

  return fullPath;
}
```

### Security Features

✅ **Path Traversal Prevention** - Blocks `../` and `..\\` attacks  
✅ **Whitelist-Based Access** - Only allowed directories are accessible  
✅ **Absolute Path Resolution** - All paths resolved relative to project root  
✅ **Directory Boundary Enforcement** - Cannot escape project root  
✅ **Input Validation** - Empty and malformed paths rejected  

---

## Allowed Directories

Access is **restricted** to these directories only:

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `src/` | Source code | `src/index.js`, `src/utils/` |
| `tests/` | Test files | `tests/integration/`, `tests/unit/` |
| `CONTRACTS/` | API & data contracts | `CONTRACTS/api_contract.md` |
| `ops/` | Operations & policies | `ops/POLICY.md`, `ops/runbooks/` |

**⚠️ Access to other directories (e.g., `.git`, `node_modules`, `.github`) is blocked.**

---

## File Size Limits

| Operation | Limit | Reason |
|-----------|-------|--------|
| **Read File** | 10 MB | Prevent memory exhaustion |
| **Write File** | 10 MB | Request body limit (configured in Express) |
| **List Directory** | No limit | Only metadata returned |

---

## API Endpoints

### List Files

Get a list of files and directories with metadata.

**Endpoint:** `GET /api/v1/files`

**Query Parameters:**
- `path` (optional, default: `.`) - Directory path to list
- `recursive` (optional, default: `false`) - Reserved for future use

**Response:**
```json
{
  "path": "src",
  "files": [
    {
      "name": "index.js",
      "type": "file",
      "size": 32456,
      "modified": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "utils",
      "type": "directory",
      "modified": "2024-01-14T08:20:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
# List files in src directory
curl http://localhost:3000/api/v1/files?path=src

# List files in current directory
curl http://localhost:3000/api/v1/files

# List files in CONTRACTS directory
curl http://localhost:3000/api/v1/files?path=CONTRACTS
```

**JavaScript Example:**
```javascript
const axios = require('axios');

async function listFiles(directoryPath) {
  try {
    const response = await axios.get('http://localhost:3000/api/v1/files', {
      params: { path: directoryPath }
    });
    
    console.log(`Files in ${response.data.path}:`);
    response.data.files.forEach(file => {
      console.log(`- ${file.name} (${file.type}, ${file.size || 'N/A'} bytes)`);
    });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

listFiles('src');
```

**Error Responses:**
- `400` - Invalid path or path is not a directory
- `404` - Directory not found

---

### Read File

Read the contents of a file.

**Endpoint:** `GET /api/v1/files/content`

**Query Parameters:**
- `path` (required) - File path to read

**Response:**
```json
{
  "path": "src/index.js",
  "content": "const express = require('express');\n...",
  "encoding": "utf8",
  "size": 32456,
  "modified": "2024-01-15T10:30:00.000Z"
}
```

**cURL Example:**
```bash
# Read a JavaScript file
curl "http://localhost:3000/api/v1/files/content?path=src/index.js"

# Read a markdown file
curl "http://localhost:3000/api/v1/files/content?path=CONTRACTS/api_contract.md"

# URL-encode paths with spaces (if needed)
curl "http://localhost:3000/api/v1/files/content?path=src%2Fmy%20file.js"
```

**JavaScript Example:**
```javascript
async function readFile(filePath) {
  try {
    const response = await axios.get('http://localhost:3000/api/v1/files/content', {
      params: { path: filePath }
    });
    
    console.log(`File: ${response.data.path}`);
    console.log(`Size: ${response.data.size} bytes`);
    console.log(`Modified: ${response.data.modified}`);
    console.log(`Content:\n${response.data.content}`);
    
    return response.data.content;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('File not found');
    } else if (error.response?.data?.error?.code === 'FILE_TOO_LARGE') {
      console.error('File exceeds 10MB limit');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

readFile('src/index.js');
```

**Error Responses:**
- `400` - Invalid input, path is not a file, or file exceeds 10MB
- `404` - File not found

---

### Write File

Create or update a file with content.

**Endpoint:** `POST /api/v1/files/content`

**Request Body:**
```json
{
  "path": "src/new-file.js",
  "content": "console.log('Hello, World!');",
  "createDirs": true
}
```

**Parameters:**
- `path` (required) - File path to write
- `content` (required) - File content as string
- `createDirs` (optional, default: `false`) - Create parent directories if they don't exist

**Response:**
```json
{
  "path": "src/new-file.js",
  "size": 28,
  "created": true,
  "modified": "2024-01-15T10:35:00.000Z"
}
```

**cURL Example:**
```bash
# Create a new file
curl -X POST http://localhost:3000/api/v1/files/content \
  -H "Content-Type: application/json" \
  -d '{
    "path": "src/hello.js",
    "content": "console.log(\"Hello, World!\");"
  }'

# Create file with parent directories
curl -X POST http://localhost:3000/api/v1/files/content \
  -H "Content-Type: application/json" \
  -d '{
    "path": "src/utils/helper.js",
    "content": "module.exports = {};",
    "createDirs": true
  }'

# Update existing file
curl -X POST http://localhost:3000/api/v1/files/content \
  -H "Content-Type: application/json" \
  -d '{
    "path": "CONTRACTS/api_contract.md",
    "content": "# Updated API Contract\n..."
  }'
```

**JavaScript Example:**
```javascript
async function writeFile(filePath, content, createDirs = false) {
  try {
    const response = await axios.post('http://localhost:3000/api/v1/files/content', {
      path: filePath,
      content: content,
      createDirs: createDirs
    });
    
    console.log(`${response.data.created ? 'Created' : 'Updated'}: ${response.data.path}`);
    console.log(`Size: ${response.data.size} bytes`);
    console.log(`Modified: ${response.data.modified}`);
    
    return response.data;
  } catch (error) {
    if (error.response?.data?.error?.code === 'DIRECTORY_NOT_FOUND') {
      console.error('Parent directory does not exist. Set createDirs: true');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

// Create new file
writeFile('src/config.js', 'module.exports = { port: 3000 };', true);

// Update existing file
writeFile('ops/POLICY.md', '# Updated Policy\n...', false);
```

**Error Responses:**
- `400` - Invalid input, invalid path, or parent directory doesn't exist
- `400` - `DIRECTORY_NOT_FOUND` - Set `createDirs: true` to create parent directories

---

### Delete File

Delete a file from the file system.

**Endpoint:** `DELETE /api/v1/files/content`

**Query Parameters:**
- `path` (required) - File path to delete

**Response:**
```json
{
  "path": "src/old-file.js",
  "deleted": true
}
```

**cURL Example:**
```bash
# Delete a file
curl -X DELETE "http://localhost:3000/api/v1/files/content?path=src/old-file.js"

# Delete a test file
curl -X DELETE "http://localhost:3000/api/v1/files/content?path=tests/temp-test.js"
```

**JavaScript Example:**
```javascript
async function deleteFile(filePath) {
  try {
    const response = await axios.delete('http://localhost:3000/api/v1/files/content', {
      params: { path: filePath }
    });
    
    console.log(`Deleted: ${response.data.path}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('File not found');
    } else if (error.response?.data?.error?.code === 'INVALID_PATH') {
      console.error('Path must be a file (directories cannot be deleted)');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

deleteFile('src/temp-file.js');
```

**Error Responses:**
- `400` - Invalid input, invalid path, or path is not a file (directories cannot be deleted)
- `404` - File not found

---

## Error Handling

All file operation endpoints return structured error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Missing or invalid request parameters |
| `INVALID_PATH` | 400 | Path validation failed or path traversal detected |
| `FILE_NOT_FOUND` | 404 | File does not exist |
| `DIRECTORY_NOT_FOUND` | 404/400 | Parent directory does not exist (write) |
| `FILE_TOO_LARGE` | 400 | File exceeds 10MB size limit |

### Example Error Handling

```javascript
async function safeFileOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    const errorData = error.response?.data?.error;
    
    switch (errorData?.code) {
      case 'FILE_NOT_FOUND':
        console.error('File does not exist');
        break;
      case 'FILE_TOO_LARGE':
        console.error('File exceeds 10MB limit');
        break;
      case 'INVALID_PATH':
        console.error('Invalid or unauthorized path');
        break;
      case 'DIRECTORY_NOT_FOUND':
        console.error('Parent directory missing - use createDirs: true');
        break;
      default:
        console.error('Unexpected error:', errorData?.message);
    }
    
    throw error;
  }
}
```

---

## Best Practices

### 1. Always Validate Paths
```javascript
// ❌ Bad - User input directly in path
const userPath = req.query.userPath;
readFile(userPath);

// ✅ Good - Validate and sanitize
function sanitizePath(userPath) {
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Invalid path');
  }
  // Additional validation logic
  return userPath;
}
```

### 2. Use createDirs for New Files
```javascript
// ✅ Good - Ensures parent directories exist
await writeFile('src/new/module/file.js', content, { createDirs: true });
```

### 3. Handle File Size Limits
```javascript
// ✅ Good - Check size before reading
const stats = await listFiles('src');
const file = stats.files.find(f => f.name === 'large-file.json');

if (file.size > 10 * 1024 * 1024) {
  console.warn('File too large, processing differently');
} else {
  const content = await readFile('src/large-file.json');
}
```

### 4. Implement Retry Logic
```javascript
async function readFileWithRetry(path, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await readFile(path);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 5. Use Proper Error Handling
```javascript
// ✅ Good - Comprehensive error handling
try {
  const content = await readFile('src/config.js');
  // Process content
} catch (error) {
  if (error.response?.status === 404) {
    // Handle missing file
    await writeFile('src/config.js', DEFAULT_CONFIG, { createDirs: true });
  } else {
    // Handle other errors
    console.error('Failed to read config:', error.message);
    throw error;
  }
}
```

---

## Security Considerations

### 🔒 Critical Security Rules

#### 1. **Never Trust User Input**
```javascript
// ❌ DANGEROUS - Path traversal vulnerability
app.get('/download', (req, res) => {
  const filePath = req.query.path; // Attacker: "../../../etc/passwd"
  downloadFile(filePath);
});

// ✅ SAFE - API validates paths
app.get('/download', async (req, res) => {
  try {
    // API enforces allowed directories only
    const response = await axios.get('/api/v1/files/content', {
      params: { path: req.query.path }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data);
  }
});
```

#### 2. **Whitelist, Never Blacklist**
The API uses a **whitelist approach**:
- ✅ Allowed: `src/`, `tests/`, `CONTRACTS/`, `ops/`
- ❌ Blocked: Everything else

#### 3. **File Size Limits Prevent DoS**
- 10MB limit prevents memory exhaustion attacks
- Request timeout (30 seconds) prevents slow-read attacks

#### 4. **No Directory Deletion**
- Prevents accidental data loss
- Reduces attack surface
- Only individual files can be deleted

#### 5. **Path Normalization**
```javascript
// All these malicious paths are normalized and blocked:
"../../../etc/passwd"          → Blocked (path traversal)
"src/../../etc/passwd"         → Blocked (escapes project root)
"node_modules/package.json"    → Blocked (not in allowed directories)
".git/config"                  → Blocked (not in allowed directories)
"src/../node_modules/pkg.json" → Blocked (resolves outside allowed dirs)
```

#### 6. **Encoding and Content Type**
- All files read/written as UTF-8
- Binary files may be corrupted
- Use appropriate encoding for your use case

### ⚠️ Security Warnings

| ⚠️ Warning | Description |
|-----------|-------------|
| **Path Injection** | Never concatenate user input directly into paths |
| **Symbolic Links** | Be aware that symlinks inside allowed directories can point outside |
| **Race Conditions** | Multiple writes to the same file may cause conflicts |
| **Binary Files** | Reading binary files as UTF-8 may corrupt data |
| **Sensitive Data** | Do not store secrets or credentials in files accessible via this API |

### 🛡️ Security Checklist

Before using File Operations in production:

- [ ] Verify all file paths come from trusted sources
- [ ] Implement rate limiting to prevent abuse
- [ ] Monitor file system operations for anomalies
- [ ] Use least-privilege principles (minimize allowed directories)
- [ ] Regularly audit file access logs
- [ ] Implement authentication and authorization
- [ ] Use HTTPS in production
- [ ] Validate file content before writing
- [ ] Implement backup and recovery procedures
- [ ] Set up alerts for unusual file operations

---

## Integration Examples

### Complete Workflow Example

```javascript
const axios = require('axios');

class FileOperationsClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.client = axios.create({ baseURL });
  }

  async listFiles(path = '.') {
    const response = await this.client.get('/api/v1/files', {
      params: { path }
    });
    return response.data.files;
  }

  async readFile(path) {
    const response = await this.client.get('/api/v1/files/content', {
      params: { path }
    });
    return response.data.content;
  }

  async writeFile(path, content, createDirs = false) {
    const response = await this.client.post('/api/v1/files/content', {
      path,
      content,
      createDirs
    });
    return response.data;
  }

  async deleteFile(path) {
    const response = await this.client.delete('/api/v1/files/content', {
      params: { path }
    });
    return response.data;
  }
}

// Usage
async function main() {
  const fileOps = new FileOperationsClient();

  // List files in src directory
  const files = await fileOps.listFiles('src');
  console.log('Files:', files);

  // Read a configuration file
  const config = await fileOps.readFile('src/config.js');
  console.log('Config:', config);

  // Update the configuration
  await fileOps.writeFile('src/config.js', config + '\n// Updated');

  // Create a new file with directories
  await fileOps.writeFile(
    'src/utils/helpers.js',
    'module.exports = {};',
    true
  );

  // Clean up
  await fileOps.deleteFile('src/utils/helpers.js');
}

main().catch(console.error);
```

---

## Related Documentation

- [API Reference](./API-Reference.md) - Complete API documentation
- [Security Best Practices](./Security-Best-Practices.md) - Application security guidelines
- [Error Codes Reference](./Error-Codes-Reference.md) - Complete error code listing
- [Contracts System](./Contracts-System.md) - Managing API and data contracts
- [Agent State Management](./Agent-State-Management.md) - State persistence using files

---

## Support

For issues or questions:
1. Check the [FAQ](./FAQ.md)
2. Review [Troubleshooting](./Troubleshooting.md)
3. Open an issue on GitHub
4. Consult [Contributing Guide](./Contributing-Guide.md)

---

**Last Updated:** 2024-01-15  
**API Version:** v1  
**Maintainers:** Code Cloud Agents Team
