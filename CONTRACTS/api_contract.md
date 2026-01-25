# API Contract - Code Cloud Agents

> **Contract-First:** Diese Datei definiert ALLE API Endpoints.
> Änderungen hier MÜSSEN vor Code-Implementierung dokumentiert werden.

**Version:** 1.0.0
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
- `UNAUTHORIZED` - 401
- `NOT_FOUND` - 404
- `RATE_LIMIT` - 429
- `SERVER_ERROR` - 500

---

## Rate Limiting

- **Default:** 100 requests/minute
- **Header:** `X-RateLimit-Remaining`

---

## Versioning

API Version in URL: `/api/v1/...`

Breaking Changes → Neue Version (v2)
