# API Contract - Multi-Agent System

> **REGEL:** Frontend und Backend dürfen NUR das verwenden, was hier steht.
> Änderungen nur mit expliziter Genehmigung: `ÄNDERUNG ERLAUBT: ...`

**Version:** 2.0.0  
**Letzte Änderung:** 2026-01-25

---

## Konventionen

### Request Format
- Content-Type: `application/json`
- Auth: `Authorization: Bearer <token>`

### Response Format
```json
// Erfolg
{
  "data": { ... }
}

// Liste
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Beschreibung",
    "details": { "field": "Fehler" }
  }
}
```

### HTTP Status Codes
| Code | Bedeutung |
|------|-----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (z.B. falscher Workflow-Status) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## SYSTEM ENDPOINTS (PFLICHT)

### GET /health
**Auth:** Keine  
**Rate Limit:** Keine

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T12:00:00Z",
  "version": "2.0.0",
  "services": {
    "redis": { "status": "connected", "latency_ms": 2 },
    "github": { "status": "connected", "rate_limit_remaining": 4500 }
  }
}
```

### GET /api-docs
**Auth:** Keine  
**Response:** Swagger UI HTML

---

## TEAM ENDPOINTS

### GET /api/teams
**Auth:** Required  
**Beschreibung:** Liste aller Teams

**Query Parameters:**
- `status` (optional): Filter by workflow status
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response 200:**
```json
{
  "data": [
    {
      "id": "team_abc123",
      "name": "My Project",
      "repo": "owner/repo",
      "preset": "A",
      "workflow": {
        "phase": "AWAITING_APPROVAL",
        "started_at": "2026-01-25T10:00:00Z"
      },
      "created_at": "2026-01-25T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

---

### POST /api/teams
**Auth:** Required  
**Beschreibung:** Neues Team erstellen

**Request:**
```json
{
  "name": "My Project",
  "repo": "owner/repo",
  "preset": "A",
  "default_workflow": {
    "prototype_preset": "A",
    "premium_preset": "C",
    "auto_start_prototype": true
  }
}
```

**Response 201:**
```json
{
  "data": {
    "id": "team_abc123",
    "name": "My Project",
    "repo": "owner/repo",
    "preset": "A",
    "workflow": {
      "phase": "TEAM_CREATED",
      "prototype": null,
      "premium": null
    },
    "approval": {
      "required": true,
      "status": "pending"
    },
    "created_at": "2026-01-25T09:00:00Z"
  }
}
```

**Errors:** 400 (Validation), 401 (Unauthorized)

---

### GET /api/teams/:id
**Auth:** Required  
**Beschreibung:** Team-Details mit aktuellem Status

**Response 200:**
```json
{
  "data": {
    "id": "team_abc123",
    "name": "My Project",
    "repo": "owner/repo",
    "preset": "A",
    "custom_agents": null,
    "workflow": {
      "phase": "AWAITING_APPROVAL",
      "prototype": {
        "started_at": "2026-01-25T10:00:00Z",
        "completed_at": "2026-01-25T10:15:00Z",
        "preset": "A",
        "build_id": "build_123",
        "cost": 8.50,
        "quality_score": 71
      },
      "premium": null
    },
    "approval": {
      "required": true,
      "status": "pending",
      "approved_by": null,
      "approved_at": null,
      "comment": null
    },
    "created_at": "2026-01-25T09:00:00Z",
    "updated_at": "2026-01-25T10:15:00Z"
  }
}
```

**Errors:** 404 (Not Found)

---

### PUT /api/teams/:id
**Auth:** Required  
**Beschreibung:** Team aktualisieren

**Request:**
```json
{
  "name": "Updated Project Name",
  "preset": "B"
}
```

**Response 200:**
```json
{
  "data": {
    "id": "team_abc123",
    "name": "Updated Project Name",
    "preset": "B",
    "updated_at": "2026-01-25T11:00:00Z"
  }
}
```

**Errors:** 400, 404

---

### DELETE /api/teams/:id
**Auth:** Required  
**Beschreibung:** Team löschen

**Response 204:** (No Content)

**Errors:** 404

---

## WORKFLOW CONTROL ENDPOINTS

### GET /api/teams/:id/status
**Auth:** Required  
**Beschreibung:** Aktueller Workflow-Status

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "phase": "AWAITING_APPROVAL",
    "available_actions": ["approve", "reject", "partial", "skip-premium"],
    "prototype": {
      "status": "completed",
      "build_id": "build_123",
      "started_at": "2026-01-25T10:00:00Z",
      "completed_at": "2026-01-25T10:15:00Z",
      "cost": 8.50,
      "quality_score": 71,
      "duration_seconds": 900
    },
    "premium": null,
    "total_cost": 8.50
  }
}
```

---

### POST /api/teams/:id/start
**Auth:** Required  
**Beschreibung:** Workflow starten (falls nicht auto-start)

**Request:**
```json
{
  "requirements": "Build a REST API for user management"
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "phase": "PROTOTYPE_RUNNING",
    "prototype": {
      "status": "running",
      "build_id": "build_123",
      "started_at": "2026-01-25T10:00:00Z"
    }
  }
}
```

**Errors:** 409 (Already running), 400 (Missing requirements)

---

### POST /api/teams/:id/approve
**Auth:** Required  
**Beschreibung:** Prototype genehmigen → Premium starten

**Precondition:** `phase == AWAITING_APPROVAL`

**Request:**
```json
{
  "comment": "Looks good, proceed to premium"
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "phase": "PREMIUM_RUNNING",
    "approval": {
      "status": "approved",
      "approved_by": "user_xyz",
      "approved_at": "2026-01-25T11:00:00Z",
      "comment": "Looks good, proceed to premium"
    },
    "premium": {
      "status": "running",
      "build_id": "build_456",
      "started_at": "2026-01-25T11:00:00Z"
    }
  }
}
```

**Errors:** 409 (Wrong phase), 400 (Validation)

---

### POST /api/teams/:id/reject
**Auth:** Required  
**Beschreibung:** Prototype ablehnen → Neu starten mit neuen Requirements

**Precondition:** `phase == AWAITING_APPROVAL`

**Request:**
```json
{
  "reason": "Missing error handling",
  "new_requirements": "Add comprehensive error handling and logging"
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "phase": "PROTOTYPE_RUNNING",
    "approval": {
      "status": "rejected",
      "rejected_by": "user_xyz",
      "rejected_at": "2026-01-25T11:00:00Z",
      "reason": "Missing error handling"
    },
    "prototype": {
      "status": "running",
      "build_id": "build_789",
      "iteration": 2,
      "started_at": "2026-01-25T11:00:00Z"
    }
  }
}
```

---

### POST /api/teams/:id/partial
**Auth:** Required  
**Beschreibung:** Teilweise anpassen und Phase 1 wiederholen

**Precondition:** `phase == AWAITING_APPROVAL`

**Request:**
```json
{
  "adjustments": "Add authentication middleware",
  "keep_existing": true
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "phase": "PROTOTYPE_RUNNING",
    "prototype": {
      "status": "running",
      "build_id": "build_999",
      "iteration": 2,
      "adjustment_mode": true
    }
  }
}
```

---

### POST /api/teams/:id/skip-premium
**Auth:** Required  
**Beschreibung:** Premium überspringen → Workflow beenden

**Precondition:** `phase == AWAITING_APPROVAL`

**Request:**
```json
{
  "reason": "Prototype is sufficient for MVP"
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "phase": "COMPLETED",
    "approval": {
      "status": "skipped",
      "reason": "Prototype is sufficient for MVP"
    },
    "workflow": {
      "completed_at": "2026-01-25T11:00:00Z",
      "total_cost": 8.50,
      "final_quality_score": 71
    }
  }
}
```

---

## CONFIGURATION ENDPOINTS

### GET /api/teams/:id/preset
**Auth:** Required  
**Beschreibung:** Aktuelles Preset mit Agent-Zuweisungen

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "preset": "A",
    "preset_details": {
      "name": "Budget",
      "cost_per_build": 8,
      "quality_score": 71,
      "error_rate": 0.12
    },
    "agents": {
      "supervisor": "deepseek-v3.2",
      "architect": "deepseek-r1",
      "coach": "deepseek-v3.2",
      "code": "deepseek-v3.2",
      "review": "deepseek-r1",
      "test": "deepseek-v3.2",
      "docs": "deepseek-v3.2"
    },
    "custom_overrides": null
  }
}
```

---

### PUT /api/teams/:id/preset
**Auth:** Required  
**Beschreibung:** Preset wechseln

**Request:**
```json
{
  "preset": "C"
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "preset": "C",
    "agents": {
      "supervisor": "claude-sonnet",
      "architect": "claude-opus",
      "coach": "deepseek-r1",
      "code": "claude-sonnet",
      "review": "claude-opus",
      "test": "deepseek-r1",
      "docs": "claude-sonnet"
    }
  }
}
```

**Errors:** 400 (Invalid preset), 409 (Build running)

---

### GET /api/teams/:id/agents
**Auth:** Required  
**Beschreibung:** Alle Agent-Konfigurationen

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "agents": [
      {
        "role": "supervisor",
        "model": "deepseek-v3.2",
        "is_custom": false,
        "config": {
          "max_retries": 3,
          "timeout_seconds": 300
        }
      },
      {
        "role": "architect",
        "model": "claude-opus",
        "is_custom": true,
        "config": {
          "max_retries": 2,
          "timeout_seconds": 600
        }
      }
    ]
  }
}
```

---

### PUT /api/teams/:id/agents/:agent
**Auth:** Required  
**Beschreibung:** Einzelnen Agent anpassen

**Request:**
```json
{
  "model": "claude-opus",
  "config": {
    "max_retries": 5,
    "timeout_seconds": 900
  }
}
```

**Response 200:**
```json
{
  "data": {
    "team_id": "team_abc123",
    "agent": "architect",
    "model": "claude-opus",
    "is_custom": true,
    "preset_default": "deepseek-r1"
  }
}
```

**Errors:** 400 (Invalid model), 404 (Unknown agent)

---

## BUILD ENDPOINTS

### GET /api/teams/:id/builds
**Auth:** Required  
**Beschreibung:** Build-Historie

**Query Parameters:**
- `limit` (default: 10, max: 50)
- `offset` (default: 0)

**Response 200:**
```json
{
  "data": [
    {
      "id": "build_456",
      "phase": "premium",
      "preset": "C",
      "status": "completed",
      "started_at": "2026-01-25T11:00:00Z",
      "completed_at": "2026-01-25T11:30:00Z",
      "duration_seconds": 1800,
      "cost": 130.00,
      "quality_score": 90,
      "agents_completed": 7,
      "agents_total": 7
    },
    {
      "id": "build_123",
      "phase": "prototype",
      "preset": "A",
      "status": "completed",
      "started_at": "2026-01-25T10:00:00Z",
      "completed_at": "2026-01-25T10:15:00Z",
      "duration_seconds": 900,
      "cost": 8.50,
      "quality_score": 71,
      "agents_completed": 7,
      "agents_total": 7
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "offset": 0,
    "has_more": false
  }
}
```

---

### GET /api/teams/:id/builds/:buildId
**Auth:** Required  
**Beschreibung:** Build-Details

**Response 200:**
```json
{
  "data": {
    "id": "build_456",
    "team_id": "team_abc123",
    "phase": "premium",
    "preset": "C",
    "status": "completed",
    "requirements": "Build a REST API for user management",
    "started_at": "2026-01-25T11:00:00Z",
    "completed_at": "2026-01-25T11:30:00Z",
    "duration_seconds": 1800,
    "cost": {
      "total": 130.00,
      "by_agent": {
        "supervisor": 2.50,
        "architect": 45.00,
        "coach": 1.50,
        "code": 35.00,
        "review": 30.00,
        "test": 1.50,
        "docs": 14.50
      }
    },
    "quality": {
      "overall_score": 90,
      "planning_score": 78,
      "code_score": 91,
      "review_score": 93
    },
    "agents": [
      {
        "role": "supervisor",
        "model": "claude-sonnet",
        "status": "completed",
        "started_at": "2026-01-25T11:00:00Z",
        "completed_at": "2026-01-25T11:02:00Z",
        "duration_seconds": 120,
        "tokens_used": 5000,
        "cost": 2.50
      }
    ],
    "artifacts": {
      "runbook": "https://github.com/owner/repo/blob/main/.agents/runbook.md",
      "pr_url": "https://github.com/owner/repo/pull/42",
      "commit_sha": "abc123def456"
    }
  }
}
```

---

### GET /api/teams/:id/builds/:buildId/logs
**Auth:** Required  
**Beschreibung:** Build-Logs (Streaming möglich)

**Query Parameters:**
- `agent` (optional): Filter by agent role
- `stream` (optional): `true` for SSE streaming

**Response 200 (JSON):**
```json
{
  "data": [
    {
      "timestamp": "2026-01-25T11:00:00Z",
      "agent": "supervisor",
      "level": "info",
      "message": "Starting build workflow",
      "metadata": { "preset": "C" }
    },
    {
      "timestamp": "2026-01-25T11:00:05Z",
      "agent": "supervisor",
      "level": "info",
      "message": "Dispatching to architect",
      "metadata": { "model": "claude-opus" }
    }
  ]
}
```

**Response 200 (SSE when `stream=true`):**
```
event: log
data: {"timestamp":"2026-01-25T11:00:00Z","agent":"supervisor","level":"info","message":"Starting build workflow"}

event: log
data: {"timestamp":"2026-01-25T11:00:05Z","agent":"architect","level":"info","message":"Analyzing requirements"}

event: complete
data: {"build_id":"build_456","status":"completed"}
```

---

### GET /api/teams/:id/builds/:buildId/cost
**Auth:** Required  
**Beschreibung:** Detaillierte Kostenaufstellung

**Response 200:**
```json
{
  "data": {
    "build_id": "build_456",
    "total_cost": 130.00,
    "currency": "USD",
    "breakdown": {
      "by_agent": {
        "supervisor": { "tokens": 5000, "cost": 2.50 },
        "architect": { "tokens": 45000, "cost": 45.00 },
        "coach": { "tokens": 3000, "cost": 1.50 },
        "code": { "tokens": 70000, "cost": 35.00 },
        "review": { "tokens": 30000, "cost": 30.00 },
        "test": { "tokens": 3000, "cost": 1.50 },
        "docs": { "tokens": 29000, "cost": 14.50 }
      },
      "by_model": {
        "claude-opus": { "tokens": 75000, "cost": 75.00 },
        "claude-sonnet": { "tokens": 104000, "cost": 52.00 },
        "deepseek-r1": { "tokens": 6000, "cost": 3.00 }
      }
    },
    "comparison": {
      "budget_preset_would_cost": 8.00,
      "savings_vs_direct_premium": "74%"
    }
  }
}
```

---

## PRESET REFERENCE ENDPOINT

### GET /api/presets
**Auth:** None (public)  
**Beschreibung:** Alle verfügbaren Presets

**Response 200:**
```json
{
  "data": [
    {
      "id": "A",
      "name": "Budget",
      "description": "Günstig, für erste Tests",
      "cost_per_build": 8,
      "quality_score": 71,
      "error_rate": 0.12,
      "agents": {
        "supervisor": "deepseek-v3.2",
        "architect": "deepseek-r1",
        "coach": "deepseek-v3.2",
        "code": "deepseek-v3.2",
        "review": "deepseek-r1",
        "test": "deepseek-v3.2",
        "docs": "deepseek-v3.2"
      }
    },
    {
      "id": "B",
      "name": "Optimal",
      "description": "Beste Balance Preis/Leistung",
      "cost_per_build": 25,
      "quality_score": 79,
      "error_rate": 0.08,
      "recommended": true
    },
    {
      "id": "C",
      "name": "Premium",
      "description": "Höchste Qualität, Production-ready",
      "cost_per_build": 130,
      "quality_score": 90,
      "error_rate": 0.02
    },
    {
      "id": "D",
      "name": "Smart",
      "description": "Starke Architektur, guter Code",
      "cost_per_build": 80,
      "quality_score": 86,
      "error_rate": 0.03
    },
    {
      "id": "E",
      "name": "Refactor",
      "description": "Spezialisiert auf Refactoring",
      "sub_presets": ["E1-Budget", "E2-Standard", "E3-Premium"]
    },
    {
      "id": "F",
      "name": "Merge",
      "description": "Spezialisiert auf Multi-Repo/Merge",
      "sub_presets": ["F1-Budget", "F2-Standard", "F3-Premium"]
    }
  ]
}
```

---

## MODEL REFERENCE ENDPOINT

### GET /api/models
**Auth:** None (public)  
**Beschreibung:** Alle verfügbaren Modelle

**Response 200:**
```json
{
  "data": [
    {
      "id": "deepseek-v3.2",
      "provider": "openrouter",
      "name": "DeepSeek V3.2",
      "cost_per_1m_tokens": { "input": 0.14, "output": 0.28 },
      "capabilities": ["coding", "reasoning"],
      "recommended_for": ["code", "test", "docs"]
    },
    {
      "id": "deepseek-r1",
      "provider": "openrouter",
      "name": "DeepSeek R1",
      "cost_per_1m_tokens": { "input": 0.55, "output": 2.19 },
      "capabilities": ["deep-reasoning", "architecture"],
      "recommended_for": ["architect", "review"]
    },
    {
      "id": "claude-haiku",
      "provider": "anthropic",
      "name": "Claude 3.5 Haiku",
      "cost_per_1m_tokens": { "input": 0.80, "output": 4.00 },
      "capabilities": ["fast", "reliable"],
      "recommended_for": ["supervisor", "docs"]
    },
    {
      "id": "claude-sonnet",
      "provider": "anthropic",
      "name": "Claude Sonnet 4",
      "cost_per_1m_tokens": { "input": 3.00, "output": 15.00 },
      "capabilities": ["coding", "reasoning", "review"],
      "recommended_for": ["code", "review"]
    },
    {
      "id": "claude-opus",
      "provider": "anthropic",
      "name": "Claude Opus 4",
      "cost_per_1m_tokens": { "input": 15.00, "output": 75.00 },
      "capabilities": ["architecture", "complex-reasoning", "review"],
      "recommended_for": ["architect", "review"]
    }
  ]
}
```

---

## WEBSOCKET ENDPOINTS

### WS /ws/teams/:id/builds/:buildId
**Auth:** Token as query param  
**Beschreibung:** Real-time Build Updates

**Messages (Server → Client):**
```json
// Agent startet
{
  "type": "agent_started",
  "agent": "architect",
  "model": "claude-opus",
  "timestamp": "2026-01-25T11:00:05Z"
}

// Agent Progress
{
  "type": "agent_progress",
  "agent": "architect",
  "progress": 0.45,
  "message": "Analyzing requirements..."
}

// Agent fertig
{
  "type": "agent_completed",
  "agent": "architect",
  "duration_seconds": 180,
  "cost": 45.00,
  "timestamp": "2026-01-25T11:03:05Z"
}

// Build fertig
{
  "type": "build_completed",
  "build_id": "build_456",
  "status": "completed",
  "total_cost": 130.00,
  "quality_score": 90
}

// Approval benötigt
{
  "type": "approval_required",
  "team_id": "team_abc123",
  "prototype_build_id": "build_123",
  "quality_score": 71
}

// Fehler
{
  "type": "error",
  "agent": "code",
  "message": "Model timeout",
  "retry_count": 2
}
```

---

## Changelog

| Datum | Änderung | Genehmigt von |
|-------|----------|---------------|
| 2026-01-25 | Initial v2.0.0 - Multi-Agent System | System |
