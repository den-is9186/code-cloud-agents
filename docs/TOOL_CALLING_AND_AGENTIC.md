# Tool Calling vs Agentic AI - Konzept für Multi-Agent System

## Übersicht

Unser Multi-Agent System nutzt BEIDE Konzepte:
- **Tool Calling**: Agents rufen externe Funktionen auf (Git, LLM APIs, File System)
- **Agentic**: Supervisor plant, delegiert, korrigiert, loop't bis Ziel erreicht

## 1. Tool Calling (Function Calling)

### Definition
Das Modell entscheidet: "Ich brauche Hilfe von außen" und gibt strukturierten Aufruf zurück.

### Beispiel
```json
{
  "tool": "git_commit",
  "parameters": {
    "message": "feat: add user authentication",
    "files": ["src/auth.ts", "src/middleware.ts"]
  }
}
```

### Unsere Tool-Calling-fähigen Modelle
| Modell | Tool-Calling Qualität | Einsatz |
|--------|----------------------|---------|
| DeepSeek R1 0528 | ⭐⭐⭐⭐⭐ | Budget Agents |
| DeepSeek V3.2 | ⭐⭐⭐⭐⭐ | Tool Builder Budget |
| Claude Sonnet 4 | ⭐⭐⭐⭐⭐ | Standard Agents |
| Claude Opus 4 | ⭐⭐⭐⭐⭐ | Premium Agents |

### Tools die unsere Agents aufrufen
```typescript
// Git Tools
git_clone, git_commit, git_push, git_branch, git_merge

// File Tools  
file_read, file_write, file_delete, file_search

// LLM Tools
llm_chat, llm_analyze, llm_generate

// Test Tools
test_run, test_coverage, lint_check

// Build Tools
npm_install, npm_build, docker_build
```

## 2. Agentic AI (Autonome Agenten)

### Definition
Das Modell verhält sich wie ein autonomer Agent:
- Plant selbstständig mehrere Schritte
- Entscheidet wann/welches Tool es braucht
- Korrigiert Fehler automatisch
- Loop't bei Bedarf
- Behält Überblick über lange Workflows

### Unser Agentic Flow

```
User Request: "Build REST API for user management"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ SUPERVISOR (Agentic Brain)                              │
│                                                         │
│ 1. Analysiere Request                                   │
│ 2. Wähle Preset (A/B/C/D)                              │
│ 3. Delegiere an Architect                               │
│    └── Architect liefert Runbook                        │
│ 4. Delegiere an Coach                                   │
│    └── Coach erstellt Sub-Tasks                         │
│ 5. Für jeden Task:                                      │
│    ├── Code Agent implementiert                         │
│    ├── Review Agent prüft                               │
│    │   └── Wenn Fehler → zurück zu Code (Loop!)        │
│    ├── Test Agent schreibt Tests                        │
│    │   └── Wenn Tests fail → zurück zu Code (Loop!)    │
│    └── Docs Agent dokumentiert                          │
│ 6. Wenn Phase 1 fertig:                                 │
│    └── STOP → Warte auf User Approval                   │
│ 7. Nach Approval:                                       │
│    └── Phase 2 mit Premium Preset                       │
│ 8. Final: Git Push + Deployment                         │
└─────────────────────────────────────────────────────────┘
```

### Agentic Capabilities pro Agent

| Agent | Plant | Delegiert | Loop't | Korrigiert |
|-------|-------|-----------|--------|------------|
| **Supervisor** | ✅ | ✅ | ✅ | ✅ |
| Architect | ✅ | ❌ | ❌ | ✅ |
| Coach | ✅ | ❌ | ❌ | ✅ |
| Code | ❌ | ❌ | ✅ | ✅ |
| Review | ✅ | ❌ | ❌ | ❌ |
| Test | ❌ | ❌ | ✅ | ✅ |
| Docs | ❌ | ❌ | ❌ | ✅ |

## 3. Kombination in unserem System

### Normale KI (nur Chat)
```
User: "Schreib mir einen User-Service"
KI: "Hier ist der Code: ..."
```
→ Einmalige Antwort, keine Ausführung

### Tool-Calling KI
```
User: "Erstelle User-Service"
KI: [tool_call: file_write("src/user.ts", "...")]
    [tool_call: git_commit("feat: add user service")]
```
→ Führt Tools aus, aber kein Plan

### Agentic KI (unser System)
```
User: "Erstelle User Management API"
Supervisor:
  1. [PLAN] Analysiere → brauche CRUD + Auth + Tests
  2. [DELEGATE] Architect → erstelle Runbook
  3. [DELEGATE] Coach → erstelle 5 Sub-Tasks
  4. [LOOP] Für Task 1-5:
     a. [DELEGATE] Code → implementiere
     b. [DELEGATE] Review → prüfe
     c. [DECIDE] Review sagt "Fehler" → zurück zu Code
     d. [DELEGATE] Code → fix errors
     e. [DELEGATE] Review → OK ✓
     f. [DELEGATE] Test → schreibe Tests
     g. [DECIDE] Tests fail → zurück zu Code
     h. [DELEGATE] Code → fix tests
     i. [DELEGATE] Test → OK ✓
  5. [STOP] Warte auf User Approval
  6. [CONTINUE] User approved → Phase 2
  7. [DELEGATE] Premium Agents → polieren
  8. [TOOL_CALL] git_push, deploy
  9. [COMPLETE] "API fertig deployed"
```

## 4. Error Handling (Agentic Self-Correction)

### Automatische Retry-Logik

```typescript
interface AgentConfig {
  maxRetries: number;
  selfCorrect: boolean;
  escalateTo: string;
}

const AGENT_CONFIG = {
  code: {
    maxRetries: 3,
    selfCorrect: true,
    escalateTo: 'supervisor'
  },
  review: {
    maxRetries: 1,
    selfCorrect: false,
    escalateTo: 'code'
  },
  test: {
    maxRetries: 2,
    selfCorrect: true,
    escalateTo: 'code'
  }
};
```

### Self-Correction Flow

```
Code Agent schreibt: user.ts
        │
        ▼
Review Agent findet: "Missing input validation"
        │
        ▼
Supervisor entscheidet: → zurück zu Code mit Feedback
        │
        ▼
Code Agent korrigiert: user.ts (mit Validation)
        │
        ▼
Review Agent: "OK ✓"
        │
        ▼
Test Agent schreibt: user.test.ts
        │
        ▼
Test Runner: "2 tests failed"
        │
        ▼
Supervisor entscheidet: → zurück zu Code mit Test-Output
        │
        ▼
Code Agent fixt: user.ts (basierend auf Test-Fehler)
        │
        ▼
Test Runner: "All tests passed ✓"
        │
        ▼
Weiter zum nächsten Task
```

## 5. Modell-Empfehlungen

### Für Tool Calling (Präzise Funktionsaufrufe)
- **Budget**: DeepSeek V3.2 (saubere JSON, keine Halluzinationen)
- **Standard**: Claude Sonnet 4 (perfektes Tool Calling)
- **Premium**: Claude Opus 4 (komplexe Multi-Tool Chains)

### Für Agentic (Planung + Reasoning)
- **Budget**: DeepSeek R1 0528 (starkes Reasoning, günstig)
- **Standard**: Claude Sonnet 4 (gute Balance)
- **Premium**: Claude Opus 4 (bestes Reasoning)

### Unsere Preset-Zuordnung

| Preset | Tool Calling Model | Agentic Model | Use Case |
|--------|-------------------|---------------|----------|
| A (Budget) | DeepSeek V3.2 | DeepSeek R1 | Prototypen |
| B (Optimal) | Sonnet 4 | Sonnet 4 | Standard Builds |
| C (Premium) | Opus 4 | Opus 4 | Production Code |
| D (Smart) | Mix | R1 + Opus | Kostenoptimiert |

## 6. Implementation Notes

### Tool Registry

```typescript
// src/tools/registry.ts
export const TOOL_REGISTRY = {
  git_clone: { schema: {...}, handler: gitClone },
  git_commit: { schema: {...}, handler: gitCommit },
  git_push: { schema: {...}, handler: gitPush },
  file_read: { schema: {...}, handler: fileRead },
  file_write: { schema: {...}, handler: fileWrite },
  llm_chat: { schema: {...}, handler: llmChat },
  test_run: { schema: {...}, handler: testRun },
};
```

### Agent Base Class

```typescript
// src/agents/base.ts
abstract class BaseAgent {
  abstract name: string;
  abstract tools: string[];
  
  async callTool(name: string, params: any): Promise<any> {
    const tool = TOOL_REGISTRY[name];
    return tool.handler(params);
  }
  
  abstract async plan(input: any): Promise<Step[]>;
  abstract async execute(step: Step): Promise<Result>;
  abstract async handleError(error: Error): Promise<Action>;
}
```

## Zusammenfassung

| Aspekt | Tool Calling | Agentic |
|--------|-------------|---------|
| **Was** | Externe Funktionen aufrufen | Autonom planen & handeln |
| **Wer** | Alle Agents | Hauptsächlich Supervisor |
| **Wann** | Bei jeder externen Aktion | Bei Workflow-Entscheidungen |
| **Wie** | JSON Function Calls | Multi-Step Reasoning |
| **Fehler** | Retry einzelner Call | Self-Correction Loop |
