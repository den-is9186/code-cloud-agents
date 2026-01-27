# 🎯 COACH AGENT - Detaillierte Anforderungen

## 📋 ÜBERBLICK

**Rolle:** Der Projekt-Manager - Teilt Arbeit auf & plant Execution

**Status:** ❌ Nicht aktiv im Orchestrator (executeAgent wirft Error)

**Kritikalität:** HOCH - Ohne SubTasks kann Code Agent nicht arbeiten

---

## 🎯 AUFGABENGEBIET

### Hauptverantwortlichkeiten:

1. **Task Decomposition**
   - Runbook Steps in atomare SubTasks zerlegen
   - Jede SubTask hat klares, testbares Ziel
   - SubTasks sind unabhängig voneinander (wo möglich)
   - SubTask-IDs vergeben

2. **Agent Assignment**
   - Jeder SubTask den passenden Agent zuweisen
   - Code Tasks → Code Agent
   - Review Tasks → Review Agent
   - Test Tasks → Test Agent
   - Docs Tasks → Docs Agent

3. **Execution Planning**
   - Execution Order bestimmen (Sequential vs Parallel)
   - Batches erstellen: `[["task-1"], ["task-2", "task-3"], ["task-4"]]`
   - Batch 1: Sequential (nur task-1)
   - Batch 2: Parallel (task-2 und task-3 gleichzeitig)
   - Batch 3: Sequential (task-4, abhängig von Batch 2)

4. **Dependency Resolution**
   - Dependencies zwischen SubTasks auflösen
   - Task B kann erst nach Task A
   - Circular Dependencies erkennen und vermeiden
   - Dependency Graph erstellen

5. **Resource Management**
   - Token-Budget pro SubTask verteilen
   - Workload balancen
   - Parallele Tasks nicht zu viel auf einmal

---

## 🛠️ SKILLS (was der Agent kann)

### 1. Task Decomposition
```typescript
Runbook Step:
"Create AuthService with login/register/verify methods"

→ SubTasks:
1. "Implement login method with email/password validation"
2. "Implement register method with email uniqueness check"
3. "Implement JWT generation in verify method"
4. "Add error handling for all methods"
```

### 2. Dependency Analysis
```typescript
Versteht Abhängigkeiten:
- User Model muss VOR AuthService erstellt werden
- AuthService muss VOR Middleware erstellt werden
- Routes können PARALLEL zu Middleware erstellt werden
- Tests können NACH Code geschrieben werden
```

### 3. Workload Balancing
- Verteilt große Tasks gleichmäßig
- Vermeidet zu kleine Tasks (overhead)
- Vermeidet zu große Tasks (zu komplex)
- Optimal: 3-7 SubTasks pro Runbook Step

### 4. Parallel Execution Planning
```typescript
Execution Order Batches:
[
  ["task-1"],                    // Batch 1: Nur task-1 (sequential)
  ["task-2", "task-3", "task-4"], // Batch 2: Alle 3 parallel
  ["task-5"]                     // Batch 3: task-5 (sequential)
]

Regel: Tasks in einem Batch haben KEINE Abhängigkeiten zueinander
```

### 5. Agent Selection Intelligence
```typescript
Task-Typ → Agent Mapping:
- "Create X model"        → Code Agent
- "Review code quality"   → Review Agent
- "Write unit tests"      → Test Agent
- "Update README"         → Docs Agent
- "Generate JSDoc"        → Docs Agent
- "Fix security issue"    → Code Agent + Review Agent
```

---

## 📥 INPUT INTERFACE

**Was der Agent braucht:**

```typescript
interface CoachInput {
  runbook: Runbook;              // Von Architect
  task: string;                  // Original User Task
  projectPath: string;           // Projekt-Pfad
  constraints?: {
    maxParallelTasks?: number;   // Max parallel tasks pro Batch
    maxSubTasks?: number;        // Max total SubTasks
    preferSequential?: boolean;  // Parallel execution bevorzugen?
  };
}

interface Runbook {
  steps: Step[];
  totalSteps: number;
  estimatedTotalTokens: number;
}

interface Step {
  id: string;
  description: string;
  files: string[];
  expectedOutcome: string;
  estimatedTokens: number;
  dependencies: string[];
  parallel: boolean;
}
```

**Beispiel:**
```typescript
{
  runbook: {
    steps: [
      {
        id: "step-1",
        description: "Create User model",
        files: ["src/models/user.ts"],
        expectedOutcome: "User interface with email, password",
        estimatedTokens: 3000,
        dependencies: [],
        parallel: false
      },
      {
        id: "step-2",
        description: "Create AuthService",
        files: ["src/services/auth.ts"],
        expectedOutcome: "AuthService with login/register",
        estimatedTokens: 8000,
        dependencies: ["step-1"],
        parallel: false
      }
    ],
    totalSteps: 2,
    estimatedTotalTokens: 11000
  },
  task: "Add user authentication",
  projectPath: "/Users/user/backend-api",
  constraints: {
    maxParallelTasks: 3,
    maxSubTasks: 10,
    preferSequential: false
  }
}
```

---

## 📤 OUTPUT INTERFACE

**Was der Agent zurückgibt:**

```typescript
interface CoachOutput {
  // SubTasks (Hauptoutput)
  tasks: SubTask[];

  // Execution Order (Batches)
  executionOrder: string[][];

  // Dependencies
  dependencies: Dependency[];

  // Estimates
  estimatedDuration: number;     // Sekunden
  estimatedCost: number;         // USD

  // Planning Metadata
  parallelBatches: number;       // Anzahl Batches mit >1 Task
  sequentialBatches: number;     // Anzahl Batches mit 1 Task
}

interface SubTask {
  id: string;                    // "task-1", "task-2"
  stepId: string;                // "step-1" (von Architect)
  assignedAgent: AgentRole;      // "code" | "review" | "test" | "docs"
  description: string;           // "Implement login method"
  input: TaskInput;              // Input für den Agent
  expectedOutput: string;        // Was soll rauskommen?
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface TaskInput {
  files?: string[];              // Betroffene Files
  feedback?: ReviewResult;       // Von Review Agent (bei retry)
}

interface Dependency {
  taskId: string;                // "task-2"
  dependsOn: string[];           // ["task-1"]
}
```

**Beispiel Output:**
```typescript
{
  tasks: [
    {
      id: "task-1",
      stepId: "step-1",
      assignedAgent: "code",
      description: "Create User model with email, password, timestamps",
      input: {
        files: ["src/models/user.ts"]
      },
      expectedOutput: "TypeScript User interface with validation",
      status: "pending"
    },
    {
      id: "task-2",
      stepId: "step-2",
      assignedAgent: "code",
      description: "Implement AuthService login method",
      input: {
        files: ["src/services/auth.ts"]
      },
      expectedOutput: "Login method that validates credentials and returns JWT",
      status: "pending"
    },
    {
      id: "task-3",
      stepId: "step-2",
      assignedAgent: "code",
      description: "Implement AuthService register method",
      input: {
        files: ["src/services/auth.ts"]
      },
      expectedOutput: "Register method with email uniqueness check",
      status: "pending"
    },
    {
      id: "task-4",
      stepId: "step-3",
      assignedAgent: "test",
      description: "Write unit tests for AuthService",
      input: {
        files: ["src/services/auth.test.ts"]
      },
      expectedOutput: "Jest tests with 80%+ coverage",
      status: "pending"
    },
    {
      id: "task-5",
      stepId: "step-3",
      assignedAgent: "docs",
      description: "Document AuthService API",
      input: {
        files: ["src/services/auth.ts"]
      },
      expectedOutput: "JSDoc comments for all methods",
      status: "pending"
    }
  ],

  executionOrder: [
    ["task-1"],              // Batch 1: User Model (sequential)
    ["task-2", "task-3"],    // Batch 2: Login + Register (parallel)
    ["task-4", "task-5"]     // Batch 3: Tests + Docs (parallel)
  ],

  dependencies: [
    { taskId: "task-2", dependsOn: ["task-1"] },
    { taskId: "task-3", dependsOn: ["task-1"] },
    { taskId: "task-4", dependsOn: ["task-2", "task-3"] },
    { taskId: "task-5", dependsOn: ["task-2", "task-3"] }
  ],

  estimatedDuration: 180,    // 3 minutes
  estimatedCost: 0.85,       // $0.85
  parallelBatches: 2,
  sequentialBatches: 1
}
```

---

## ❌ AKTUELLES PROBLEM

### Im Orchestrator (src/services/agent-orchestrator.ts):

**Zeile ~833:**
```typescript
case 'coach':
  throw new Error(`Agent coach not yet implemented in MVP`);
```

**Problem:**
1. ❌ Agent wird nicht aufgerufen
2. ❌ SubTasks werden nicht erstellt
3. ❌ executionOrder fehlt
4. ❌ Code Agent hat keine Aufgaben
5. ❌ Pipeline kann nicht fortfahren

---

## ✅ WAS BENÖTIGT WIRD

### Schritt 1: Input/Output Interfaces exportieren

**In src/agents/coach.ts:**

```typescript
// VORHER (private):
interface CoachInput { ... }
interface CoachOutput { ... }

// NACHHER (public):
export interface CoachInput { ... }
export interface CoachOutput { ... }
```

---

### Schritt 2: Interfaces im Orchestrator importieren

**In src/services/agent-orchestrator.ts:**

```typescript
import {
  CoachAgent,
  type CoachInput,
  type CoachOutput
} from '../agents/coach.js';
```

---

### Schritt 3: PipelineContext erweitern

**In src/services/agent-orchestrator.ts:**

```typescript
interface PipelineContext {
  // NEU hinzufügen:
  tasks?: SubTask[];                // SubTasks vom Coach
  executionOrder?: string[][];      // Execution Batches
  dependencies?: Dependency[];      // Task Dependencies
  currentBatch?: number;            // Aktueller Batch-Index
  currentTaskIndex?: number;        // Aktueller Task-Index

  // ... existing fields
  supervisorAnalysis?: TaskAnalysis;
  runbook?: Runbook;
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
case 'coach': {
  const coachAgent = agent as CoachAgent;

  // Validate prerequisites
  if (!context.runbook) {
    throw new Error('Coach agent requires runbook from Architect');
  }

  // Build Input
  const coachInput: CoachInput = {
    runbook: context.runbook,
    task: task,
    projectPath: projectPath,
    constraints: {
      maxParallelTasks: 3,
      maxSubTasks: 15,
      preferSequential: false,
    },
  };

  // Execute Agent
  const output: CoachOutput = await coachAgent.execute(coachInput);

  // Validate Output
  if (!output.tasks || output.tasks.length === 0) {
    throw new Error('Coach failed to create SubTasks');
  }

  if (!output.executionOrder || output.executionOrder.length === 0) {
    throw new Error('Coach failed to create execution order');
  }

  // Store in Context for Code Agent
  context.tasks = output.tasks;
  context.executionOrder = output.executionOrder;
  context.dependencies = output.dependencies;
  context.currentBatch = 0;
  context.currentTaskIndex = 0;

  // Log planning summary
  logger.info('Coach planning completed', {
    agent: 'coach',
    totalTasks: output.tasks.length,
    batches: output.executionOrder.length,
    parallelBatches: output.parallelBatches,
    estimatedDuration: output.estimatedDuration,
    estimatedCost: output.estimatedCost,
  });

  // Build Result
  result = {
    inputTokens: 0, // TODO: Get from LLM
    outputTokens: 0,
    duration: Date.now() - startTime,
    output: output as unknown as Record<string, unknown>,
    subtasks: output.tasks.map(t => ({
      id: t.id,
      description: t.description,
      agent: t.assignedAgent,
    })),
    executionPlan: {
      parallel: output.parallelBatches > 0,
      sequential: output.sequentialBatches > 0,
    },
  };

  break;
}
```

---

### Schritt 5: executeAgentSequence() anpassen

**Coach Output muss verwendet werden:**

```typescript
// NACH Coach Agent:
if (agentName === 'coach') {
  // Jetzt haben wir context.tasks und context.executionOrder

  // Ab jetzt: SubTasks abarbeiten statt Agent-Sequence
  // WICHTIG: Für MVP - noch NICHT implementiert
  // Für MVP: Weiter mit fixer Sequence (code, review, test, docs)

  // TODO Full Version: Loop über executionOrder Batches
  // for (const batch of context.executionOrder) {
  //   await executeTaskBatch(batch, context);
  // }
}
```

---

### Schritt 6: Error Handling

**Coach Failures = HARD FAIL (Pipeline stoppt):**

```typescript
// In executeAgentSequence():
if (['supervisor', 'architect', 'coach', 'code', 'review'].includes(agentName)) {
  // Hard failure - stop pipeline
  result.success = false;
  throw error;
}
```

**Warum HARD FAIL?**
- Ohne SubTasks kann Code Agent nicht arbeiten
- Ohne executionOrder weiß Pipeline nicht was zu tun ist
- Pipeline ist blockiert

---

## 🔑 CHARAKTERISTIKEN

| Eigenschaft | Wert |
|-------------|------|
| **Rolle** | Projekt-Manager & Task-Coordinator |
| **Input** | Runbook vom Architect |
| **Output** | SubTasks + ExecutionOrder + Dependencies |
| **Model** | Claude Sonnet-4 / GPT-4 (braucht Planning) |
| **Durchschnittliche Tokens** | Input: 2000-4000 / Output: 1500-3000 |
| **Durchschnittliche Kosten** | $0.04 - $0.10 pro Ausführung |
| **Durchschnittliche Dauer** | 4-8 Sekunden |
| **Kritikalität** | 🔴 HOCH (Code Agent braucht SubTasks) |
| **Failure Handling** | HARD FAIL (stoppt Pipeline) |
| **Retry-fähig** | Ja (max 2 Retries) |

---

## 🎯 EXECUTION FLOW

```
┌─────────────────────────────────────┐
│  Input: Runbook vom Architect        │
│  - 4 Steps                           │
│  - 20k estimated tokens              │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      COACH AGENT STARTET             │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Analysiert Runbook Steps:           │
│  Step 1: Create User Model           │
│  Step 2: Create AuthService          │
│  Step 3: Create Middleware           │
│  Step 4: Create Routes               │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Zerlegt in SubTasks:                │
│  task-1: User Model (code)           │
│  task-2: Login method (code)         │
│  task-3: Register method (code)      │
│  task-4: Middleware (code)           │
│  task-5: Routes (code)               │
│  task-6: Tests (test)                │
│  task-7: Docs (docs)                 │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Analysiert Dependencies:            │
│  task-2 depends on task-1            │
│  task-3 depends on task-1            │
│  task-4 depends on task-2,3          │
│  task-5 depends on task-2,3          │
│  task-6 depends on task-2,3,4,5      │
│  task-7 depends on task-2,3,4,5      │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Erstellt Execution Order (Batches): │
│  Batch 1: [task-1]                   │
│  Batch 2: [task-2, task-3]           │
│  Batch 3: [task-4, task-5]           │
│  Batch 4: [task-6, task-7]           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Output → PipelineContext speichern  │
│  context.tasks = [...]               │
│  context.executionOrder = [[...]]    │
│  context.dependencies = [...]        │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      Nächster Agent: CODE            │
│      (arbeitet task-1 ab)            │
└─────────────────────────────────────┘
```

---

## 🧪 TEST-SZENARIEN

### Test 1: Simple Task (1 Step)
```typescript
Input Runbook: 1 Step "Add health endpoint"
Expected Output:
- 1 SubTask (code)
- executionOrder: [["task-1"]]
- 0 dependencies
```

### Test 2: Sequential Tasks
```typescript
Input Runbook: 3 Steps (User → Auth → Routes)
Expected Output:
- 3 SubTasks (alle code)
- executionOrder: [["task-1"], ["task-2"], ["task-3"]]
- task-2 depends on task-1
- task-3 depends on task-2
```

### Test 3: Parallel Tasks
```typescript
Input Runbook: 2 Steps (Service A, Service B - unabhängig)
Expected Output:
- 2 SubTasks (code)
- executionOrder: [["task-1", "task-2"]]
- 0 dependencies
```

### Test 4: Complex Mix
```typescript
Input Runbook: 4 Steps (Model → Service → Tests → Docs)
Expected Output:
- 4 SubTasks (code, code, test, docs)
- executionOrder: [["task-1"], ["task-2"], ["task-3", "task-4"]]
- task-2 depends on task-1
- task-3 depends on task-2
- task-4 depends on task-2
```

---

## 📊 METRIKEN ZU TRACKEN

### Performance Metriken:
- Durchschnittliche SubTasks pro Runbook Step
- Durchschnittliche Batches im executionOrder
- % parallel vs sequential batches
- Token Usage

### Quality Metriken:
- % korrekte Agent-Zuweisungen
- % korrekte Dependency-Erkennung
- % Tasks die erfolgreich ausgeführt werden

### Optimization Metriken:
- Parallelization Ratio (parallel tasks / total tasks)
- Batch Efficiency (tasks per batch)
- Dependency Chain Length (longest chain)

---

## 🚀 IMPLEMENTIERUNGS-REIHENFOLGE

1. ✅ **Interfaces exportieren** (5 min)
2. ✅ **Interfaces importieren im Orchestrator** (2 min)
3. ✅ **PipelineContext erweitern** (5 min)
4. ✅ **executeAgent() Case schreiben** (15 min)
5. ✅ **Error Handling hinzufügen** (5 min)
6. ✅ **Logging hinzufügen** (5 min)
7. ⏸️ **Batch Execution implementieren** (SPÄTER - Full Version)
8. ✅ **Testen mit einfachem Task** (5 min)

**Gesamt MVP: ~40 Minuten**
**Full Version (Batch Execution): +3-4 Stunden**

---

## 🔗 DEPENDENCIES

**Coach braucht:**
- ✅ Architect Output (runbook)
- ✅ LLM Client (vorhanden)
- ✅ SubTask types (vorhanden in types.ts)

**Coach liefert für:**
- ➡️ **Code Agent:** tasks[0] (erster Task zum Abarbeiten)
- ➡️ **Review Agent:** (prüft Output von Code)
- ➡️ **Test Agent:** (schreibt Tests für Code)
- ➡️ **Docs Agent:** (dokumentiert Code)

---

## ❓ OFFENE FRAGEN

1. **Batch Execution:** MVP oder Full Version?
   - **MVP:** Coach erstellt executionOrder, aber Orchestrator führt noch sequentiell aus
   - **Full:** Orchestrator führt Batches parallel aus

2. **Task Granularität:** Wie groß sollten SubTasks sein?
   - Zu klein: Overhead (zu viele Tasks)
   - Zu groß: Nicht testbar, zu komplex
   - **Empfehlung:** 1 SubTask = 1 File oder 1 Funktion

3. **Agent Re-Assignment:** Wenn Task fehlschlägt, anderen Agent versuchen?
   - **MVP:** Nein, retry mit gleichem Agent
   - **Full:** Ja, LLM entscheidet ob anderer Agent besser

---

## 📝 ZUSAMMENFASSUNG

**Status:** ❌ Nicht implementiert im Orchestrator

**Aufwand MVP:** ~40 Minuten (ohne Batch Execution)

**Aufwand Full:** +3-4 Stunden (mit Batch Execution)

**Kritikalität:** 🔴 HOCH (Code Agent braucht SubTasks)

**Nächster Schritt:** Interfaces exportieren in coach.ts

---

## 🎯 MVP vs FULL VERSION

### MVP (JETZT):
- ✅ Coach erstellt SubTasks
- ✅ Coach erstellt executionOrder
- ❌ Orchestrator führt NICHT nach executionOrder aus
- ❌ Orchestrator nutzt weiter feste Sequence (code, review, test, docs)
- ❌ Keine parallele Batch-Ausführung

**Warum?** MVP braucht nur Planning, nicht Parallel Execution

### Full Version (SPÄTER):
- ✅ Orchestrator liest executionOrder
- ✅ Orchestrator führt Batches aus
- ✅ Tasks in einem Batch laufen parallel
- ✅ Dependency-Resolution zur Runtime
- ✅ Optimale Resource-Nutzung

**Aufwand:** +3-4 Stunden für Batch Execution
