# 🆕 NEUE INFORMATIONEN AUS DEN FINAL DATEIEN

**Datum:** 2026-01-26
**Quelle:** MASTER_RUNBOOK_FINAL.md, MASTER_TODO_FINAL.md, presets.yml (egls/)
**Status:** Bereit zur Integration

---

## 📋 ÜBERSICHT - WAS IST NEU?

### Aus MASTER_RUNBOOK_FINAL.md (9 neue Themen):
1. ✅ **IQ Preset** - IQuest Hybrid Konfiguration
2. ✅ **Scout Local Setup** - 3 Methoden (Ollama/vLLM/llama.cpp)
3. ✅ **Queue/Automation** - .task-queue.txt + queue-processor.yml
4. ✅ **Observability Details** - SSE/WS Endpoints für Logs
5. ✅ **Cost Tracking API** - GET /api/teams/:id/builds/:buildId/cost
6. ✅ **Contract Verification** - Response/Error Envelopes
7. ✅ **Incident Runbooks** - 3 Szenarien (Redis/Rate Limit/Workflow stuck)
8. ✅ **Secrets/Env erweitert** - HF_API_KEY, IQUEST_ENDPOINT, LOCAL_LLM_ENDPOINT
9. ✅ **Normalbetrieb Details** - Zwei-Phasen Workflow mit allen Endpoints

### Aus MASTER_TODO_FINAL.md (5 neue Themen):
1. ✅ **Source of Truth Referenzen** - Welche Datei für was
2. ✅ **Security Fixes** - SEC-001 (Path Traversal), SEC-002 (Command Injection)
3. ✅ **Bug Fixes** - BUG-001 bis BUG-005 (JSON/Error/Retry/Pruning)
4. ✅ **14 Agent Engine Tasks** - T1-T14 mit exakter Reihenfolge
5. ✅ **IQ Preset Requirements** - HF_API_KEY, Model Registry, Secrets

### Aus presets.yml (1 neues Thema):
1. ✅ **IQ Preset vollständig** - Alle Agents, Models, Requirements, Use Cases

---

## 1️⃣ IQ PRESET (IQuest Hybrid)

### Was es ist:
- **Name:** IQuest Hybrid
- **Cost:** $10/build
- **Quality:** 78/100
- **Error Rate:** 8%

### Agent-Konfiguration:
```yaml
IQ:
  agents:
    supervisor:
      model: deepseek-r1-0528
      role: "Orchestriert alle Agents"

    architect:
      model: deepseek-r1-0528
      role: "Erstellt Runbook (Reasoning)"

    coach:
      model: deepseek-r1-0528
      role: "Plant Tasks (Reasoning)"

    code:
      model: iquest-coder-v1-40b-loop
      role: "Schreibt Code (IQuest Loop)"

    review:
      model: deepseek-r1-0528
      role: "Code Review (Reasoning)"

    test:
      model: iquest-coder-v1-40b-loop
      role: "Schreibt Tests (IQuest Loop)"

    docs:
      model: llama-4-scout-local
      role: "Schreibt Dokumentation (LOKAL)"

    vision:
      model: llama-4-scout-local
      role: "Analysiert Screenshots (LOKAL)"
```

### Requirements:
```yaml
requirements:
  api_keys:
    - "HF_API_KEY (für IQuest via HuggingFace)"
    - "NOVITA_API_KEY (für DeepSeek R1)"
  optional:
    - "IQUEST_ENDPOINT (wenn self-hosted)"
    - "LOCAL_LLM_ENDPOINT (für Scout lokal)"
```

### Use Cases:
```yaml
use_cases:
  - "Budget-freundlich + lokal für Docs/Vision"
  - "IQuest Loop für iteratives Coding"
  - "DeepSeek R1 für komplexes Reasoning"
  - "Ideal wenn eigener Server vorhanden (für Scout)"
```

### Wo hinzufügen:
- ✅ **MASTER_RUNBOOK.md** - Section 2.2 "IQuest Preset IQ"
- ✅ **capabilities.yml** - Presets Reference erweitern
- ✅ **DASHBOARD_IMPLEMENTATION_TASKS.md** - Task erweitern: IQ Preset Support

---

## 2️⃣ SCOUT LOCAL SETUP

### 3 Methoden:

#### Methode 1: Ollama (Einfach)
```bash
# Setup
./config/setup-scout-local.sh ollama

# Endpoint
http://<server>:11434/v1

# Environment Variable
LOCAL_LLM_ENDPOINT=http://<server>:11434
```

#### Methode 2: vLLM (Production)
```bash
# Setup
./config/setup-scout-local.sh vllm 8000

# Endpoint
http://<server>:8000/v1

# Environment Variable
LOCAL_LLM_ENDPOINT=http://<server>:8000
```

#### Methode 3: llama.cpp (Lightweight)
```bash
# Setup
./config/setup-scout-local.sh llamacpp 8080

# Endpoint
http://<server>:8080/v1

# Environment Variable
LOCAL_LLM_ENDPOINT=http://<server>:8080
```

### Healthcheck:
```bash
# Test OpenAI-compatible Endpoint
curl http://<server>:11434/v1/models
curl -X POST http://<server>:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-4-scout","messages":[{"role":"user","content":"test"}]}'
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `SCOUT_LOCAL_SETUP_GUIDE.md`
- ✅ **MASTER_RUNBOOK.md** - Section 3 "Scout Local Setup"
- ✅ **config/setup-scout-local.sh** - Script erstellen

---

## 3️⃣ QUEUE/AUTOMATION

### Queue File:
```bash
# File
.task-queue.txt

# Format (eine Task pro Zeile)
Fix bug in login function
Add dark mode support
Refactor API endpoints
```

### Queue Task Script:
```bash
#!/bin/bash
# queue-task.sh

TASK="$1"

if [ -z "$TASK" ]; then
  echo "Usage: ./queue-task.sh \"Task description\""
  exit 1
fi

echo "$TASK" >> .task-queue.txt
git add .task-queue.txt
git commit -m "Queue: $TASK"
git push
```

### Queue Processor (GitHub Actions):
```yaml
# .github/workflows/queue-processor.yml
name: Queue Processor

on:
  schedule:
    - cron: '0 */4 * * *'  # Alle 4 Stunden
  workflow_dispatch:

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get next task
        id: task
        run: |
          TASK=$(head -n 1 .task-queue.txt)
          echo "task=$TASK" >> $GITHUB_OUTPUT
          tail -n +2 .task-queue.txt > .task-queue.tmp
          mv .task-queue.tmp .task-queue.txt

      - name: Run Aider
        run: |
          aider --message "${{ steps.task.outputs.task }}"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          HF_API_KEY: ${{ secrets.HF_API_KEY }}
          NOVITA_API_KEY: ${{ secrets.NOVITA_API_KEY }}

      - name: Commit & Push
        run: |
          git config user.name "Queue Processor"
          git config user.email "bot@example.com"
          git add .
          git commit -m "Completed: ${{ steps.task.outputs.task }}"
          git push
```

### Betriebsregeln:
```markdown
- Kritische Änderungen bevorzugt über PR-Flow (nicht direkt main)
- Secrets müssen vollständig sein (nicht nur Anthropic)
- Optional: build/test gate vor push
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `queue-task.sh` (Script)
- ✅ **Neue Datei:** `.github/workflows/queue-processor.yml`
- ✅ **MASTER_RUNBOOK.md** - Section 6 "Queue/Automation"

---

## 4️⃣ OBSERVABILITY DETAILS

### Log Endpoints:
```typescript
// GET /api/teams/:id/builds/:buildId/logs
// Optional: ?stream=true für SSE

app.get('/api/teams/:teamId/builds/:buildId/logs', async (req, res) => {
  const { stream } = req.query;

  if (stream === 'true') {
    // SSE Streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const logStream = getLogStream(buildId);
    logStream.on('data', (log) => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    });
  } else {
    // Normal response
    const logs = await getBuildLogs(buildId);
    res.json({ data: logs });
  }
});
```

### WebSocket Endpoint:
```typescript
// WS /ws/teams/:id/builds/:buildId

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const buildId = extractBuildId(req.url);

  const logStream = getLogStream(buildId);
  logStream.on('data', (log) => {
    ws.send(JSON.stringify({ type: 'log', data: log }));
  });

  ws.on('close', () => {
    logStream.destroy();
  });
});
```

### Wo hinzufügen:
- ✅ **MASTER_RUNBOOK.md** - Section 5 "Observability" erweitern
- ✅ **DASHBOARD_IMPLEMENTATION_TASKS.md** - Task 13 erweitern (SSE/WS Details)

---

## 5️⃣ COST TRACKING API

### Endpoint:
```typescript
// GET /api/teams/:id/builds/:buildId/cost

interface CostResponse {
  data: {
    total: number;
    breakdown: {
      agent: string;
      model: string;
      input_tokens: number;
      output_tokens: number;
      cost: number;
    }[];
  };
}

app.get('/api/teams/:teamId/builds/:buildId/cost', async (req, res) => {
  const build = await getBuild(buildId);
  const agentRuns = await getAgentRuns(buildId);

  const breakdown = agentRuns.map(run => ({
    agent: run.agent,
    model: run.model,
    input_tokens: run.input_tokens,
    output_tokens: run.output_tokens,
    cost: calculateCost(run)
  }));

  const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

  res.json({ data: { total, breakdown } });
});
```

### Team Totals (später):
```typescript
// GET /api/teams/:id/cost?month=2026-01

interface TeamCostResponse {
  data: {
    month: string;
    total: number;
    budget: number;
    remaining: number;
    builds: {
      build_id: string;
      cost: number;
      phase: 'prototype' | 'premium';
    }[];
  };
}
```

### Wo hinzufügen:
- ✅ **MASTER_RUNBOOK.md** - Section 5.2 "Costs" erweitern
- ✅ **DASHBOARD_IMPLEMENTATION_TASKS.md** - Task 8 erweitern

---

## 6️⃣ CONTRACT VERIFICATION

### Response Envelope (Erfolg):
```typescript
// Erfolg (Single)
{
  "data": {
    "id": "team_123",
    "name": "My Team",
    "status": "active"
  }
}

// Erfolg (Liste)
{
  "data": [
    { "id": "team_123", "name": "Team 1" },
    { "id": "team_456", "name": "Team 2" }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

### Error Envelope:
```typescript
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from PROTOTYPE_RUNNING to PREMIUM_RUNNING",
    "details": {
      "current_state": "PROTOTYPE_RUNNING",
      "requested_state": "PREMIUM_RUNNING",
      "required_state": "AWAITING_APPROVAL"
    }
  }
}
```

### Status Codes:
```typescript
// 409 Conflict - Falsche Phase
{
  "error": {
    "code": "WORKFLOW_CONFLICT",
    "message": "Team must be in AWAITING_APPROVAL state to approve",
    "details": {
      "current_state": "PROTOTYPE_RUNNING",
      "available_actions": []
    }
  }
}

// 200 OK - Mit available_actions
{
  "data": {
    "team_id": "team_123",
    "phase": "AWAITING_APPROVAL",
    "available_actions": [
      "approve",
      "reject",
      "partial",
      "skip-premium"
    ]
  }
}
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `CONTRACTS/response_contract.md`
- ✅ **MASTER_RUNBOOK.md** - Section 7 "Contract Verification"

---

## 7️⃣ INCIDENT RUNBOOKS

### Incident 1: Redis down
```markdown
## Symptome:
- `GET /health` zeigt `redis: disconnected`
- Alle Team-Operationen schlagen fehl

## Recovery:
1. Redis Status prüfen:
   ```bash
   redis-cli ping
   ```
2. Redis starten:
   ```bash
   # Docker
   docker start redis

   # Service
   sudo systemctl start redis
   ```
3. Smoke Tests:
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/api/teams
   ```
```

### Incident 2: Provider Rate Limit/Timeout
```markdown
## Symptome:
- 429 Too Many Requests
- Agent Runs schlagen fehl
- Timeout Errors

## Recovery:
1. Retry/Backoff prüfen:
   ```typescript
   // src/llm/client.ts
   const withRetry = async (fn, retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (err) {
         if (err.status === 429 || err.status >= 500) {
           await sleep(2 ** i * 1000); // Exponential backoff
         } else {
           throw err;
         }
       }
     }
   };
   ```
2. Keys/Limits prüfen:
   - Anthropic: https://console.anthropic.com/settings/limits
   - Novita: https://novita.ai/dashboard/api-keys
3. Preset downgrade (falls möglich):
   - C → D → B → A
```

### Incident 3: Workflow stuck (409)
```markdown
## Symptome:
- `POST /api/teams/:id/approve` → 409 Conflict
- UI zeigt falsche Aktionen

## Recovery:
1. Status prüfen:
   ```bash
   curl http://localhost:3000/api/teams/team_123/status
   ```
2. State Machine prüfen:
   ```typescript
   // src/workflow/state-machine.ts
   const allowedTransitions = {
     'AWAITING_APPROVAL': ['APPROVED', 'REJECTED', 'PARTIAL', 'SKIPPED']
   };
   ```
3. Bugfix:
   - Transition-Logik prüfen
   - `available_actions` korrigieren
4. Recovery Tool (Optional):
   ```bash
   # Manually set state (DANGER!)
   redis-cli HSET "team:team_123" "phase" "AWAITING_APPROVAL"
   ```
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `ops/INCIDENT_RUNBOOKS.md`
- ✅ **MASTER_RUNBOOK.md** - Section 8 "Incident Runbooks"

---

## 8️⃣ SECRETS/ENV ERWEITERT

### Vollständige Liste:
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...       # Claude (falls genutzt)
NOVITA_API_KEY=...                 # DeepSeek via Novita
HF_API_KEY=hf_...                  # IQuest via HuggingFace

# Optional
IQUEST_ENDPOINT=https://...        # Self-hosted IQuest
LOCAL_LLM_ENDPOINT=http://...      # Scout local (Ollama/vLLM)
LOG_API_CALLS=true                 # Debug LLM Calls

# Database
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://...      # Optional

# Server
PORT=3000
NODE_ENV=production
```

### Preflight Check:
```bash
# 1.2 Secrets/Env
- [ ] NOVITA_API_KEY gesetzt (DeepSeek)
- [ ] HF_API_KEY gesetzt (IQuest)
- [ ] ANTHROPIC_API_KEY gesetzt (falls Claude)
- [ ] Optional: IQUEST_ENDPOINT
- [ ] Optional: LOCAL_LLM_ENDPOINT
- [ ] Optional: LOG_API_CALLS=true
```

### Wo hinzufügen:
- ✅ **MASTER_RUNBOOK.md** - Section 1.2 "Secrets/Env" erweitern
- ✅ **.env.example** erstellen

---

## 9️⃣ NORMALBETRIEB DETAILS

### Phase 1: Prototype
```bash
# Start
POST /api/teams/:id/start

# Status während Lauf
phase: PROTOTYPE_RUNNING

# Ende
phase: AWAITING_APPROVAL
```

### Approval Gate:
```bash
# Wenn phase == AWAITING_APPROVAL:

# Option 1: Approve
POST /api/teams/:id/approve
→ PREMIUM_RUNNING

# Option 2: Reject
POST /api/teams/:id/reject
→ PROTOTYPE_RUNNING (Iteration++)

# Option 3: Partial
POST /api/teams/:id/partial
Body: { "modifications": "..." }
→ PROTOTYPE_RUNNING (mit Anpassungen)

# Option 4: Skip Premium
POST /api/teams/:id/skip-premium
→ COMPLETED
```

### Phase 2: Premium
```bash
# Start (nach Approve)
phase: PREMIUM_RUNNING

# Ende
phase: COMPLETED
```

### Wo hinzufügen:
- ✅ **MASTER_RUNBOOK.md** - Section 4 "Normalbetrieb" (bereits vorhanden, nur verifizieren)

---

## 🔟 SOURCE OF TRUTH REFERENZEN

### Aus MASTER_TODO_FINAL.md:

```markdown
## 0) Source of Truth (SoT)
- **API Contract (HTTP/WS/SSE):** `config/api_contract.md`
- **Plattform/Workflow/State Machine/Capabilities:** `MULTI_AGENT_SYSTEM_COMPLETE.md`
- **Agent Engine (IQuest + Overrides):** `AIDER_TASKS_FINAL_V2.md`
- **Security/Crash Fixes:** `AIDER_BUGFIX_TASKS.md`
- **Preset-Konfiguration (Plattform):** `config/presets.yml` (inkl. neuem Preset `IQ`)
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `SOURCE_OF_TRUTH.md`
- ✅ **README.md** - Section "Documentation Structure"

---

## 1️⃣1️⃣ SECURITY FIXES

### SEC-001: Path Traversal Fix
```typescript
// BEFORE (VULNERABLE)
// src/tools/index.ts
const filePath = path.join(BASE_DIR, userInput);
fs.readFileSync(filePath);  // ❌ userInput könnte "../../../etc/passwd" sein

// AFTER (SECURE)
// src/tools/index.ts
function validatePath(userPath: string): string {
  const resolved = path.resolve(BASE_DIR, userPath);

  // Prüfe ob resolved innerhalb BASE_DIR ist
  if (!resolved.startsWith(path.resolve(BASE_DIR))) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

// Usage
const safePath = validatePath(userInput);
fs.readFileSync(safePath);  // ✅ Sicher
```

### SEC-002: Command Injection Fix
```typescript
// BEFORE (VULNERABLE)
// src/tools/index.ts
const { exec } = require('child_process');
exec(`git commit -m "${userMessage}"`, callback);  // ❌ Shell injection!

// AFTER (SECURE)
// src/tools/index.ts
const { execFile } = require('child_process');
execFile('git', ['commit', '-m', userMessage], callback);  // ✅ Sicher
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `SECURITY_FIXES.md`
- ✅ **src/tools/index.ts** - Implementieren
- ✅ **DASHBOARD_IMPLEMENTATION_TASKS.md** - Tasks hinzufügen

---

## 1️⃣2️⃣ BUG FIXES

### BUG-001: JSON Schema Validation
```typescript
// BEFORE (UNSAFE)
const result = JSON.parse(llmResponse);
const runbook = result.runbook;  // ❌ Kann crashen

// AFTER (SAFE)
import { z } from 'zod';

const RunbookSchema = z.object({
  runbook: z.string(),
  steps: z.array(z.object({
    name: z.string(),
    commands: z.array(z.string())
  }))
});

function safeJsonParse<T>(json: string, schema: z.ZodSchema<T>): T {
  const parsed = JSON.parse(json);
  return schema.parse(parsed);  // Wirft Fehler wenn invalid
}

const result = safeJsonParse(llmResponse, RunbookSchema);
```

### BUG-002: Supervisor Error Handling
```typescript
// BEFORE (UNSAFE)
const agent = this.agents.get(agentName)!;  // ❌ Kann undefined sein

// AFTER (SAFE)
function getAgent(agentName: string): Agent {
  const agent = this.agents.get(agentName);
  if (!agent) {
    throw new Error(`Agent not found: ${agentName}`);
  }
  return agent;
}

const agent = getAgent(agentName);  // ✅ Sicher
```

### BUG-003: Race Condition / Result Aggregation
```typescript
// BEFORE (UNSAFE - Race Condition)
let results = [];
agents.forEach(async (agent) => {
  const result = await agent.run();
  results.push(result);  // ❌ Unsafe mutation!
});

// AFTER (SAFE)
const results = await Promise.all(
  agents.map(agent => agent.run())
);  // ✅ Sequentiell gesammelt
```

### BUG-004: LLM Client Retry/Timeout/Backoff
```typescript
// BEFORE (NO RETRY)
const response = await fetch(API_URL, options);  // ❌ Kein Retry

// AFTER (WITH RETRY)
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  timeout = 60000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await fn();
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      if (err.status === 429 || err.status >= 500) {
        const backoff = Math.min(2 ** i * 1000, 30000);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### BUG-005: Chat History Pruning
```typescript
// BEFORE (UNBOUNDED)
this.messages.push(message);  // ❌ Kontext wächst unbegrenzt

// AFTER (SLIDING WINDOW)
const MAX_MESSAGES = 50;

function addMessage(message: Message): void {
  this.messages.push(message);

  if (this.messages.length > MAX_MESSAGES) {
    // Behalte erste (System) + letzte (MAX_MESSAGES - 1)
    this.messages = [
      this.messages[0],
      ...this.messages.slice(-(MAX_MESSAGES - 1))
    ];
  }
}
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `BUG_FIXES.md`
- ✅ **src/agents/*.ts** - Implementieren
- ✅ **src/llm/client.ts** - Retry-Logik
- ✅ **src/chat/assistant.ts** - History Pruning

---

## 1️⃣3️⃣ 14 AGENT ENGINE TASKS (T1-T14)

### Aus MASTER_TODO_FINAL.md:

```markdown
## 3) HOCH — Agent Engine (14 Tasks, FINAL V2 Reihenfolge)
- **T1:** `src/agents/types.ts` (inkl. `TeamOverride`)
- **T2:** `src/tools/index.ts` (mit Security Fixes)
- **T3:** `src/llm/client.ts` (HF/Novita/Anthropic/Local + Retry)
- **T4:** `src/agents/supervisor.ts` (Overrides + getAgent + loops)
- **T5:** `src/agents/architect.ts`
- **T6:** `src/agents/coach.ts`
- **T7:** `src/agents/code.ts` (Default IQuest)
- **T8:** `src/agents/review.ts`
- **T9:** `src/agents/test.ts` (Default IQuest)
- **T10:** `src/agents/docs.ts` (Scout Local)
- **T11:** `src/agents/vision.ts` (Scout Local)
- **T12:** `src/index.ts` (Presets + overrides + run())
- **T13:** `src/chat/assistant.ts` (Override Parsing + History Pruning)
- **T14:** `src/chat/cli.ts`
```

### Details zu kritischen Tasks:

#### T1: TeamOverride Type
```typescript
// src/agents/types.ts
export interface TeamOverride {
  agent: AgentType;
  model?: string;
  role?: string;
}

export interface TeamConfig {
  id: string;
  name: string;
  preset: PresetName;
  overrides?: TeamOverride[];
}
```

#### T7: Code Agent (Default IQuest)
```typescript
// src/agents/code.ts
export class CodeAgent extends BaseAgent {
  getDefaultModel(): string {
    // Wenn Preset IQ → iquest-coder-v1-40b-loop
    if (this.preset === 'IQ') {
      return 'iquest-coder-v1-40b-loop';
    }
    return super.getDefaultModel();
  }
}
```

#### T10: Docs Agent (Scout Local)
```typescript
// src/agents/docs.ts
export class DocsAgent extends BaseAgent {
  getDefaultModel(): string {
    // Wenn Preset LOCAL oder IQ → llama-4-scout-local
    if (['LOCAL', 'IQ'].includes(this.preset)) {
      return 'llama-4-scout-local';
    }
    return super.getDefaultModel();
  }
}
```

### Wo hinzufügen:
- ✅ **Neue Datei:** `AGENT_ENGINE_TASKS.md`
- ✅ **DASHBOARD_IMPLEMENTATION_TASKS.md** - Section erweitern

---

## 1️⃣4️⃣ IQ PRESET REQUIREMENTS

### Model Registry erweitern:
```typescript
// src/llm/models.ts
export const MODELS = {
  // ... existing models ...

  // IQuest (HuggingFace)
  'iquest-coder-v1-40b-loop': {
    provider: 'huggingface',
    pricing: {
      input: 0.50,  // per 1M tokens
      output: 1.00
    },
    context_window: 32768,
    supports_tools: true
  },

  // Scout Local
  'llama-4-scout-local': {
    provider: 'local',
    pricing: {
      input: 0,
      output: 0
    },
    context_window: 10_000_000,  // 10M!
    supports_vision: true
  }
};
```

### LLM Client erweitern:
```typescript
// src/llm/client.ts
export class LLMClient {
  async chat(model: string, messages: Message[]): Promise<string> {
    const modelInfo = MODELS[model];

    switch (modelInfo.provider) {
      case 'huggingface':
        return this.chatHuggingFace(model, messages);
      case 'local':
        return this.chatLocal(model, messages);
      // ...
    }
  }

  private async chatHuggingFace(model: string, messages: Message[]): Promise<string> {
    const response = await fetch('https://api-inference.huggingface.co/models/' + model, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: messages })
    });
    return response.json();
  }

  private async chatLocal(model: string, messages: Message[]): Promise<string> {
    const endpoint = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434';
    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages })
    });
    return response.json();
  }
}
```

### Secrets Validation:
```typescript
// src/config/validate-env.ts
export function validateEnv() {
  const required = ['NOVITA_API_KEY'];
  const optional = ['ANTHROPIC_API_KEY', 'HF_API_KEY', 'LOCAL_LLM_ENDPOINT'];

  // Wenn Preset IQ verwendet wird
  if (process.env.PRESET === 'IQ') {
    required.push('HF_API_KEY');  // Für IQuest
    // LOCAL_LLM_ENDPOINT optional (für Scout)
  }

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}
```

### Wo hinzufügen:
- ✅ **src/llm/models.ts** - Model Registry
- ✅ **src/llm/client.ts** - HuggingFace + Local Support
- ✅ **src/config/validate-env.ts** - Validation

---

## ✅ ZUSAMMENFASSUNG

### Neue Dateien zu erstellen:
1. ✅ `SCOUT_LOCAL_SETUP_GUIDE.md`
2. ✅ `CONTRACTS/response_contract.md`
3. ✅ `ops/INCIDENT_RUNBOOKS.md`
4. ✅ `SOURCE_OF_TRUTH.md`
5. ✅ `SECURITY_FIXES.md`
6. ✅ `BUG_FIXES.md`
7. ✅ `AGENT_ENGINE_TASKS.md`
8. ✅ `queue-task.sh`
9. ✅ `.github/workflows/queue-processor.yml`
10. ✅ `config/setup-scout-local.sh`
11. ✅ `.env.example`

### Dateien zu aktualisieren:
1. ✅ `MASTER_RUNBOOK.md` - Sections 2.2, 3, 4, 5, 6, 7, 8
2. ✅ `capabilities.yml` - IQ Preset Reference
3. ✅ `DASHBOARD_IMPLEMENTATION_TASKS.md` - Tasks erweitern + Agent Engine Tasks
4. ✅ `src/llm/models.ts` - IQuest + Scout Models
5. ✅ `src/llm/client.ts` - HF + Local Support + Retry
6. ✅ `src/agents/types.ts` - TeamOverride
7. ✅ `src/agents/code.ts` - IQuest Default
8. ✅ `src/agents/test.ts` - IQuest Default
9. ✅ `src/agents/docs.ts` - Scout Local Default
10. ✅ `src/tools/index.ts` - Security Fixes
11. ✅ `README.md` - Documentation Structure

### Priorität:
- 🔴 **KRITISCH:** Security Fixes (SEC-001, SEC-002) → SOFORT
- 🔴 **KRITISCH:** Bug Fixes (BUG-001 bis BUG-005) → SOFORT
- 🟡 **HOCH:** IQ Preset Integration (Model Registry, LLM Client)
- 🟡 **HOCH:** Agent Engine Tasks (T1-T14)
- 🟢 **MITTEL:** Scout Local Setup Guide
- 🟢 **MITTEL:** Queue/Automation Scripts
- 🔵 **NIEDRIG:** Incident Runbooks
- 🔵 **NIEDRIG:** Documentation Updates

---

**Nächster Schritt:** Diese Informationen in die bestehenden Dokumente integrieren?

