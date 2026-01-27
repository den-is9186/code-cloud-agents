# 🎯 SUPERVISOR AGENT - Detaillierte Anforderungen

## 📋 ÜBERBLICK

**Rolle:** Der Manager - Analysiert Tasks & orchestriert die Pipeline

**Status:** ❌ Nicht aktiv im Orchestrator (executeAgent wirft Error)

**Kritikalität:** HOCH - Ohne Supervisor kann keine Pipeline starten

---

## 🎯 AUFGABENGEBIET

### Hauptverantwortlichkeiten:

1. **Task Analysis**
   - User-Task in natürlicher Sprache verstehen
   - Task-Typ erkennen: `feature | fix | refactor | docs | test | question | unknown`
   - Komplexität einschätzen: `low | medium | high`
   - Betroffene Repositories identifizieren

2. **Team Building**
   - Passende Agents für den Task auswählen
   - Agent-Reihenfolge festlegen
   - Model pro Agent empfehlen

3. **Cost & Time Estimation**
   - Token-Kosten schätzen
   - Dauer schätzen
   - Budget-Check durchführen

4. **Feasibility Check**
   - Prüfen ob Task machbar ist
   - Fehlende Informationen identifizieren
   - Risiken erkennen

---

## 🛠️ SKILLS (was der Agent kann)

### 1. Natural Language Understanding
- Versteht vage Anfragen wie "mach die App schneller"
- Extrahiert strukturierte Requirements aus freiem Text
- Erkennt implizite Anforderungen

### 2. Task Classification
```typescript
Erkennt Task-Typen:
- feature: Neue Funktionalität
- fix: Bug beheben
- refactor: Code umstrukturieren
- docs: Dokumentation
- test: Tests schreiben
- question: User will etwas wissen
- unknown: Unklar
```

### 3. Complexity Assessment
```typescript
Schätzt Komplexität basierend auf:
- Anzahl betroffener Files
- Architektur-Änderungen nötig?
- Breaking Changes?
- Tests nötig?
- Docs nötig?

Output: low | medium | high
```

### 4. Repository Detection
- Erkennt Single-Repo vs Multi-Repo Tasks
- Identifiziert betroffene Repos aus Task-Beschreibung

### 5. Agent Selection
```typescript
Wählt Agents basierend auf Task-Typ:
- feature → Architect, Coach, Code, Review, Test, Docs
- fix → Code, Review, Test
- refactor → Architect, Code, Review, Test
- docs → Docs
- test → Test
```

---

## 📥 INPUT INTERFACE

**Was der Agent braucht:**

```typescript
interface SupervisorInput {
  task: string;              // User-Task Beschreibung
  projectPath: string;       // Pfad zum Projekt
  preset?: string;           // Preset Name (z.B. "balanced")
  metadata?: {
    userId?: string;
    teamId?: string;
    budget?: number;
  };
}
```

**Beispiel:**
```typescript
{
  task: "Add user authentication with JWT tokens",
  projectPath: "/Users/user/my-app",
  preset: "balanced",
  metadata: {
    teamId: "team-123",
    budget: 5.00  // Max $5
  }
}
```

---

## 📤 OUTPUT INTERFACE

**Was der Agent zurückgibt:**

```typescript
interface SupervisorOutput {
  // Task Analysis
  taskAnalysis: {
    taskType: 'feature' | 'fix' | 'refactor' | 'docs' | 'test' | 'question' | 'unknown';
    complexity: 'low' | 'medium' | 'high';
    description: string;
    repos: string[];           // Betroffene Repos
    estimatedTokens: number;   // Geschätzte Tokens
    estimatedCost: number;     // Geschätzte Kosten in USD
    estimatedTimeSeconds: number;
  };

  // Team Suggestion
  teamSuggestion: {
    preset: string;            // Empfohlenes Preset
    agents: AgentAssignment[]; // Liste von Agents
    totalCost: number;
    estimatedTime: string;     // "5-10 minutes"
    canOptimize: boolean;
    optimizationTip?: string;
  };

  // Feasibility
  feasible: boolean;
  blockers?: string[];         // Gründe warum nicht machbar
  missingInfo?: string[];      // Fehlende Informationen
}

interface AgentAssignment {
  role: AgentRole;
  model: string;               // z.B. "claude-sonnet-4"
  reason: string;              // Warum dieser Agent?
}
```

**Beispiel Output:**
```typescript
{
  taskAnalysis: {
    taskType: "feature",
    complexity: "high",
    description: "Implement JWT authentication with login/logout",
    repos: ["backend-api"],
    estimatedTokens: 50000,
    estimatedCost: 1.50,
    estimatedTimeSeconds: 600
  },
  teamSuggestion: {
    preset: "balanced",
    agents: [
      { role: "architect", model: "claude-sonnet-4", reason: "Design auth architecture" },
      { role: "coach", model: "claude-sonnet-4", reason: "Plan implementation steps" },
      { role: "code", model: "claude-sonnet-4", reason: "Implement auth logic" },
      { role: "review", model: "deepseek-r1", reason: "Security review critical" },
      { role: "test", model: "deepseek-v3", reason: "Auth tests essential" },
      { role: "docs", model: "llama-scout", reason: "Document auth flow" }
    ],
    totalCost: 1.50,
    estimatedTime: "8-12 minutes",
    canOptimize: false,
    optimizationTip: null
  },
  feasible: true,
  blockers: [],
  missingInfo: []
}
```

---

## ❌ AKTUELLES PROBLEM

### Im Orchestrator (src/services/agent-orchestrator.ts):

**Zeile ~831:**
```typescript
case 'supervisor':
case 'architect':
case 'coach':
  throw new Error(`Agent ${agentName} not yet implemented in MVP`);
```

**Problem:**
1. ❌ Agent wird nicht aufgerufen
2. ❌ Input wird nicht gebaut
3. ❌ Output wird nicht verarbeitet
4. ❌ Context wird nicht gefüllt
5. ❌ Pipeline startet nie

---

## ✅ WAS BENÖTIGT WIRD

### Schritt 1: Input/Output Interfaces exportieren

**In src/agents/supervisor.ts:**

```typescript
// VORHER (private):
interface SupervisorInput { ... }
interface SupervisorOutput { ... }

// NACHHER (public):
export interface SupervisorInput { ... }
export interface SupervisorOutput { ... }
```

---

### Schritt 2: Interfaces im Orchestrator importieren

**In src/services/agent-orchestrator.ts:**

```typescript
import {
  SupervisorAgent,
  type SupervisorInput,
  type SupervisorOutput
} from '../agents/supervisor.js';
```

---

### Schritt 3: PipelineContext erweitern

**In src/services/agent-orchestrator.ts:**

```typescript
interface PipelineContext {
  // NEU hinzufügen:
  supervisorAnalysis?: {
    taskType: string;
    complexity: string;
    description: string;
    repos: string[];
    estimatedTokens: number;
  };
  teamSuggestion?: {
    preset: string;
    agents: AgentAssignment[];
    totalCost: number;
  };

  // ... existing fields
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
case 'supervisor': {
  const supervisorAgent = agent as SupervisorAgent;

  // Build Input
  const supervisorInput: SupervisorInput = {
    task: task,
    projectPath: projectPath,
    preset: preset,
  };

  // Execute Agent
  const output: SupervisorOutput = await supervisorAgent.execute(supervisorInput);

  // Validate Output
  if (!output.feasible) {
    throw new Error(
      `Task not feasible: ${output.blockers?.join(', ')}`
    );
  }

  // Store in Context for next agents
  context.supervisorAnalysis = output.taskAnalysis;
  context.teamSuggestion = output.teamSuggestion;

  // Build Result
  result = {
    inputTokens: 0, // TODO: Get from LLM client
    outputTokens: 0,
    duration: Date.now() - startTime,
    output: output as unknown as Record<string, unknown>,
  };

  break;
}
```

---

### Schritt 5: Error Handling

**Supervisor Failures = HARD FAIL (Pipeline stoppt):**

```typescript
// In executeAgentSequence():
if (['supervisor', 'architect', 'coach', 'code', 'review'].includes(agentName)) {
  // Hard failure - stop pipeline
  result.success = false;
  throw error;
}
```

**Warum HARD FAIL?**
- Ohne Supervisor-Output kann Architect nicht planen
- Ohne Plan können nachfolgende Agents nicht arbeiten
- Pipeline ist blockiert

---

## 🔑 CHARAKTERISTIKEN

| Eigenschaft | Wert |
|-------------|------|
| **Rolle** | Strategischer Planer & Orchestrator |
| **Input** | User Task (String) + Project Path |
| **Output** | TaskAnalysis + TeamSuggestion |
| **Model** | GPT-4 / Claude Opus (braucht starkes Reasoning) |
| **Durchschnittliche Tokens** | Input: 1000-2000 / Output: 500-1000 |
| **Durchschnittliche Kosten** | $0.02 - $0.05 pro Ausführung |
| **Durchschnittliche Dauer** | 3-5 Sekunden |
| **Kritikalität** | 🔴 HOCH - Pipeline-Start abhängig |
| **Failure Handling** | HARD FAIL (stoppt Pipeline) |
| **Retry-fähig** | Ja (max 2 Retries empfohlen) |

---

## 🎯 EXECUTION FLOW

```
┌─────────────────────────────────────┐
│  User Task: "Add authentication"    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      SUPERVISOR AGENT STARTET        │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Analysiert Task:                   │
│  - Type: feature                     │
│  - Complexity: high                  │
│  - Tokens: 50k                       │
│  - Cost: $1.50                       │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Wählt Team:                         │
│  - Architect (claude-sonnet-4)       │
│  - Coach (claude-sonnet-4)           │
│  - Code (claude-sonnet-4)            │
│  - Review (deepseek-r1)              │
│  - Test (deepseek-v3)                │
│  - Docs (llama-scout)                │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Output → PipelineContext speichern  │
│  context.supervisorAnalysis = {...}  │
│  context.teamSuggestion = {...}      │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      Nächster Agent: ARCHITECT       │
└─────────────────────────────────────┘
```

---

## 🧪 TEST-SZENARIEN

### Test 1: Simple Feature Request
```typescript
Input: "Add a logout button"
Expected Output:
- taskType: "feature"
- complexity: "low"
- agents: ["code", "review", "test", "docs"]
- estimatedCost < $0.50
```

### Test 2: Complex Feature
```typescript
Input: "Implement real-time chat with WebSockets"
Expected Output:
- taskType: "feature"
- complexity: "high"
- agents: ["architect", "coach", "code", "review", "test", "docs"]
- estimatedCost > $1.00
```

### Test 3: Bug Fix
```typescript
Input: "Fix memory leak in user service"
Expected Output:
- taskType: "fix"
- complexity: "medium"
- agents: ["code", "review", "test"]
- estimatedCost < $1.00
```

### Test 4: Infeasible Task
```typescript
Input: "Make the app 100x faster"
Expected Output:
- feasible: false
- blockers: ["Requirements too vague", "No specific target defined"]
- missingInfo: ["Which part of the app?", "What is current performance?"]
```

---

## 📊 METRIKEN ZU TRACKEN

### Performance Metriken:
- Durchschnittliche Execution Time
- Token Usage (Input/Output)
- Cost per Execution
- Accuracy der Complexity-Schätzung

### Quality Metriken:
- % korrekte Task-Type Detection
- % korrekte Team Selection
- % feasible vs infeasible Tasks

### Business Metriken:
- Cost Savings durch bessere Model-Selection
- Time Savings durch optimale Agent-Auswahl

---

## 🚀 IMPLEMENTIERUNGS-REIHENFOLGE

1. ✅ **Interfaces exportieren** (5 min)
2. ✅ **Interfaces importieren im Orchestrator** (2 min)
3. ✅ **PipelineContext erweitern** (3 min)
4. ✅ **executeAgent() Case schreiben** (10 min)
5. ✅ **Error Handling hinzufügen** (5 min)
6. ✅ **Testen mit einfachem Task** (5 min)

**Gesamt: ~30 Minuten**

---

## 🔗 DEPENDENCIES

**Supervisor braucht:**
- ✅ LLM Client (vorhanden)
- ✅ Preset Configuration (vorhanden)
- ✅ Project Context (vorhanden)

**Supervisor liefert für:**
- ➡️ **Architect:** taskAnalysis (Task-Type, Complexity)
- ➡️ **Coach:** taskAnalysis + repos
- ➡️ **Alle nachfolgenden Agents:** Kontext über den Task

---

## ❓ OFFENE FRAGEN

1. **Model Selection:** Hardcoded oder aus Preset?
   - MVP: Hardcoded "claude-opus-4"
   - Full: Aus preset.agents.supervisor.model

2. **Budget Enforcement:** Soll Supervisor Task ablehnen wenn zu teuer?
   - MVP: Nur warnen
   - Full: Blockieren + User fragen

3. **Multi-Repo Detection:** Wie erkennt Supervisor betroffene Repos?
   - MVP: Aus projectPath + task string matching
   - Full: Code-Analyse + Dependency Graph

---

## 📝 ZUSAMMENFASSUNG

**Status:** ❌ Nicht implementiert im Orchestrator

**Aufwand:** ~30 Minuten

**Kritikalität:** 🔴 HOCH (Pipeline kann nicht starten)

**Nächster Schritt:** Interfaces exportieren in supervisor.ts
