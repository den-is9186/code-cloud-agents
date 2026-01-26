# 📊 DASHBOARD & MULTI-AGENT SYSTEM - IMPLEMENTATION TASKS

**Basierend auf:** MULTI_AGENT_SYSTEM_COMPLETE.md
**Letzte Aktualisierung:** 2026-01-26
**Status:** Geplant

---

## 🎯 ÜBERSICHT

Dieses Dokument listet ALLE fehlenden Tasks für das vollständige Multi-Agent System mit Dashboard auf.

**Gesamtzahl:** 20 Tasks (aus Section 15 der Complete Doc)
**Geschätzte Zeit:** 15-25 Stunden
**Komplexität:** Hoch

---

## 🔴 PRIORITÄT: KRITISCH (5 Tasks)

### TASK 1: Team CRUD API Endpoints
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Endpoints:**
- `POST /api/teams` - Team erstellen
- `GET /api/teams` - Alle Teams auflisten
- `GET /api/teams/:id` - Team Details
- `PUT /api/teams/:id` - Team aktualisieren
- `DELETE /api/teams/:id` - Team löschen

**Implementation:**
```typescript
// src/api/teams.ts
import { Router } from 'express';
import { z } from 'zod';

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  repo: z.string().regex(/^github\.com\/[^\/]+\/[^\/]+$/),
  preset: z.enum(['A', 'B', 'C', 'D']),
  task: z.string().min(10)
});

router.post('/teams', async (req, res) => {
  const data = CreateTeamSchema.parse(req.body);
  // Create team in Redis
  // Start prototype build (Preset A)
});
```

**Tests:**
- unit:team_create_validation
- http:team_create_201
- http:team_list_200
- integration:team_crud_flow

---

### TASK 2: Workflow State Machine
**Status:** ❌ TODO
**Komplexität:** Hoch
**Zeit:** ~4h

**States:**
```
TEAM_CREATED → PROTOTYPE_RUNNING → AWAITING_APPROVAL
             → APPROVED → PREMIUM_RUNNING → COMPLETED
             → REJECTED → PROTOTYPE_RUNNING (neue Iteration)
             → PARTIAL → PROTOTYPE_RUNNING (mit Anpassungen)
             → SKIPPED → COMPLETED
```

**Implementation:**
```typescript
// src/workflow/state-machine.ts
export class WorkflowStateMachine {
  private transitions = {
    'TEAM_CREATED': ['PROTOTYPE_RUNNING'],
    'PROTOTYPE_RUNNING': ['AWAITING_APPROVAL', 'FAILED'],
    'AWAITING_APPROVAL': ['APPROVED', 'REJECTED', 'PARTIAL', 'SKIPPED'],
    'APPROVED': ['PREMIUM_RUNNING'],
    'PREMIUM_RUNNING': ['COMPLETED', 'FAILED'],
    // ...
  };

  async transition(teamId: string, to: WorkflowState): Promise<void> {
    const current = await this.getCurrentState(teamId);
    if (!this.canTransition(current, to)) {
      throw new Error(`Invalid transition: ${current} → ${to}`);
    }
    // Update state in Redis
    // Trigger actions (e.g., start build)
  }
}
```

**Tests:**
- unit:workflow_state_machine
- unit:workflow_state_validation
- integration:full_workflow_flow

---

### TASK 3: Approval/Reject Endpoints
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Endpoints:**
- `POST /api/teams/:id/approve` - Prototyp bestätigen
- `POST /api/teams/:id/reject` - Prototyp ablehnen
- `POST /api/teams/:id/partial` - Teilweise bestätigen
- `POST /api/teams/:id/skip-premium` - Premium überspringen

**Implementation:**
```typescript
// src/api/workflow.ts
router.post('/teams/:id/approve', async (req, res) => {
  const { comment, modifications } = req.body;

  // Transition to APPROVED
  await stateMachine.transition(req.params.id, 'APPROVED');

  // Start Premium Build (Preset C)
  await buildOrchestrator.startPremiumBuild(req.params.id, modifications);

  res.json({ status: 'PREMIUM_RUNNING' });
});
```

**Tests:**
- http:approve_triggers_premium
- http:reject_restarts_prototype
- http:skip_completes_workflow

---

### TASK 4: Redis Schema implementieren
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Schema:**
```javascript
// Team
{
  key: "team:{team_id}",
  value: {
    id, name, repo, preset,
    workflow: { phase, prototype, premium },
    approval: { status, comment }
  }
}

// Build
{
  key: "build:{build_id}",
  value: {
    id, team_id, preset, phase, status,
    agents: [ { agent, model, tokens, cost } ],
    cost: { total, breakdown }
  }
}

// Indexes
{
  key: "teams:by_repo:{repo}",
  value: ["team_123"]
}
```

**Tests:**
- unit:redis_team_create
- unit:redis_build_create
- unit:redis_indexes

---

### TASK 5: Preset Konfiguration laden
**Status:** ❌ TODO
**Komplexität:** Niedrig
**Zeit:** ~1h

**Implementation:**
```typescript
// src/config/presets.ts
import yaml from 'yaml';
import fs from 'fs';

export const loadPresets = () => {
  const presetsYml = fs.readFileSync('config/presets.yml', 'utf8');
  const modelsYml = fs.readFileSync('config/models.yml', 'utf8');

  return {
    presets: yaml.parse(presetsYml),
    models: yaml.parse(modelsYml)
  };
};
```

**Tests:**
- unit:load_presets_yml
- unit:load_models_yml
- unit:preset_validation

---

## 🟡 PRIORITÄT: HOCH (5 Tasks)

### TASK 6: Agent Orchestrator
**Status:** ❌ TODO
**Komplexität:** Hoch
**Zeit:** ~5h

**Flow:**
```
Supervisor → Architect → Coach → Code → Review → Test → Docs
```

**Implementation:** Bereits in `src/agents/supervisor.ts` vorhanden - muss an Team-System angepasst werden.

**Änderungen:**
- Build-ID in DB speichern
- Agent Runs tracken (tokens, cost)
- Live-Updates via WebSocket senden

**Tests:**
- unit:agent_sequence
- unit:agent_error_handling
- integration:full_agent_flow

---

### TASK 7: Build Tracking
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Features:**
- Build starten und ID generieren
- Agent Runs tracken
- Status updates
- Logs sammeln

**Tests:**
- integration:build_tracking_flow

---

### TASK 8: Kosten-Tracking
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Implementation:**
```typescript
// src/utils/cost-tracker.ts
export class CostTracker {
  calculateAgentCost(inputTokens: number, outputTokens: number, model: string): number {
    const modelConfig = models[model];
    return (
      (inputTokens * modelConfig.pricing.input_per_million / 1_000_000) +
      (outputTokens * modelConfig.pricing.output_per_million / 1_000_000)
    );
  }

  async getBuildCost(buildId: string): Promise<CostBreakdown> {
    const build = await redis.get(`build:${buildId}`);
    const total = build.agents.reduce((sum, agent) => sum + agent.cost, 0);
    return { total, agents: build.agents };
  }
}
```

**Tests:**
- unit:calculate_agent_cost
- unit:calculate_build_cost
- unit:budget_alert_trigger

---

### TASK 9: Team Dashboard UI
**Status:** ❌ TODO
**Komplexität:** Hoch
**Zeit:** ~4h

**Tech Stack:** React + TypeScript + Tailwind CSS

**Komponenten:**
- `TeamList` - Liste aller Teams
- `TeamCard` - Einzelnes Team anzeigen
- `CreateTeamButton` - Neues Team erstellen
- `StatusBadge` - Workflow-Status visualisieren

**Tests:**
- e2e:dashboard_loads
- e2e:create_team_button

---

### TASK 10: Team Settings UI
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~3h

**Komponenten:**
- `PresetSelector` - A/B/C/D Auswahl
- `AgentConfigurator` - Custom Agents konfigurieren
- `CostEstimate` - Geschätzte Kosten anzeigen

**Tests:**
- e2e:preset_selection
- e2e:custom_agent_config

---

## 🟢 PRIORITÄT: MITTEL (5 Tasks)

### TASK 11: Approval Dialog UI
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~3h

**Features:**
- Prototyp-Ergebnis anzeigen
- 4 Aktionen: Approve / Reject / Partial / Skip
- Kommentar-Feld
- Modifications-Liste

**Tests:**
- e2e:approval_dialog_opens
- e2e:approve_triggers_premium

---

### TASK 12: Build Progress UI
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~3h

**Features:**
- Live Progress Bar
- Agent-Status (✅ completed, 🔄 running, ⏳ pending)
- Live-Log-Stream (WebSocket/SSE)
- Kosten-Tracking live

**Tests:**
- e2e:progress_bar_updates
- e2e:log_stream_works

---

### TASK 13: Log Streaming
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Implementation:**
```typescript
// src/api/streaming.ts
import { EventEmitter } from 'events';

const buildEvents = new EventEmitter();

router.get('/teams/:id/builds/:buildId/logs', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const sendLog = (log: string) => {
    res.write(`data: ${JSON.stringify({ log })}\n\n`);
  };

  buildEvents.on(`build:${req.params.buildId}:log`, sendLog);

  req.on('close', () => {
    buildEvents.off(`build:${req.params.buildId}:log`, sendLog);
  });
});
```

---

### TASK 14: Notification System
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~2h

**Features:**
- Email bei AWAITING_APPROVAL
- Webhook bei Build Complete
- Slack/Discord Integration (optional)

---

### TASK 15: Refactor Agents
**Status:** ❌ TODO
**Komplexität:** Niedrig
**Zeit:** ~2h

**Agents:**
- Refactor Budget (DeepSeek R1)
- Refactor Standard (Claude Sonnet)
- Refactor Premium (Claude Opus)

---

## 🔵 PRIORITÄT: NIEDRIG (5 Tasks)

### TASK 16: Merge Agents
**Status:** ❌ TODO
**Komplexität:** Niedrig
**Zeit:** ~2h

**Agents:**
- Merge Budget
- Merge Standard
- Merge Premium

---

### TASK 17: Multi-Repo Agents
**Status:** ❌ TODO
**Komplexität:** Mittel
**Zeit:** ~3h

**Agents:**
- Multi-Repo Budget
- Multi-Repo Premium

---

### TASK 18: Tool Builder Agents
**Status:** ❌ TODO
**Komplexität:** Niedrig
**Zeit:** ~2h

---

### TASK 19: Budget Alerts
**Status:** ❌ TODO
**Komplexität:** Niedrig
**Zeit:** ~1h

**Features:**
- Alert bei 80% Budget erreicht
- Monatliches Limit setzen
- Email bei Überschreitung

---

### TASK 20: Export/Reports
**Status:** ❌ TODO
**Komplexität:** Niedrig
**Zeit:** ~2h

**Features:**
- CSV Export von Kosten
- PDF Build Reports
- Monatliche Zusammenfassungen

---

## 📊 ZUSAMMENFASSUNG

| Priorität | Anzahl | Geschätzte Zeit | Status |
|-----------|--------|-----------------|--------|
| 🔴 KRITISCH | 5 | 11h | ❌ 0/5 |
| 🟡 HOCH | 5 | 16h | ❌ 0/5 |
| 🟢 MITTEL | 5 | 12h | ❌ 0/5 |
| 🔵 NIEDRIG | 5 | 10h | ❌ 0/5 |
| **GESAMT** | **20** | **49h** | **❌ 0/20** |

---

## 🚀 IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: Backend Foundation (Tasks 1-5) - ~11h
```bash
1. Redis Schema implementieren
2. Preset Konfiguration laden
3. Team CRUD API Endpoints
4. Workflow State Machine
5. Approval/Reject Endpoints
```

### Phase 2: Agent System (Tasks 6-8) - ~9h
```bash
6. Agent Orchestrator anpassen
7. Build Tracking
8. Kosten-Tracking
```

### Phase 3: Dashboard UI (Tasks 9-10) - ~7h
```bash
9. Team Dashboard UI
10. Team Settings UI
```

### Phase 4: Workflow UI (Tasks 11-13) - ~8h
```bash
11. Approval Dialog UI
12. Build Progress UI
13. Log Streaming
```

### Phase 5: Polish (Tasks 14-20) - ~14h
```bash
14-20. Notifications, Agents, Alerts, Reports
```

---

## 🔗 ABHÄNGIGKEITEN

```
Phase 1 (Backend) → MUSS ZUERST
    ↓
Phase 2 (Agents) → Braucht Phase 1
    ↓
Phase 3 (Dashboard) → Braucht Phase 1 APIs
    ↓
Phase 4 (Workflow UI) → Braucht Phase 1 + 2 + 3
    ↓
Phase 5 (Polish) → Optional, kann parallel
```

---

## ✅ ERFOLGSKRITERIEN

**Nach Completion:**
- [ ] User kann Team erstellen
- [ ] Workflow State Machine funktioniert
- [ ] Prototyp (Preset A) wird automatisch gebaut
- [ ] User erhält Approval-Dialog
- [ ] User kann Approve/Reject/Skip
- [ ] Premium Build (Preset C) startet nach Approval
- [ ] Live-Progress wird angezeigt
- [ ] Kosten werden getrackt
- [ ] Dashboard zeigt alle Teams
- [ ] Settings können geändert werden

---

**Erstellt:** 2026-01-26
**Basierend auf:** MULTI_AGENT_SYSTEM_COMPLETE.md Section 15
**Next Action:** Phase 1 starten (Tasks 1-5)
