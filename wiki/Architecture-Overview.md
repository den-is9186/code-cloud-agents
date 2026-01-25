# Architecture Overview

Diese Seite beschreibt die Architektur des Code Cloud Agents Systems.

## 🏗️ System-Übersicht

Code Cloud Agents ist ein verteiltes, AI-gesteuertes Code-Generation-System mit folgenden Hauptkomponenten:

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Actions                        │
│  ┌────────────────┐      ┌──────────────────────────────┐  │
│  │ Auto-Build     │ ──▶  │  Aider AI + Claude Sonnet 4 │  │
│  │ Workflow       │      │                              │  │
│  └────────────────┘      └──────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────┘
                                 │ Commits & Pushes
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│  ┌───────────┐  ┌──────────┐  ┌────────────┐               │
│  │ CONTRACTS │  │ src/     │  │ tests/     │               │
│  └───────────┘  └──────────┘  └────────────┘               │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express API Server                         │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │ File Ops     │  │ Task Queue    │  │ Agent State Mgmt │ │
│  └──────────────┘  └───────────────┘  └──────────────────┘ │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Redis State Store                       │
│  • Agent Execution States                                    │
│  • Task Queue Metadata                                       │
│  • Session Management                                        │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Komponenten

### 1. GitHub Actions Workflow

**Datei**: `.github/workflows/auto-build.yml`

**Verantwortlichkeiten**:
- Scheduled Builds alle 3 Minuten
- Manual Workflow Dispatch
- Task Queue Processing
- Aider AI Ausführung
- Auto-Commit & Push

**Trigger**:
- **Schedule**: Cron `*/3 * * * *` (alle 3 Minuten)
- **Manual**: Workflow Dispatch mit Task-Input
- **Queue**: Verarbeitet `task-queue.txt`

### 2. Aider AI Engine

**Integration**: Python-basiertes CLI-Tool

**Features**:
- Claude Sonnet 4 / Opus 4 Integration
- Auto-Commit Funktion
- Multi-File Editing
- Context-Aware Code Generation

**Configuration**:
```yaml
model: claude-sonnet-4-5-20250929
auto-commits: true
yes-mode: true
```

### 3. Express API Server

**Datei**: `src/index.js`

**Endpoints**:
- `/health` - Health Check
- `/api/v1/agent/*` - Agent State Management
- `/api/v1/supervisor/*` - Task Queue Management
- `/api/v1/files/*` - File Operations

**Middleware**:
- JSON Body Parser (max 10MB)
- Request Timeout (30s)
- Path Validation
- Error Handling

### 4. Redis State Store

**Verwendung**:
- Agent Execution States (TTL: 24h)
- Task Queue Metadata
- Session Management
- State Index

**Key Patterns**:
```
agent:state:{agentId}       # Agent State
agent:states:index          # Set of all agent IDs
task:queue:{taskId}         # Task Metadata
```

## 🔄 Datenfluss

### Task Processing Flow

```
1. Task wird zur Queue hinzugefügt
   └── task-queue.txt oder API POST /api/v1/supervisor/queue

2. GitHub Actions Workflow (alle 3 Min oder manual)
   ├── Liest task-queue.txt
   ├── Nimmt erste Task
   └── Triggert Aider AI

3. Aider AI
   ├── Analysiert Task
   ├── Generiert Code
   ├── Führt Tests aus
   └── Commitet Changes

4. Workflow
   ├── Pusht Changes zu GitHub
   ├── Entfernt Task aus Queue
   └── Updated Build Summary

5. API Server (optional)
   ├── Tracked Agent State
   ├── Stored Metadata
   └── Provides Status Updates
```

### Agent State Lifecycle

```
CREATE State
   │
   ├─▶ status: "pending"
   │   progress: 0
   │
   ▼
UPDATE State
   │
   ├─▶ status: "running"
   │   progress: 0-100
   │
   ▼
COMPLETE/FAIL
   │
   ├─▶ status: "completed" / "failed"
   │   progress: 100 / error
   │
   ▼
DELETE or EXPIRE (TTL: 24h)
```

## 🧩 Multi-Agent System (Phase 2)

```
                    ┌─────────────────┐
                    │   SUPERVISOR    │
                    │  (Coordinator)  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼────┐      ┌─────▼──────┐     ┌────▼────┐
     │ARCHITECT│      │   COACH    │     │   QA    │
     │(Design) │      │ (Planning) │     │(Review) │
     └────┬────┘      └─────┬──────┘     └────┬────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                      ┌──────▼───────┐
                      │  CODE AGENT  │
                      │(Implement)   │
                      └──────────────┘
```

**Agent Typen**:

| Agent | Rolle | Tools | Status |
|-------|-------|-------|--------|
| **Supervisor** | Koordiniert alle Agents | Alle Tools | 🔴 Planned |
| **Architect** | System Design | Read/Write, LLM | 🔴 Planned |
| **Coach** | Task Planning | Read, LLM | 🔴 Planned |
| **Code** | Implementation | File Ops, Git, Test | ✅ Active (Aider) |
| **Review** | Code Review | Read, LLM | 🔴 Planned |
| **Test** | Testing | Test Runner, File Ops | 🔴 Planned |
| **Docs** | Documentation | Read/Write, LLM | 🔴 Planned |

## 🔒 Security Architecture

### Path Validation

```javascript
// Sicherheitsmaßnahmen für File Operations
1. Normalisierung des Pfads
2. Entfernung von ".." Segmenten
3. Whitelist erlaubter Verzeichnisse
4. Prüfung ob Pfad innerhalb PROJECT_ROOT
```

**Erlaubte Verzeichnisse**:
- `src/`
- `tests/`
- `CONTRACTS/`
- `ops/`

### Secrets Management

- **GitHub Secrets** für API Keys (ANTHROPIC_API_KEY)
- **Environment Variables** für Configuration
- **No Secrets in Code** - Enforcement via CI
- **Gitignore** für `.env` Files

## 📊 Datenmodelle

### Agent State Schema

```typescript
interface AgentState {
  agentId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  metadata: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  errorHistory?: ErrorEntry[];
  createdAt: string; // ISO 8601
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  retriedAt?: string;
}
```

### Task Queue Item

```typescript
interface TaskQueueItem {
  index: number;
  task: string;
  taskId: string;
  state: AgentState | null;
}
```

## 🔄 Contract-First Architecture

```
1. Definiere Contracts
   ├── CONTRACTS/api_contract.md
   └── CONTRACTS/data_contract.md

2. Implementiere Backend
   └── src/ (basierend auf Contracts)

3. Schreibe Tests
   └── tests/ (basierend auf Contracts)

4. Validiere Contracts
   └── CONTRACT_VERIFICATION.md
```

**Regel**: NIEMALS Code vor Contract-Definition!

## 🚀 Deployment Architecture

```
Development:
  └── Local Machine
      ├── Express Server (localhost:3000)
      └── Redis (localhost:6379)

CI/CD:
  └── GitHub Actions
      ├── Auto-Build Workflow
      └── Tests & Linting

Production (Phase 2):
  └── Cloud Provider (TBD)
      ├── Server (Vercel / Render / Fly)
      ├── Redis (Upstash / Redis Cloud)
      └── Monitoring (TBD)
```

## 📈 Skalierbarkeit

### Aktuelle Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Max File Size | 10 MB | API Body Limit |
| Request Timeout | 30s | Response Time |
| Agent State TTL | 24h | Garbage Collection |
| Queue Size | Unbounded | File-Based |
| Max Retries | 3 | Error Recovery |

### Zukünftige Skalierung (Phase 2)

- **Horizontale Skalierung**: Multiple Worker Nodes
- **Database**: PostgreSQL für Production
- **Queue**: Redis Queue oder Bull
- **Load Balancer**: Nginx oder Cloud LB

## 📚 Weitere Ressourcen

- **[Multi-Agent System](Multi-Agent-System.md)** - Detaillierte Agent-Architektur
- **[API Reference](API-Reference.md)** - API Endpoints
- **[Contracts System](Contracts-System.md)** - Contract-First Details
- **[Security Best Practices](Security-Best-Practices.md)** - Security Guidelines

---

**Vorheriges**: [Getting Started](Getting-Started.md)  
**Nächstes**: [Multi-Agent System](Multi-Agent-System.md) →
