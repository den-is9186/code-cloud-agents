# Code Cloud Agents - Übersicht für ChatGPT

Dieses Dokument beschreibt alle verfügbaren Agenten im Code Cloud Agents System.

---

## 📊 Schnellübersicht

| Agent | Rolle | Model | Primäre Aufgabe | Key Tools |
|-------|-------|-------|-----------------|-----------|
| **Supervisor** | Orchestrator | Dynamic | Koordiniert alle Agenten, Checkpoint/Resume | Alle Agenten |
| **Architect** | Planer | Dynamic | Erstellt Runbook mit Steps | directory_list, file_read |
| **Coach** | Task Manager | Dynamic | Zerlegt Runbook in Sub-Tasks | LLM Planning |
| **Code** | Developer | Dynamic | Schreibt/Modifiziert Code | file_read, file_write |
| **Test** | Tester | Dynamic | Schreibt & führt Tests aus | file_write, npm test |
| **Review** | QA Engineer | Dynamic | Prüft Code auf Bugs/Security | Code Analysis |
| **Refactor** | Code Improver | Dynamic | Verbessert Code-Qualität | file_read, file_write |
| **Docs** | Technical Writer | llama-4-scout (local) | Aktualisiert Dokumentation | file_write |
| **Merge** | Conflict Resolver | Dynamic | Resolved Merge Conflicts | file_read, file_write |
| **Multi-Repo** | Cross-Repo Manager | Dynamic | Änderungen über mehrere Repos | git, gh CLI |
| **Tool-Builder** | Tool Creator | Dynamic | Erstellt neue Tools dynamisch | file_write, Validation |
| **Vision** | Image Analyst | llama-4-scout (local) | Design-to-Code, UI Analysis | Image Processing |

---

## 🔧 Detaillierte Agent-Beschreibungen

### 1. Supervisor Agent 🎯

**Datei:** `src/agents/supervisor.ts`

**Zweck:** Zentrale Orchestrierung des gesamten Multi-Agent Build Pipelines

**Workflow-Phasen:**
1. **Architect Phase** → Erstellt Runbook
2. **Coach Phase** → Zerlegt in Tasks
3. **Execution Phase** → Führt Tasks aus (parallel wo möglich)
4. **Documentation Phase** → Aktualisiert Docs
5. **Complete Phase** → Finalisiert Build

**Features:**
- ✅ Checkpoint/Resume System für fehlertolerante Ausführung
- ✅ Real-time Event Streaming (Build Start/Complete, Agent Progress)
- ✅ Parallele Task-Ausführung mit Dependency Management
- ✅ Iterative Code-Review-Test Loops
- ✅ Cost & Token Tracking

**Konfiguration:**
```typescript
{
  model: string,           // LLM Model
  maxIterations: number,   // Max Review-Fix Cycles
  preset: string          // Build Preset (A, B, C, etc.)
}
```

**Output:**
```typescript
{
  success: boolean,
  filesChanged: FileChange[],
  testsWritten: TestFile[],
  docsUpdated: FileChange[],
  totalCost: number,
  totalTokens: number,
  duration: number,
  errors?: string[],
  testResults?: TestResult
}
```

---

### 2. Architect Agent 📐

**Datei:** `src/agents/architect.ts`

**Zweck:** Analysiert Aufgabe und erstellt detailliertes Runbook mit Steps

**System Prompt:**
```
Du bist ein Software Architect. Erstelle ein detailliertes Runbook für die gegebene Aufgabe.

Antworte NUR mit validem JSON in diesem Format:
{
  "runbook": [
    {
      "id": "step-1",
      "description": "Was zu tun ist",
      "files": ["pfad/zur/datei.ts"],
      "expectedOutcome": "Was danach erreicht ist",
      "estimatedTokens": 1000
    }
  ],
  "estimatedComplexity": "low" | "medium" | "high"
}
```

**Capabilities:**
- 📂 Liest Projekt-Struktur (directory_list)
- 📄 Analysiert key files (package.json, tsconfig.json, README)
- 🎯 Erstellt step-by-step Runbook
- 💰 Schätzt Token-Usage pro Step

**Output:**
```typescript
{
  runbook: Step[],              // Detaillierte Steps
  estimatedComplexity: string   // "low" | "medium" | "high"
}
```

---

### 3. Coach Agent 🎯

**Datei:** `src/agents/coach.ts`

**Zweck:** Zerlegt Architect's Runbook in konkrete Sub-Tasks mit Execution Order

**System Prompt:**
```
Du bist ein Coach der Tasks plant. Zerlege das Runbook in konkrete Sub-Tasks.

Antworte NUR mit validem JSON:
{
  "tasks": [...],
  "executionOrder": [["task-1"], ["task-2", "task-3"]],
  "dependencies": [{"taskId": "task-2", "dependsOn": ["task-1"]}]
}
```

**Features:**
- 🤖 Assigned tasks to agents: 'code', 'test', 'review', 'docs'
- 📊 Erstellt Execution Order (parallele Gruppen)
- 🔗 Definiert Task Dependencies
- ✅ Status Tracking: 'pending', 'in_progress', 'completed', 'failed'

**Output:**
```typescript
{
  tasks: SubTask[],           // Detaillierte Tasks mit Agent Assignment
  executionOrder: string[][], // 2D Array für parallele Ausführung
  dependencies: Dependency[]  // Task Dependencies
}
```

---

### 4. Code Agent 💻

**Datei:** `src/agents/code.ts`

**Zweck:** Schreibt oder modifiziert Code basierend auf Tasks

**System Prompt:**
```
Du bist ein Code Agent. Schreibe oder modifiziere Code.

Antworte NUR mit validem JSON:
{
  "filesChanged": [
    {
      "path": "pfad/zur/datei.ts",
      "action": "create" | "modify",
      "content": "vollständiger Dateiinhalt"
    }
  ],
  "explanation": "Was wurde gemacht"
}
```

**Capabilities:**
- 📖 Liest existierenden Code für Kontext
- ✍️ Schreibt/Modifiziert Dateien
- 🔒 Path Validation gegen Traversal Attacks
- 🔄 Iterative Verbesserung basierend auf Review Feedback

**Security:**
- ✅ Path Sanitization
- ✅ No directory traversal (`../`)
- ✅ Absolute path validation

**Output:**
```typescript
{
  filesChanged: FileChange[], // Alle Datei-Änderungen
  explanation: string,        // Beschreibung der Changes
  needsReview?: boolean       // Ob Review benötigt wird
}
```

---

### 5. Test Agent 🧪

**Datei:** `src/agents/test.ts`

**Zweck:** Schreibt Tests und führt sie aus mit Result Parsing

**System Prompt:**
```
Du bist ein Test Agent. Schreibe Tests für den gegebenen Code.

Antworte NUR mit validem JSON:
{
  "testsWritten": [
    {
      "path": "tests/example.test.ts",
      "testCount": 3,
      "content": "import { describe, it, expect } from 'vitest';\\n..."
    }
  ]
}
```

**Capabilities:**
- 🧪 Schreibt Test Files (vitest/jest format)
- ▶️ Führt `npm test` aus mit JSON Reporter
- 📊 Parsed Test Results (passed, failed, skipped)
- ⏱️ 30 Sekunden Timeout pro Test Run
- 🔒 Uses execFileAsync (Shell Injection Prevention)

**Output:**
```typescript
{
  testsWritten: TestFile[],     // Geschriebene Test Files
  testResults?: TestResult,     // Test Execution Results
  failures?: TestFailure[]      // Details zu fehlgeschlagenen Tests
}
```

---

### 6. Review Agent 🔍

**Datei:** `src/agents/review.ts`

**Zweck:** Prüft Code auf Bugs, Security Issues und Best Practices

**System Prompt:**
```
Du bist ein Code Reviewer. Prüfe den Code auf Bugs, Security Issues und Best Practices.

Antworte NUR mit validem JSON:
{
  "approved": true | false,
  "issues": [...],
  "summary": "Zusammenfassung"
}

approved = true nur wenn keine 'error' issues.
```

**Review Kategorien:**
- 🐛 Bugs
- 🔒 Security Issues (SQL Injection, XSS, etc.)
- ⚡ Performance Problems
- 📝 Code Style Violations
- 🧪 Missing Tests

**Issue Severity:**
- `error` - Muss behoben werden (blocking)
- `warning` - Sollte behoben werden
- `info` - Optional, Verbesserungsvorschlag

**Output:**
```typescript
{
  approved: boolean,        // true nur bei 0 errors
  issues: Issue[],          // Alle gefundenen Issues
  summary: string,          // Review Zusammenfassung
  mustFix?: Issue[],        // Severity: error
  suggestions?: Issue[]     // Severity: warning/info
}
```

---

### 7. Refactor Agent ♻️

**Datei:** `src/agents/refactor.ts`

**Zweck:** Verbessert Code-Qualität OHNE Funktionalität zu ändern

**System Prompt:**
```
Du bist ein Refactoring Agent. Analysiere Code und verbessere ihn OHNE die Funktionalität zu ändern.

Refactoring-Prinzipien:
- DRY (Don't Repeat Yourself) - Duplikate eliminieren
- SOLID Principles - Clean Architecture
- Lesbarkeit - Klare Namen, einfache Strukturen
- Performance - Effiziente Algorithmen
- Testbarkeit - Lose Kopplung, klare Interfaces
- Security - Input Validation, Error Handling
```

**Refactoring Types:**
- 🔄 Code Duplication Elimination
- 📦 Extract Method/Class
- 🏗️ Simplify Complex Logic
- 🎯 Improve Naming
- ⚡ Performance Optimization
- 🧪 Improve Testability

**Output:**
```typescript
{
  filesChanged: FileChange[],
  analysis: {
    codeSmells: string[],      // Erkannte Code Smells
    improvements: string[],    // Vorgenommene Verbesserungen
    complexity: string         // "low" | "medium" | "high"
  },
  explanation: string          // Zusammenfassung aller Refactorings
}
```

---

### 8. Docs Agent 📝

**Datei:** `src/agents/docs.ts`

**Zweck:** Aktualisiert Dokumentation basierend auf Code-Änderungen

**Model:** `llama-4-scout-local` (Kostenlos, läuft lokal)

**System Prompt:**
```
Du bist ein Documentation Agent. Aktualisiere Dokumentation basierend auf Code-Änderungen.

Antworte NUR mit validem JSON:
{
  "docsUpdated": [...],
  "changelogEntry": "- Added feature X"
}
```

**Dokumentations-Typen:**
- 📖 README Updates
- 📚 API Documentation
- 📝 Changelog Entries
- 🎯 Usage Examples
- 🔧 Configuration Docs

**Output:**
```typescript
{
  docsUpdated: FileChange[],    // Aktualisierte Docs
  changelogEntry?: string       // Optional Changelog Entry
}
```

---

### 9. Merge Agent 🔀

**Datei:** `src/agents/merge.ts`

**Zweck:** Resolved Merge Conflicts intelligent über mehrere Branches

**System Prompt:**
```
Du bist ein Merge Agent. Merge Code aus verschiedenen Branches und löse Konflikte intelligent.

Merge Strategien:
- "ours": Bevorzuge unsere Änderungen bei Konflikten
- "theirs": Bevorzuge ihre Änderungen bei Konflikten
- "smart": Analysiere und wähle beste Lösung (Standard)
- "manual": Markiere alle Konflikte für manuelles Review

Konflikt-Typen:
- content: Beide Seiten haben denselben Code geändert
- structure: Strukturelle Änderungen
- deletion: Eine Seite hat gelöscht, andere geändert
```

**Merge Strategien:**
1. **ours** - Bevorzuge unsere Änderungen
2. **theirs** - Bevorzuge ihre Änderungen
3. **smart** - Intelligente Analyse (Default)
4. **manual** - Markiere für manuelles Review

**Konflikt-Typen:**
- `content` - Beide Seiten ändern denselben Code
- `structure` - Strukturelle Konflikte
- `deletion` - Eine Seite löscht, andere ändert

**Output:**
```typescript
{
  filesChanged: FileChange[],
  conflicts: MergeConflict[],    // Alle Konflikte mit Resolution
  summary: string,
  requiresManualReview: boolean
}
```

---

### 10. Multi-Repo Agent 🌐

**Datei:** `src/agents/multi-repo.ts`

**Zweck:** Wendet konsistente Änderungen über mehrere Repositories an

**System Prompt:**
```
You are a Multi-Repo Agent that applies consistent changes across multiple repositories.

Your job is to:
1. Understand the requested change
2. Generate appropriate file modifications for the current repository
3. Ensure consistency with the overall task
4. Handle edge cases specific to each repository

Guidelines:
- Respect existing code style and conventions
- Don't break existing functionality
- Include proper error handling
- Add comments where necessary
- Consider repository-specific differences
```

**Capabilities:**
- 🔍 Repository Validation & Structure Analysis
- 📊 Language/Framework Detection (TS, Python, Vue, React, Express)
- 🔧 Git Operations: fetch, checkout, branch, commit, push
- 📋 GitHub CLI Integration für PR Creation
- ⚡ Parallel Processing mit Error Handling
- 🛡️ Max 100 files pro Repo (Memory Protection)

**Supported Frameworks:**
- TypeScript/JavaScript
- Python
- Vue
- React
- Express

**Output:**
```typescript
{
  success: boolean,
  reposProcessed: number,
  reposFailed: number,
  changes: MultiRepoChange[],  // Pro Repo: files, branch, commit, PR URL
  errors: RepoError[],
  totalCost: number,
  totalTokens: number,
  duration: number
}
```

---

### 11. Tool-Builder Agent 🛠️

**Datei:** `src/agents/tool-builder.ts`

**Zweck:** Erstellt dynamisch neue Tools mit Implementation & Tests

**System Prompt:**
```
You are a Tool Builder Agent that creates tool definitions for a multi-agent system.

Your job is to:
1. Analyze the requirements and determine what tools are needed
2. Create well-defined tool specifications with clear interfaces
3. Generate TypeScript implementation code for each tool
4. Include validation rules and test cases

Guidelines:
- Tool names should be snake_case
- Keep tools focused and single-purpose
- Include proper error handling
- Validate all inputs
- Use TypeScript types properly
- Include at least 2 test cases per tool
- Consider security (path traversal, command injection)
```

**Validation Rules:**
- ✅ Tool name: snake_case
- ✅ Description: Min 10 characters
- ✅ Parameters: Valid TypeScript types
- ✅ Test cases: Min 2 per tool

**Output:**
```typescript
{
  toolsCreated: ToolDefinition[], // Validierte Tool Definitionen
  filesChanged: FileChange[],     // Generierte Code Files
  summary: string,
  warnings: string[]              // Validation Warnings
}
```

**ToolDefinition:**
```typescript
{
  name: string,                    // snake_case
  description: string,
  parameters: Record<string, {
    type: string,
    required?: boolean,
    description?: string
  }>,
  implementation: string,          // TypeScript Code
  validation: string[],            // Validation Rules
  testCases: Array<{
    input: any,
    expectedOutput?: any,
    shouldFail?: boolean
  }>
}
```

---

### 12. Vision Agent 👁️

**Datei:** `src/agents/vision.ts`

**Zweck:** Analysiert Bilder für Design-to-Code, Bug Analysis, UI Comparison

**Model:** `llama-4-scout-local` (Kostenlos, läuft lokal)

**System Prompt:**
```
Du bist ein Vision Agent der Bilder analysiert.

Antworte NUR mit validem JSON:
{
  "analysis": "Beschreibung was du siehst",
  "generatedCode": "// Code falls design_to_code",
  "suggestedFix": "Fix-Vorschlag falls bug_analysis",
  "confidence": 0.85
}
```

**Task Types:**

1. **design_to_code** 🎨
   - Prompt: "Analysiere dieses Design und generiere React/TypeScript Code dafür"
   - Output: Vollständiger Component Code

2. **bug_analysis** 🐛
   - Prompt: "Analysiere diesen Screenshot und identifiziere UI-Bugs oder Probleme"
   - Output: Bug-Beschreibung + Fix-Vorschlag

3. **ui_compare** 🔄
   - Prompt: "Vergleiche dieses UI mit der erwarteten Implementation"
   - Output: Unterschiede + Verbesserungsvorschläge

**Input Format:**
```typescript
{
  taskType: "design_to_code" | "bug_analysis" | "ui_compare",
  imagePath: string,        // Pfad zum Bild
  context?: string         // Optional: Zusätzlicher Kontext
}
```

**Output:**
```typescript
{
  analysis: string,         // Bild-Analyse
  generatedCode?: string,   // Nur bei design_to_code
  suggestedFix?: string,    // Nur bei bug_analysis
  confidence: number        // 0-1
}
```

---

## 🎯 Workflow Beispiel

### Standard Build Flow:

```
1. USER submits task
   ↓
2. SUPERVISOR starts orchestration
   ↓
3. ARCHITECT creates runbook
   ↓
4. COACH breaks down into tasks
   ↓
5. EXECUTION PHASE (parallel):
   - CODE writes implementation
   - TEST writes & runs tests
   - REVIEW checks code
   - [If review fails: CODE fixes → REVIEW again]
   ↓
6. DOCUMENTATION PHASE:
   - DOCS updates documentation
   ↓
7. COMPLETE: Return BuildResult
```

### Iterative Code-Review Loop:

```
CODE writes → REVIEW checks → Issues found?
                ↓ YES              ↓ NO
         CODE fixes issues      Continue to DOCS
                ↓
         REVIEW again
                ↓
            (repeat max N times)
```

---

## ⚙️ Konfiguration

### Model Selection:

**Dynamic Models** (von Config):
- Architect, Coach, Code, Review, Test, Refactor, Merge, Multi-Repo, Tool-Builder, Supervisor

**Fixed Local Models** ($0 cost):
- Docs: `llama-4-scout-local`
- Vision: `llama-4-scout-local`

### Presets:

Verschiedene Build-Presets mit unterschiedlichen Agent-Kombinationen:
- **Preset A**: Full workflow (alle Agents)
- **Preset B**: Code + Tests only
- **Preset C**: Code + Review only
- **Preset IQ**: Fast iteration (minimal agents)

---

## 🔒 Security Features

### Path Validation:
- ✅ Alle Agents mit File I/O validieren Pfade
- ✅ Keine `../` traversal erlaubt
- ✅ Absolute path checks

### Command Injection Prevention:
- ✅ Test Agent: `execFileAsync` statt `exec`
- ✅ Kein Shell=true bei subprocess calls

### Input Validation:
- ✅ Zod Schema Validation für alle Inputs/Outputs
- ✅ Type Safety durch TypeScript

---

## 💰 Cost Tracking

Alle Agents tracken:
- `totalCost`: Akkumulierte LLM API Kosten
- `totalTokens`: Input + Output Tokens
- `duration`: Execution Zeit in ms

Supervisor aggregiert Costs über alle Agents.

---

## 📊 Event System

**Real-time Events via StreamEmitter:**
- `buildStart` - Build startet
- `buildComplete` - Build abgeschlossen
- `agentStart` - Agent beginnt Arbeit
- `agentComplete` - Agent fertig
- `taskComplete` - Task abgeschlossen
- `error` - Fehler aufgetreten

---

## 🔄 Checkpoint/Resume System

**Supervisor** implementiert Checkpointing:

**Checkpoint enthält:**
- Current phase
- Pending tasks
- Completed task IDs
- Partial results
- Runbook
- Execution order

**Resume:**
```typescript
await supervisor.execute({
  task: "...",
  projectPath: "...",
  resumeCheckpointId: "checkpoint-abc-123"
});
```

---

## 📝 Best Practices für ChatGPT

### Wann welchen Agent verwenden:

**Planning Phase:**
- Architect → Für high-level Runbook
- Coach → Für Task breakdown

**Implementation:**
- Code → Für neue Features/Fixes
- Refactor → Für Code Quality Improvements
- Test → Immer nach Code changes

**Quality Assurance:**
- Review → Vor jedem Merge
- Test → Automatisiert bei jedem Build

**Multi-Repo Operations:**
- Multi-Repo → Für konsistente Cross-Repo Changes

**Special Cases:**
- Vision → Für UI/Design Analysis
- Merge → Für Conflict Resolution
- Tool-Builder → Für neue Tool Creation

---

## 🎓 Zusammenfassung

**12 spezialisierte Agents:**
- 1 Orchestrator (Supervisor)
- 3 Planning Agents (Architect, Coach, Tool-Builder)
- 4 Implementation Agents (Code, Test, Refactor, Docs)
- 2 Quality Agents (Review, Merge)
- 2 Special Agents (Multi-Repo, Vision)

**Alle Agents:**
- ✅ Type-safe mit Zod validation
- ✅ Structured JSON outputs
- ✅ Error handling
- ✅ Cost/Token tracking
- ✅ Security-conscious

**Production-ready Features:**
- Checkpoint/Resume
- Parallel execution
- Real-time events
- Multi-repo support
- Local models für cost optimization
