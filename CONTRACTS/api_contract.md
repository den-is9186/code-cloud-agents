# API Contract - Code Cloud Agents

> **Contract-First:** Diese Datei definiert ALLE API Endpoints.
> Änderungen hier MÜSSEN vor Code-Implementierung dokumentiert werden.

**Version:** 1.1.0
**Letzte Änderung:** 2026-01-25

---

## Base URL

- **Development:** `http://localhost:8080`
- **Production:** TBD

---

## Authentication

Aktuell: Keine Auth (GitHub Actions läuft im Protected Context)
Zukünftig: API Key via Header (falls external access)

```
Authorization: Bearer <api_key>
```

---

## Endpoints

### Health Check

**Zweck:** System-Status prüfen

```http
GET /health
```

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "aider": "ok",
    "github": "ok"
  }
}
```

**Response 503:**
```json
{
  "status": "error",
  "timestamp": "2026-01-25T12:00:00Z",
  "error": "Service unavailable"
}
```

---

## Code Agent - File Operations

### List Files

**Zweck:** Liste alle Dateien in einem Verzeichnis

```http
GET /api/v1/files?path=src
```

**Query Parameters:**
- `path` (optional): Relativer Pfad vom Projekt-Root (default: ".")
- `recursive` (optional): Boolean, rekursiv listen (default: false)

**Response 200:**
```json
{
  "path": "src",
  "files": [
    {
      "name": "index.js",
      "type": "file",
      "size": 1234,
      "modified": "2026-01-25T12:00:00Z"
    },
    {
      "name": "utils",
      "type": "directory"
    }
  ]
}
```

**Response 400:**
```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path traversal not allowed"
  }
}
```

---

### Read File

**Zweck:** Lese Inhalt einer Datei

```http
GET /api/v1/files/content?path=src/index.js
```

**Query Parameters:**
- `path` (required): Relativer Pfad zur Datei

**Response 200:**
```json
{
  "path": "src/index.js",
  "content": "const express = require('express');\n...",
  "encoding": "utf8",
  "size": 1234,
  "modified": "2026-01-25T12:00:00Z"
}
```

**Response 404:**
```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: src/index.js"
  }
}
```

---

### Write File

**Zweck:** Schreibe oder aktualisiere eine Datei

```http
POST /api/v1/files/content
Content-Type: application/json

{
  "path": "src/newfile.js",
  "content": "console.log('Hello');",
  "createDirs": true
}
```

**Request Body:**
- `path` (required): Relativer Pfad zur Datei
- `content` (required): Datei-Inhalt
- `createDirs` (optional): Erstelle Verzeichnisse falls nötig (default: false)

**Response 200:**
```json
{
  "path": "src/newfile.js",
  "size": 22,
  "created": true,
  "modified": "2026-01-25T12:00:00Z"
}
```

**Response 400:**
```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path traversal not allowed"
  }
}
```

---

### Delete File

**Zweck:** Lösche eine Datei

```http
DELETE /api/v1/files/content?path=src/oldfile.js
```

**Query Parameters:**
- `path` (required): Relativer Pfad zur Datei

**Response 200:**
```json
{
  "path": "src/oldfile.js",
  "deleted": true
}
```

**Response 404:**
```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: src/oldfile.js"
  }
}
```

---

## Future Endpoints (Phase 2)

### Trigger Build

```http
POST /api/v1/builds
Content-Type: application/json

{
  "task": "Create login page with React",
  "priority": "normal"
}
```

**Response 202:**
```json
{
  "build_id": "build_abc123",
  "status": "queued",
  "created_at": "2026-01-25T12:00:00Z"
}
```

---

### Get Build Status

```http
GET /api/v1/builds/{build_id}
```

**Response 200:**
```json
{
  "build_id": "build_abc123",
  "status": "running",
  "task": "Create login page with React",
  "started_at": "2026-01-25T12:01:00Z",
  "progress": {
    "files_changed": 3,
    "commits": 1
  }
}
```

---

## Error Responses

Alle Errors folgen diesem Schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

**Error Codes:**
- `INVALID_INPUT` - 400
- `INVALID_PATH` - 400
- `UNAUTHORIZED` - 401
- `NOT_FOUND` - 404
- `FILE_NOT_FOUND` - 404
- `RATE_LIMIT` - 429
- `SERVER_ERROR` - 500

---

## Security

### Path Traversal Protection

Alle File Operations validieren Pfade:
- Keine `..` Segmente erlaubt
- Nur relative Pfade vom Projekt-Root
- Whitelist von erlaubten Verzeichnissen

### File Size Limits

- Max File Size: 10MB
- Max Files per Request: 100

---

## Rate Limiting

- **Default:** 100 requests/minute
- **File Operations:** 50 requests/minute
- **Header:** `X-RateLimit-Remaining`

---

## Versioning

API Version in URL: `/api/v1/...`

Breaking Changes → Neue Version (v2)
