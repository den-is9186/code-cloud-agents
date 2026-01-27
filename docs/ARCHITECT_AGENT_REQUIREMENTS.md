# 🏗️ ARCHITECT AGENT - Detaillierte Anforderungen

## 📋 ÜBERBLICK

**Rolle:** Der Architekt - Erstellt technischen Bauplan (Runbook)

**Status:** ❌ Nicht aktiv im Orchestrator (executeAgent wirft Error)

**Kritikalität:** HOCH - Ohne Runbook kann Coach keine Tasks aufteilen

---

## 🎯 AUFGABENGEBIET

### Hauptverantwortlichkeiten:

1. **Architecture Design**
   - Technische Architektur designen
   - Software-Patterns anwenden (MVC, Microservices, etc.)
   - Datenmodelle definieren
   - API-Contracts erstellen

2. **Runbook Creation**
   - Schritt-für-Schritt Implementierungsplan erstellen
   - Steps mit IDs, Descriptions, Files
   - Jeder Step hat klares Ziel
   - Steps sind atomar und testbar

3. **File Mapping**
   - Identifizieren welche Files geändert werden müssen
   - Neue Files die erstellt werden müssen
   - Dependencies zwischen Files

4. **Dependency Management**
   - Abhängigkeiten zwischen Steps definieren
   - Step 2 kann erst nach Step 1
   - Parallel-fähige Steps markieren

5. **Risk Assessment**
   - Breaking Changes identifizieren
   - Migration-Strategien planen
   - Rollback-Optionen definieren

---

## 🛠️ SKILLS (was der Agent kann)

### 1. Code Architecture Understanding
- Versteht bestehende Codebase-Struktur
- Erkennt Patterns: MVC, Clean Architecture, Microservices
- Liest package.json, tsconfig.json für Tech-Stack
- Versteht Folder-Strukturen

### 2. Technical Planning
```typescript
Erstellt Runbook mit:
- Sequential Steps (1 → 2 → 3)
- Parallel-fähige Steps
- Estimated Tokens pro Step
- Expected Outcomes pro Step
- File-Liste pro Step
```

### 3. Best Practices Application
- SOLID Principles
- DRY (Don't Repeat Yourself)
- Separation of Concerns
- Security Best Practices (OWASP)

### 4. Framework Knowledge
- TypeScript/JavaScript (Node.js, React, Express)
- Python (FastAPI, Django, Flask)
- Go (Standard Lib, Gin)
- Databases (PostgreSQL, MongoDB, Redis)

### 5. API Design
- RESTful APIs
- GraphQL
- WebSockets
- Contract-First Design

---

## 📥 INPUT INTERFACE

**Was der Agent braucht:**

```typescript
interface ArchitectInput {
  task: string;                    // User Task
  taskAnalysis: TaskAnalysis;      // Von Supervisor
  projectPath: string;             // Projekt-Pfad
  existingFiles?: string[];        // Bestehende Files (optional)
  constraints?: {
    maxSteps?: number;             // Max Steps im Runbook
    avoidBreakingChanges?: boolean;
    requireTests?: boolean;
  };
}

interface TaskAnalysis {
  taskType: string;                // feature, fix, refactor, etc.
  complexity: 'low' | 'medium' | 'high';
  description: string;
  repos: string[];
  estimatedTokens: number;
}
```

**Beispiel:**
```typescript
{
  task: "Add user authentication with JWT",
  taskAnalysis: {
    taskType: "feature",
    complexity: "high",
    description: "Implement JWT-based auth",
    repos: ["backend-api"],
    estimatedTokens: 50000
  },
  projectPath: "/Users/user/backend-api",
  constraints: {
    maxSteps: 8,
    avoidBreakingChanges: true,
    requireTests: true
  }
}
```

---

## 📤 OUTPUT INTERFACE

**Was der Agent zurückgibt:**

```typescript
interface ArchitectOutput {
  // Runbook (Hauptoutput)
  runbook: {
    steps: Step[];
    totalSteps: number;
    estimatedTotalTokens: number;
  };

  // Technical Decisions
  technicalDecisions: TechnicalDecision[];

  // Risks & Migrations
  risks: Risk[];
  migrations?: Migration[];

  // Architecture Diagram (optional)
  architectureDiagram?: string;  // Mermaid oder PlantUML
}

interface Step {
  id: string;                    // "step-1", "step-2"
  description: string;           // "Create User model"
  files: string[];               // ["src/models/user.ts"]
  expectedOutcome: string;       // "User model with email, password fields"
  estimatedTokens: number;       // 5000
  dependencies: string[];        // ["step-0"] oder []
  parallel: boolean;             // true wenn parallel zu anderen
}

interface TechnicalDecision {
  decision: string;              // "Use bcrypt for password hashing"
  reason: string;                // "Industry standard, secure"
  alternatives: string[];        // ["argon2", "scrypt"]
}

interface Risk {
  type: 'breaking-change' | 'security' | 'performance' | 'complexity';
  description: string;
  mitigation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Migration {
  from: string;                  // "No auth"
  to: string;                    // "JWT auth"
  steps: string[];               // Migration steps
  rollback: string;              // Rollback strategy
}
```

**Beispiel Output:**
```typescript
{
  runbook: {
    steps: [
      {
        id: "step-1",
        description: "Create User model with email, password, timestamps",
        files: ["src/models/user.ts"],
        expectedOutcome: "TypeScript User interface with proper types",
        estimatedTokens: 3000,
        dependencies: [],
        parallel: false
      },
      {
        id: "step-2",
        description: "Create AuthService with login/register/verify methods",
        files: ["src/services/auth.ts"],
        expectedOutcome: "AuthService class with JWT generation",
        estimatedTokens: 8000,
        dependencies: ["step-1"],
        parallel: false
      },
      {
        id: "step-3",
        description: "Create auth middleware for protected routes",
        files: ["src/middleware/auth.ts"],
        expectedOutcome: "Express middleware that validates JWT",
        estimatedTokens: 4000,
        dependencies: ["step-2"],
        parallel: false
      },
      {
        id: "step-4",
        description: "Create auth routes (POST /login, POST /register)",
        files: ["src/routes/auth.ts"],
        expectedOutcome: "RESTful auth endpoints",
        estimatedTokens: 5000,
        dependencies: ["step-2"],
        parallel: true
      }
    ],
    totalSteps: 4,
    estimatedTotalTokens: 20000
  },
  technicalDecisions: [
    {
      decision: "Use bcrypt for password hashing",
      reason: "Industry standard, well-tested, secure against timing attacks",
      alternatives: ["argon2", "scrypt", "pbkdf2"]
    },
    {
      decision: "JWT stored in httpOnly cookies",
      reason: "Prevents XSS attacks, secure storage",
      alternatives: ["localStorage", "sessionStorage"]
    }
  ],
  risks: [
    {
      type: "security",
      description: "JWT secret must be strong and never committed to git",
      mitigation: "Use env vars, generate random 256-bit secret",
      severity: "critical"
    },
    {
      type: "breaking-change",
      description: "All existing endpoints need to add auth middleware",
      mitigation: "Phase migration, keep legacy endpoints temporarily",
      severity: "high"
    }
  ],
  migrations: [
    {
      from: "No authentication",
      to: "JWT-based authentication",
      steps: [
        "1. Add auth middleware to routes",
        "2. Update API clients to send JWT",
        "3. Test all endpoints",
        "4. Remove legacy unprotected endpoints"
      ],
      rollback: "Remove auth middleware, revert to previous state"
    }
  ]
}
```

---

## ❌ AKTUELLES PROBLEM

### Im Orchestrator (src/services/agent-orchestrator.ts):

**Zeile ~832:**
```typescript
case 'architect':
  throw new Error(`Agent architect not yet implemented in MVP`);
```

**Problem:**
1. ❌ Agent wird nicht aufgerufen
2. ❌ Runbook wird nicht erstellt
3. ❌ Coach hat keinen Plan zum Aufteilen
4. ❌ Code Agent weiß nicht welche Files zu erstellen
5. ❌ Pipeline kann nicht fortfahren

---

## ✅ WAS BENÖTIGT WIRD

### Schritt 1: Input/Output Interfaces exportieren

**In src/agents/architect.ts:**

```typescript
// VORHER (private):
interface ArchitectInput { ... }
interface ArchitectOutput { ... }
interface Step { ... }
interface TechnicalDecision { ... }
interface Risk { ... }

// NACHHER (public):
export interface ArchitectInput { ... }
export interface ArchitectOutput { ... }
export interface Step { ... }
export interface TechnicalDecision { ... }
export interface Risk { ... }
```

---

### Schritt 2: Interfaces im Orchestrator importieren

**In src/services/agent-orchestrator.ts:**

```typescript
import {
  ArchitectAgent,
  type ArchitectInput,
  type ArchitectOutput,
  type Step as ArchitectStep
} from '../agents/architect.js';
```

---

### Schritt 3: PipelineContext erweitern

**In src/services/agent-orchestrator.ts:**

```typescript
interface PipelineContext {
  // NEU hinzufügen:
  runbook?: {
    steps: ArchitectStep[];
    totalSteps: number;
    estimatedTotalTokens: number;
  };
  technicalDecisions?: TechnicalDecision[];
  risks?: Risk[];

  // ... existing fields
  supervisorAnalysis?: TaskAnalysis;
  filesChanged: AgentFileChange[];
  lastReviewOutput?: ReviewOutput;
  reviewRetries: number;
  codeApproved: boolean;
}
```

---

### Schritt 4: executeAgent() Case schreiben

**In src/services/agent-orchestrator.ts - executeAgent():**

```typescript
case 'architect': {
  const architectAgent = agent as ArchitectAgent;

  // Validate prerequisites
  if (!context.supervisorAnalysis) {
    throw new Error('Architect agent requires supervisorAnalysis from Supervisor');
  }

  // Build Input
  const architectInput: ArchitectInput = {
    task: task,
    taskAnalysis: context.supervisorAnalysis,
    projectPath: projectPath,
    constraints: {
      maxSteps: 10,
      avoidBreakingChanges: false,
      requireTests: true,
    },
  };

  // Execute Agent
  const output: ArchitectOutput = await architectAgent.execute(architectInput);

  // Validate Output
  if (!output.runbook || output.runbook.steps.length === 0) {
    throw new Error('Architect failed to create runbook');
  }

  // Store in Context for Coach
  context.runbook = output.runbook;
  context.technicalDecisions = output.technicalDecisions;
  context.risks = output.risks;

  // Log important risks
  const criticalRisks = output.risks.filter(r => r.severity === 'critical');
  if (criticalRisks.length > 0) {
    logger.warn('Critical risks identified', {
      agent: 'architect',
      risks: criticalRisks.map(r => r.description),
    });
  }

  // Build Result
  result = {
    inputTokens: 0, // TODO: Get from LLM
    outputTokens: 0,
    duration: Date.now() - startTime,
    output: output as unknown as Record<string, unknown>,
    runbook: output.runbook.steps.map((s, idx) => ({
      step: idx + 1,
      description: s.description,
    })),
  };

  break;
}
```

---

### Schritt 5: Error Handling

**Architect Failures = HARD FAIL (Pipeline stoppt):**

```typescript
// In executeAgentSequence():
if (['supervisor', 'architect', 'coach', 'code', 'review'].includes(agentName)) {
  // Hard failure - stop pipeline
  result.success = false;
  throw error;
}
```

**Warum HARD FAIL?**
- Ohne Runbook kann Coach keine Tasks erstellen
- Ohne technische Entscheidungen kann Code Agent nicht implementieren
- Pipeline ist blockiert

---

## 🔑 CHARAKTERISTIKEN

| Eigenschaft | Wert |
|-------------|------|
| **Rolle** | Technischer Architekt & Planner |
| **Input** | Task + TaskAnalysis von Supervisor |
| **Output** | Runbook (Steps) + Technical Decisions + Risks |
| **Model** | Claude Sonnet-4 / GPT-4 (braucht Code-Verständnis) |
| **Durchschnittliche Tokens** | Input: 3000-5000 / Output: 2000-4000 |
| **Durchschnittliche Kosten** | $0.05 - $0.15 pro Ausführung |
| **Durchschnittliche Dauer** | 5-10 Sekunden |
| **Kritikalität** | 🔴 HOCH - Coach braucht Runbook |
| **Failure Handling** | HARD FAIL (stoppt Pipeline) |
| **Retry-fähig** | Ja (max 2 Retries) |

---

## 🎯 EXECUTION FLOW

```
┌─────────────────────────────────────┐
│  Input: TaskAnalysis vom Supervisor │
│  - Type: feature                     │
│  - Complexity: high                  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      ARCHITECT AGENT STARTET         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Analysiert Tech-Stack:              │
│  - package.json lesen                │
│  - Folder-Struktur analysieren       │
│  - Dependencies prüfen               │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Designt Architektur:                │
│  - User Model erstellen              │
│  - AuthService implementieren        │
│  - Middleware hinzufügen             │
│  - Routes definieren                 │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Erstellt Runbook:                   │
│  Step 1: Create User Model           │
│  Step 2: Create AuthService          │
│  Step 3: Create Auth Middleware      │
│  Step 4: Create Auth Routes          │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Identifiziert Risks:                │
│  - JWT Secret must be secure         │
│  - Breaking changes to API           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Output → PipelineContext speichern  │
│  context.runbook = {...}             │
│  context.risks = [...]               │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      Nächster Agent: COACH           │
└─────────────────────────────────────┘
```

---

## 🧪 TEST-SZENARIEN

### Test 1: Simple Feature (Low Complexity)
```typescript
Input: "Add a /health endpoint"
Expected Runbook:
- 1 Step: Create health.ts route
- No breaking changes
- Low risk
```

### Test 2: Medium Feature
```typescript
Input: "Add pagination to user list"
Expected Runbook:
- Step 1: Update User query with limit/offset
- Step 2: Create pagination helper
- Step 3: Update API response format
- Medium risk (API response changes)
```

### Test 3: Complex Feature
```typescript
Input: "Implement real-time chat"
Expected Runbook:
- Step 1: Add Socket.IO dependency
- Step 2: Create WebSocket server
- Step 3: Create Chat model
- Step 4: Implement message broadcasting
- Step 5: Create chat routes
- High risk (new tech stack, breaking changes)
```

### Test 4: Refactor
```typescript
Input: "Refactor auth service to use dependency injection"
Expected Runbook:
- Step 1: Create IoC container
- Step 2: Refactor AuthService constructor
- Step 3: Update all imports
- High risk (breaks existing code)
```

---

## 📊 METRIKEN ZU TRACKEN

### Performance Metriken:
- Durchschnittliche Steps im Runbook
- Token Usage pro Step
- Execution Time
- Cost per Runbook

### Quality Metriken:
- % Steps die erfolgreich ausgeführt werden
- % korrekte File-Identifikation
- % korrekte Risk-Identifikation

### Business Metriken:
- Time Saved durch gute Planung
- Cost Savings durch optimale Step-Aufteilung

---

## 🚀 IMPLEMENTIERUNGS-REIHENFOLGE

1. ✅ **Interfaces exportieren** (5 min)
2. ✅ **Interfaces importieren im Orchestrator** (2 min)
3. ✅ **PipelineContext erweitern** (3 min)
4. ✅ **executeAgent() Case schreiben** (15 min)
5. ✅ **Error Handling hinzufügen** (5 min)
6. ✅ **Risk Logging hinzufügen** (5 min)
7. ✅ **Testen mit einfachem Task** (5 min)

**Gesamt: ~40 Minuten**

---

## 🔗 DEPENDENCIES

**Architect braucht:**
- ✅ Supervisor Output (taskAnalysis)
- ✅ LLM Client (vorhanden)
- ✅ Project Context (vorhanden)
- ✅ File System Access (vorhanden)

**Architect liefert für:**
- ➡️ **Coach:** runbook.steps (zum Aufteilen in SubTasks)
- ➡️ **Code Agent:** technicalDecisions, risks
- ➡️ **Review Agent:** risks (für Security Review)

---

## ❓ OFFENE FRAGEN

1. **Code Analysis:** Soll Architect bestehende Files lesen?
   - MVP: Nein, nur Folder-Struktur
   - Full: Ja, tiefe Code-Analyse

2. **Breaking Changes:** Soll Architect ablehnen wenn Breaking Changes?
   - MVP: Warnen aber erlauben
   - Full: User fragen

3. **Parallel Steps:** Soll Architect parallel Steps markieren?
   - MVP: Ja, aber noch nicht ausgeführt
   - Full: Ja, und orchestrator führt parallel aus

---

## 📝 ZUSAMMENFASSUNG

**Status:** ❌ Nicht implementiert im Orchestrator

**Aufwand:** ~40 Minuten

**Kritikalität:** 🔴 HOCH (Coach braucht Runbook)

**Nächster Schritt:** Interfaces exportieren in architect.ts
