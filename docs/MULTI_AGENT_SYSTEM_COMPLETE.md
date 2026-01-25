# 🤖 MULTI-AGENT SYSTEM - KOMPLETTE DOKUMENTATION

**Version:** 1.0.0  
**Stand:** 2026-01-25  
**Status:** Abgestimmt & Freigegeben

---

## 📋 INHALTSVERZEICHNIS

1. [System-Übersicht](#1-system-übersicht)
2. [Alle Agenten (17 Profile)](#2-alle-agenten-17-profile)
3. [Alle Modelle](#3-alle-modelle)
4. [Alle Varianten (6 Presets)](#4-alle-varianten-6-presets)
5. [Qualitäts-Bewertungen (0-100)](#5-qualitäts-bewertungen-0-100)
6. [Default Workflow](#6-default-workflow)
7. [Workflow State Machine](#7-workflow-state-machine)
8. [API Endpoints](#8-api-endpoints)
9. [Datenbank Schema](#9-datenbank-schema)
10. [UI Komponenten](#10-ui-komponenten)
11. [Team-Einstellungen](#11-team-einstellungen)
12. [Kosten-Kalkulation](#12-kosten-kalkulation)
13. [MASTER RUNBOOK (Aktualisiert)](#13-master-runbook-aktualisiert)
14. [Capabilities (Aktualisiert)](#14-capabilities-aktualisiert)
15. [Implementierungs-Tasks](#15-implementierungs-tasks)

---

## 1. SYSTEM-ÜBERSICHT

### Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER / DASHBOARD                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPERVISOR AGENT                                │
│                    (Routing & Orchestrierung)                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  STANDARD FLOW  │    │  REFACTOR FLOW  │    │   MERGE FLOW    │
│                 │    │                 │    │                 │
│ Architect       │    │ Refactor Agent  │    │ Merge Agent     │
│ Coach           │    │ Review Agent    │    │ Multi-Repo      │
│ Code            │    │                 │    │ Review Agent    │
│ Review          │    │                 │    │                 │
│ Test            │    │                 │    │                 │
│ Docs            │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           GITHUB REPO                                   │
│                    (Code, PRs, Issues, Actions)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Kernprinzipien

| Prinzip | Beschreibung |
|---------|--------------|
| **Prototype-First** | Erst günstig testen (A), dann perfektionieren (C) |
| **Approval Gate** | Premium nur nach User-Bestätigung |
| **Spezialisierung** | Jeder Agent für seine Stärke |
| **Kosten-Kontrolle** | Transparente Kosten pro Build |

---

## 2. ALLE AGENTEN (17 PROFILE)

### 2.1 STANDARD AGENTEN (7)

| # | Agent | Rolle | Aufgaben | Kritische Fähigkeiten |
|---|-------|-------|----------|----------------------|
| 1 | **Supervisor** | Orchestrator | Koordiniert alle Agents, Routing, Fehlerüberwachung | Schnell, günstig, zuverlässig |
| 2 | **Architect** | Planer | Erstellt perfektes Runbook, System-Design, Edge-Cases | Reasoning, Architektur, Vollständigkeit |
| 3 | **Coach** | Task-Manager | Teilt Runbook in Sub-Tasks, detailliert Schritte | Planung, Kontext, Strukturierung |
| 4 | **Code** | Entwickler | Implementiert Features, schreibt Code | Coding-Qualität, Multi-Language, Syntax |
| 5 | **Review** | Qualitätssicherung | Findet Bugs, Security-Lücken, Best Practices | Code-Analyse, Security, Performance |
| 6 | **Test** | Tester | Schreibt Tests, prüft Coverage, Edge-Cases | Test-Patterns, Vollständigkeit |
| 7 | **Docs** | Dokumentar | README, API-Docs, Kommentare | Klare Sprache, Struktur |

### 2.2 REFACTOR AGENTEN (3)

| # | Agent | Modell-Tier | Aufgabe | Einsatz |
|---|-------|-------------|---------|---------|
| 8 | **Refactor Budget** | DeepSeek R1 | Einfaches Refactoring | Kleine Dateien, Umbenennung |
| 9 | **Refactor Standard** | Claude Sonnet | Mittleres Refactoring | Mehrere Dateien, Klassen extrahieren |
| 10 | **Refactor Premium** | Claude Opus | Komplexes Refactoring | Architektur ändern, Großprojekte |

### 2.3 MERGE AGENTEN (3)

| # | Agent | Modell-Tier | Aufgabe | Einsatz |
|---|-------|-------------|---------|---------|
| 11 | **Merge Budget** | DeepSeek R1 | 2 kleine Repos | Utils zusammenführen |
| 12 | **Merge Standard** | Claude Sonnet | 2-3 mittlere Repos | Services mergen |
| 13 | **Merge Premium** | Claude Opus | Viele/große Repos | Monorepo erstellen |

### 2.4 MULTI-REPO AGENTEN (2)

| # | Agent | Modell-Tier | Aufgabe | Einsatz |
|---|-------|-------------|---------|---------|
| 14 | **Multi-Repo Budget** | DeepSeek R1 | Gleiche Änderung in 2-3 Repos | Pattern Update |
| 15 | **Multi-Repo Premium** | Claude Opus | Komplexe Änderung in vielen Repos | Cross-Repo Refactor |

### 2.5 TOOL BUILDER AGENTEN (2)

| # | Agent | Modell-Tier | Aufgabe | Einsatz |
|---|-------|-------------|---------|---------|
| 16 | **Tool Builder Budget** | DeepSeek V3.2 + R1 | Einfaches Tool | Script, CLI |
| 17 | **Tool Builder Premium** | Claude Opus | Komplexes Tool | Framework, Library |

---

## 3. ALLE MODELLE

### 3.1 Modell-Übersicht

| Modell | Provider | Kosten/1M Tokens | Stärke | Kontext |
|--------|----------|------------------|--------|---------|
| **DeepSeek V3.2** | OpenRouter | $0.14 | Beste Coding-Benchmarks (~75% LiveCodeBench) | 128k |
| **DeepSeek R1** | OpenRouter | $0.55 | Top Reasoning (73% LiveCodeBench) | 128k |
| **Claude Haiku 4** | Anthropic | $0.25 | Schnell, effizient | 200k |
| **Claude Sonnet 4.5** | Anthropic | $3.00 | Ausgewogen, Developer-Favorit | 200k |
| **Claude Opus 4** | Anthropic | $15.00 | Beste Qualität, tiefste Analyse | 200k |

### 3.2 Modell pro Task

| Task | Bestes Modell | Warum | Backup |
|------|---------------|-------|--------|
| Routing | Claude Haiku | Schnell, günstig | DeepSeek V3.2 |
| Planung/Architektur | Claude Opus | 200k Kontext, Reasoning | DeepSeek R1 |
| Coding | DeepSeek V3.2 | Beste Benchmarks, günstig | Claude Sonnet |
| Review | Claude Opus | Tiefste Analyse | Claude Sonnet |
| Refactoring | Claude Opus | Versteht Zusammenhänge | DeepSeek R1 |
| Repo Merge | Claude Opus | Großer Kontext | DeepSeek R1 |
| Tests | DeepSeek V3.2 | Gute Patterns | DeepSeek R1 |
| Docs | Claude Haiku | Klare Sprache | DeepSeek V3.2 |

### 3.3 NICHT verwendete Modelle

| Modell | Grund |
|--------|-------|
| ❌ Qwen3 480B | Schwer verfügbar, 10x teurer, Overkill |
| ❌ GPT-4o | Teurer, nicht besser als DeepSeek |
| ❌ Codex | Veraltet (2021) |

---

## 4. ALLE VARIANTEN (6 PRESETS)

### 4.1 Übersicht

| Variante | Zweck | Kosten/Build | Qualität | Zielgruppe |
|----------|-------|--------------|----------|------------|
| **A: Budget** | Prototyp | ~$8 | 71/100 | Tests, Lernen |
| **B: Optimal** | Daily Driver | ~$25 | 79/100 | Tägliche Projekte |
| **C: Premium** | Perfekt | ~$130 | 90/100 | Produktions-Code |
| **D: Smart** | Plan+Review stark | ~$80 | 86/100 | Komplexe Projekte |
| **E: Refactor** | Code verbessern | ~$1-30 | variabel | Bestehender Code |
| **F: Merge** | Repos kombinieren | ~$1-45 | variabel | Multi-Repo |

### 4.2 VARIANTE A: BUDGET

| Agent | Modell | Kosten/1M |
|-------|--------|-----------|
| Supervisor | DeepSeek V3.2 | $0.14 |
| Architect | DeepSeek R1 | $0.55 |
| Coach | DeepSeek V3.2 | $0.14 |
| Code | DeepSeek V3.2 | $0.14 |
| Review | DeepSeek V3.2 | $0.14 |
| Test | DeepSeek V3.2 | $0.14 |
| Docs | DeepSeek V3.2 | $0.14 |

**Qualität:** 71/100 | **Fehlerrate:** 12% | **Nacharbeit:** 25%

### 4.3 VARIANTE B: OPTIMAL ⭐

| Agent | Modell | Kosten/1M |
|-------|--------|-----------|
| Supervisor | Claude Haiku | $0.25 |
| Architect | DeepSeek R1 | $0.55 |
| Coach | DeepSeek R1 | $0.55 |
| Code | DeepSeek V3.2 | $0.14 |
| Review | Claude Sonnet 4.5 | $3.00 |
| Test | DeepSeek V3.2 | $0.14 |
| Docs | Claude Haiku | $0.25 |

**Qualität:** 79/100 | **Fehlerrate:** 8% | **Nacharbeit:** 12%

### 4.4 VARIANTE C: PREMIUM

| Agent | Modell | Kosten/1M |
|-------|--------|-----------|
| Supervisor | Claude Sonnet 4.5 | $3.00 |
| Architect | Claude Opus 4 | $15.00 |
| Coach | DeepSeek R1 | $0.55 |
| Code | Claude Sonnet 4.5 | $3.00 |
| Review | Claude Opus 4 | $15.00 |
| Test | DeepSeek R1 | $0.55 |
| Docs | Claude Sonnet 4.5 | $3.00 |

**Qualität:** 90/100 | **Fehlerrate:** 2% | **Nacharbeit:** 3%

### 4.5 VARIANTE D: SMART

| Agent | Modell | Kosten/1M |
|-------|--------|-----------|
| Supervisor | Claude Haiku | $0.25 |
| Architect | Claude Opus 4 | $15.00 |
| Coach | DeepSeek R1 | $0.55 |
| Code | DeepSeek V3.2 | $0.14 |
| Review | Claude Opus 4 | $15.00 |
| Test | DeepSeek V3.2 | $0.14 |
| Docs | Claude Haiku | $0.25 |

**Qualität:** 86/100 | **Fehlerrate:** 3% | **Nacharbeit:** 5%

**Konzept:** Teuer am Anfang (Architect) + Günstig in der Mitte (Code) + Teuer am Ende (Review)

### 4.6 VARIANTE E: REFACTOR

| Sub-Variante | Agenten | Kosten |
|--------------|---------|--------|
| E1: Budget | Refactor Budget + Review Budget | ~$1 |
| E2: Standard | Refactor Standard + Review Standard | ~$6 |
| E3: Premium | Refactor Premium + Review Premium | ~$30 |

### 4.7 VARIANTE F: MERGE

| Sub-Variante | Agenten | Kosten |
|--------------|---------|--------|
| F1: Budget | Merge Budget + Review Budget | ~$1 |
| F2: Standard | Merge Standard + Review Standard | ~$6 |
| F3: Premium | Merge Premium + Multi-Repo Premium + Review Premium | ~$45 |

---

## 5. QUALITÄTS-BEWERTUNGEN (0-100)

### 5.1 Qualität pro Agent

| Agent | A: Budget | B: Optimal | C: Premium | D: Smart |
|-------|-----------|------------|------------|----------|
| Supervisor | 70 | 80 | 90 | 80 |
| Architect | 75 | 75 | 95 | **95** |
| Coach | 65 | 85 | 85 | 85 |
| Code | 82 | 82 | 92 | 82 |
| Review | 60 | 78 | 95 | **95** |
| Test | 75 | 75 | 88 | 75 |
| Docs | 68 | 76 | 88 | 76 |

### 5.2 Qualität pro Kategorie

| Kategorie | A: Budget | B: Optimal | C: Premium | D: Smart |
|-----------|-----------|------------|------------|----------|
| **Planung & Architektur** | 38 | 63 | 78 | **94** |
| **Code-Qualität** | 71 | 77 | **91** | 77 |
| **Review & QA** | 53 | 72 | 93 | **93** |
| **Endprodukt** | 58 | 76 | **91** | 84 |

### 5.3 Gesamt-Scores

| Metrik | A | B | C | D |
|--------|---|---|---|---|
| **Ø Qualität** | 71 | 79 | **90** | 86 |
| **Fehlerrate** | 12% | 8% | **2%** | 3% |
| **Nacharbeit** | 25% | 12% | **3%** | 5% |
| **Kosten/Monat** | **$8** | $25 | $130 | $80 |
| **Preis/Leistung** | ⭐⭐ | **⭐⭐⭐⭐⭐** | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 6. DEFAULT WORKFLOW

### 6.1 Zwei-Phasen-System

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: PROTOTYP (Option A) - AUTOMATISCH                             │
│                                                                         │
│  Team wird Repo zugewiesen                                              │
│      ↓                                                                  │
│  Alle Agents laufen (Architect→Coach→Code→Review→Test→Docs)             │
│      ↓                                                                  │
│  Status: AWAITING_APPROVAL                                              │
│      ↓                                                                  │
│  🔒 STOP - Warte auf Bestätigung                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER PRÜFT PROTOTYP                                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ [👍 JA - Bestätigen]     → Phase 2 startet                      │    │
│  │ [👎 NEIN - Ablehnen]     → Neue Anforderung + neuer Prototyp    │    │
│  │ [✏️ TEILWEISE]           → Anpassen + nochmal Phase 1           │    │
│  │ [⏭️ SKIP PREMIUM]        → Prototyp reicht aus                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PREMIUM (Option C) - NACH FREIGABE                            │
│                                                                         │
│  Alle Agents laufen (Architect→Coach→Code→Review→Test→Docs)             │
│      ↓                                                                  │
│  Status: COMPLETED                                                      │
│      ↓                                                                  │
│  ✅ PERFEKTE VERSION FERTIG                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Kosten-Vergleich

| Szenario | Direkt C | Workflow A→C | Ersparnis |
|----------|----------|--------------|-----------|
| 1. Versuch richtig | $130 | $138 | -$8 |
| 2. Versuch richtig | $260 | $146 | +$114 |
| 3. Versuch richtig | $390 | $154 | +$236 |
| 5. Versuch richtig | $650 | $170 | **+$480 (74%)** |

**Fazit:** Je unsicherer die Anforderung, desto mehr spart der Workflow.

---

## 7. WORKFLOW STATE MACHINE

### 7.1 Status-Übergänge

```
                    ┌─────────────────┐
                    │   TEAM_CREATED  │
                    └────────┬────────┘
                             │ auto
                             ▼
                    ┌─────────────────┐
              ┌────►│PROTOTYPE_RUNNING│
              │     └────────┬────────┘
              │              │ complete
              │              ▼
              │     ┌─────────────────┐
              │     │AWAITING_APPROVAL│◄──────────────┐
              │     └────────┬────────┘               │
              │              │                        │
              │     ┌────────┼────────┐               │
              │     │        │        │               │
              │     ▼        ▼        ▼               │
              │ ┌──────┐ ┌──────┐ ┌──────┐            │
              │ │REJECT│ │APPROVE│ │PARTIAL│           │
              │ └──┬───┘ └──┬───┘ └──┬───┘            │
              │    │        │        │                │
              │    │        ▼        │                │
              │    │  ┌──────────┐   │                │
              │    │  │PREMIUM_  │   │                │
              │    │  │RUNNING   │   │                │
              │    │  └────┬─────┘   │                │
              │    │       │         │                │
              │    │       ▼         │                │
              │    │  ┌──────────┐   │                │
              │    │  │COMPLETED │   │                │
              │    │  └──────────┘   │                │
              │    │                 │                │
              │    └─────────────────┴────────────────┘
              │              │
              │              │ new_requirements
              └──────────────┘
```

### 7.2 Status-Tabelle

| Status | Bedeutung | Nächste Aktion | Trigger |
|--------|-----------|----------------|---------|
| `TEAM_CREATED` | Team erstellt | Prototype startet | auto |
| `PROTOTYPE_RUNNING` | Option A läuft | Warten | - |
| `AWAITING_APPROVAL` | Prototyp fertig | User muss entscheiden | auto |
| `APPROVED` | Bestätigt | Premium startet | POST /approve |
| `REJECTED` | Abgelehnt | Neu beschreiben | POST /reject |
| `PARTIAL` | Teilweise | Anpassen | POST /partial |
| `PREMIUM_RUNNING` | Option C läuft | Warten | auto |
| `COMPLETED` | Alles fertig | Ergebnis nutzen | auto |
| `SKIPPED` | Premium übersprungen | Prototyp nutzen | POST /skip |

---

## 8. API ENDPOINTS

### 8.1 Team Management

| Endpoint | Methode | Beschreibung | Request | Response |
|----------|---------|--------------|---------|----------|
| `/api/teams` | GET | Alle Teams | - | `Team[]` |
| `/api/teams` | POST | Team erstellen | `CreateTeamRequest` | `Team` |
| `/api/teams/:id` | GET | Team Details | - | `Team` |
| `/api/teams/:id` | PUT | Team aktualisieren | `UpdateTeamRequest` | `Team` |
| `/api/teams/:id` | DELETE | Team löschen | - | `204` |

### 8.2 Workflow Control

| Endpoint | Methode | Beschreibung | Request | Response |
|----------|---------|--------------|---------|----------|
| `/api/teams/:id/status` | GET | Workflow-Status | - | `WorkflowStatus` |
| `/api/teams/:id/approve` | POST | Prototyp bestätigen | `ApproveRequest` | `WorkflowStatus` |
| `/api/teams/:id/reject` | POST | Prototyp ablehnen | `RejectRequest` | `WorkflowStatus` |
| `/api/teams/:id/partial` | POST | Teilweise bestätigen | `PartialRequest` | `WorkflowStatus` |
| `/api/teams/:id/skip-premium` | POST | Premium überspringen | - | `WorkflowStatus` |

### 8.3 Team Configuration

| Endpoint | Methode | Beschreibung | Request | Response |
|----------|---------|--------------|---------|----------|
| `/api/teams/:id/preset` | GET | Aktuelles Preset | - | `PresetConfig` |
| `/api/teams/:id/preset` | PUT | Preset ändern | `PresetRequest` | `PresetConfig` |
| `/api/teams/:id/agents` | GET | Agent-Konfiguration | - | `AgentConfig[]` |
| `/api/teams/:id/agents/:agent` | PUT | Agent ändern | `AgentRequest` | `AgentConfig` |

### 8.4 Build Management

| Endpoint | Methode | Beschreibung | Request | Response |
|----------|---------|--------------|---------|----------|
| `/api/teams/:id/builds` | GET | Alle Builds | - | `Build[]` |
| `/api/teams/:id/builds/:buildId` | GET | Build Details | - | `Build` |
| `/api/teams/:id/builds/:buildId/logs` | GET | Build Logs | - | `Log[]` |
| `/api/teams/:id/builds/:buildId/cost` | GET | Build Kosten | - | `CostBreakdown` |

### 8.5 Request/Response Schemas

```typescript
// CreateTeamRequest
{
  name: string;
  repo: string;                    // "github.com/user/project"
  preset: "A" | "B" | "C" | "D";   // Default: "A"
  task: string;                    // Beschreibung der Aufgabe
}

// WorkflowStatus
{
  team_id: string;
  phase: "PROTOTYPE_RUNNING" | "AWAITING_APPROVAL" | "PREMIUM_RUNNING" | "COMPLETED";
  prototype: {
    status: "running" | "completed" | "failed";
    started_at: string;
    completed_at: string | null;
    cost: number;
  };
  premium: {
    status: "pending" | "running" | "completed" | "skipped";
    started_at: string | null;
    completed_at: string | null;
    cost: number | null;
  };
}

// ApproveRequest
{
  comment?: string;
  modifications?: string[];        // Optionale Anpassungen für Premium
}

// RejectRequest
{
  reason: string;
  new_requirements: string;        // Neue Anforderung für nächsten Prototyp
}

// CostBreakdown
{
  build_id: string;
  total: number;
  agents: {
    agent: string;
    model: string;
    tokens_input: number;
    tokens_output: number;
    cost: number;
  }[];
}
```

---

## 9. DATENBANK SCHEMA

### 9.1 Redis Struktur

```javascript
// Team
{
  key: "team:{team_id}",
  value: {
    id: "team_123",
    name: "My Project Team",
    repo: "github.com/user/project",
    created_at: "2026-01-25T10:00:00Z",
    updated_at: "2026-01-25T10:05:00Z",
    
    // Preset Configuration
    preset: "A",  // A, B, C, D, E, F
    custom_agents: {
      // Nur wenn preset = "custom"
      supervisor: "claude-haiku",
      architect: "claude-opus",
      // ...
    },
    
    // Workflow State
    workflow: {
      phase: "AWAITING_APPROVAL",
      
      prototype: {
        preset: "A",
        started_at: "2026-01-25T10:00:00Z",
        completed_at: "2026-01-25T10:05:00Z",
        status: "completed",
        build_id: "build_456",
        cost: 8.50
      },
      
      premium: {
        preset: "C",
        started_at: null,
        completed_at: null,
        status: "pending",
        build_id: null,
        cost: null
      }
    },
    
    // Approval State
    approval: {
      required: true,
      status: "pending",  // pending, approved, rejected, partial
      approved_by: null,
      approved_at: null,
      comment: null,
      modifications: []
    }
  }
}

// Build
{
  key: "build:{build_id}",
  value: {
    id: "build_456",
    team_id: "team_123",
    preset: "A",
    phase: "prototype",
    
    status: "completed",
    started_at: "2026-01-25T10:00:00Z",
    completed_at: "2026-01-25T10:05:00Z",
    
    // Agent Runs
    agents: [
      {
        agent: "architect",
        model: "deepseek-r1",
        status: "completed",
        started_at: "...",
        completed_at: "...",
        tokens_input: 5000,
        tokens_output: 2000,
        cost: 0.0039
      },
      // ... weitere Agents
    ],
    
    // Kosten
    cost: {
      total: 8.50,
      breakdown: {
        architect: 0.55,
        coach: 0.14,
        code: 2.80,
        review: 3.50,
        test: 0.84,
        docs: 0.67
      }
    },
    
    // Output
    output: {
      files_created: 15,
      files_modified: 3,
      tests_passed: 42,
      tests_failed: 0,
      pr_url: "https://github.com/user/project/pull/1"
    }
  }
}

// Indexes
{
  key: "teams:by_repo:{repo_encoded}",
  value: ["team_123", "team_456"]
}

{
  key: "builds:by_team:{team_id}",
  value: ["build_456", "build_789"]
}
```

### 9.2 PostgreSQL Alternative

```sql
-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  preset VARCHAR(10) DEFAULT 'A',
  custom_agents JSONB,
  workflow_phase VARCHAR(50) DEFAULT 'TEAM_CREATED',
  approval_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Builds
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  preset VARCHAR(10) NOT NULL,
  phase VARCHAR(50) NOT NULL,  -- prototype, premium
  status VARCHAR(50) DEFAULT 'running',
  cost_total DECIMAL(10,4),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Agent Runs
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES builds(id),
  agent VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost DECIMAL(10,6),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_teams_repo ON teams(repo);
CREATE INDEX idx_builds_team ON builds(team_id);
CREATE INDEX idx_agent_runs_build ON agent_runs(build_id);
```

---

## 10. UI KOMPONENTEN

### 10.1 Team Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🤖 TEAM DASHBOARD                                           [+ Neues] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📦 my-scraper-project                                          │   │
│  │  Status: ⏳ AWAITING_APPROVAL                                   │   │
│  │  Preset: A (Budget)                                              │   │
│  │  Kosten: $8.50                                                   │   │
│  │                                                                  │   │
│  │  [👍 Bestätigen] [👎 Ablehnen] [⚙️ Einstellungen]               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📦 api-gateway                                                  │   │
│  │  Status: ✅ COMPLETED                                            │   │
│  │  Preset: C (Premium)                                             │   │
│  │  Kosten: $142.30                                                 │   │
│  │                                                                  │   │
│  │  [📊 Details] [🔄 Rebuild] [⚙️ Einstellungen]                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Team Einstellungen

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚙️ TEAM KONFIGURATION: my-scraper-project                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PRESET AUSWÄHLEN:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● A: Budget    - $8/Build   - Für Prototypen                    │   │
│  │ ○ B: Optimal   - $25/Build  - Empfohlen für Daily Driver        │   │
│  │ ○ C: Premium   - $130/Build - Maximale Qualität                 │   │
│  │ ○ D: Smart     - $80/Build  - Beste Planung + Review            │   │
│  │ ○ Custom       - Eigene Auswahl                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ODER EINZELN KONFIGURIEREN:                                            │
│                                                                         │
│  Supervisor:  [DeepSeek V3.2  ▼]  $0.14/1M                             │
│  Architect:   [DeepSeek R1    ▼]  $0.55/1M                             │
│  Coach:       [DeepSeek V3.2  ▼]  $0.14/1M                             │
│  Code:        [DeepSeek V3.2  ▼]  $0.14/1M                             │
│  Review:      [DeepSeek V3.2  ▼]  $0.14/1M                             │
│  Test:        [DeepSeek V3.2  ▼]  $0.14/1M                             │
│  Docs:        [DeepSeek V3.2  ▼]  $0.14/1M                             │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Geschätzte Kosten pro Build: $8.50                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [💾 Speichern]  [🔄 Reset auf Preset]  [❌ Abbrechen]                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Approval Dialog

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ PROTOTYP PRÜFEN: my-scraper-project                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PROTOTYP ERGEBNIS:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✅ 15 Dateien erstellt                                           │   │
│  │ ✅ 42 Tests bestanden                                            │   │
│  │ ✅ Review Score: 78/100                                          │   │
│  │ ⚠️ 2 Warnings                                                    │   │
│  │                                                                  │   │
│  │ [📂 Code ansehen] [📊 Details] [🔗 PR öffnen]                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  GEHT DAS IN DIE RICHTIGE RICHTUNG?                                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Kommentar (optional):                                            │   │
│  │ ┌───────────────────────────────────────────────────────────┐   │   │
│  │ │ Sieht gut aus, aber bitte auch Preise scrapen             │   │   │
│  │ └───────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [👍 JA - Premium starten ($130)]                                       │
│  [👎 NEIN - Neu bauen mit anderen Anforderungen]                       │
│  [✏️ TEILWEISE - Anpassen und nochmal Prototyp]                        │
│  [⏭️ SKIP - Prototyp reicht aus]                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.4 Build Progress

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🚀 BUILD LÄUFT: my-scraper-project (Prototyp)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FORTSCHRITT:                                                           │
│                                                                         │
│  [████████████████████████░░░░░░░░░░░░░░░░] 62%                        │
│                                                                         │
│  AGENTS:                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Supervisor   - Routing fertig          - $0.02               │   │
│  │ ✅ Architect    - Runbook erstellt        - $0.55               │   │
│  │ ✅ Coach        - Tasks aufgeteilt        - $0.14               │   │
│  │ 🔄 Code         - Implementiert...        - $1.20 (läuft)       │   │
│  │ ⏳ Review       - Wartet                  - -                   │   │
│  │ ⏳ Test         - Wartet                  - -                   │   │
│  │ ⏳ Docs         - Wartet                  - -                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  LIVE LOG:                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [10:05:23] Code: Creating src/scraper.ts                        │   │
│  │ [10:05:24] Code: Adding cheerio parser                          │   │
│  │ [10:05:25] Code: Implementing fetchPage function                │   │
│  │ [10:05:26] Code: Adding error handling                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Kosten bisher: $1.91                                                   │
│                                                                         │
│  [⏹️ Abbrechen]                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. TEAM-EINSTELLUNGEN

### 11.1 Preset Konfiguration

```yaml
# config/presets.yml

presets:
  A:
    name: "Budget"
    description: "Für Prototypen und Tests"
    cost_estimate: 8
    agents:
      supervisor: deepseek-v3.2
      architect: deepseek-r1
      coach: deepseek-v3.2
      code: deepseek-v3.2
      review: deepseek-v3.2
      test: deepseek-v3.2
      docs: deepseek-v3.2
  
  B:
    name: "Optimal"
    description: "Empfohlen für tägliche Projekte"
    cost_estimate: 25
    agents:
      supervisor: claude-haiku-4
      architect: deepseek-r1
      coach: deepseek-r1
      code: deepseek-v3.2
      review: claude-sonnet-4.5
      test: deepseek-v3.2
      docs: claude-haiku-4
  
  C:
    name: "Premium"
    description: "Maximale Qualität"
    cost_estimate: 130
    agents:
      supervisor: claude-sonnet-4.5
      architect: claude-opus-4
      coach: deepseek-r1
      code: claude-sonnet-4.5
      review: claude-opus-4
      test: deepseek-r1
      docs: claude-sonnet-4.5
  
  D:
    name: "Smart"
    description: "Beste Planung + Review"
    cost_estimate: 80
    agents:
      supervisor: claude-haiku-4
      architect: claude-opus-4
      coach: deepseek-r1
      code: deepseek-v3.2
      review: claude-opus-4
      test: deepseek-v3.2
      docs: claude-haiku-4
```

### 11.2 Modell Konfiguration

```yaml
# config/models.yml

models:
  deepseek-v3.2:
    provider: openrouter
    model_id: deepseek/deepseek-v3-2
    cost_per_1m_input: 0.14
    cost_per_1m_output: 0.28
    context_window: 128000
    capabilities:
      - coding
      - general
  
  deepseek-r1:
    provider: openrouter
    model_id: deepseek/deepseek-r1
    cost_per_1m_input: 0.55
    cost_per_1m_output: 2.19
    context_window: 128000
    capabilities:
      - reasoning
      - planning
      - coding
  
  claude-haiku-4:
    provider: anthropic
    model_id: claude-haiku-4-20250514
    cost_per_1m_input: 0.25
    cost_per_1m_output: 1.25
    context_window: 200000
    capabilities:
      - fast
      - general
  
  claude-sonnet-4.5:
    provider: anthropic
    model_id: claude-sonnet-4-5-20250929
    cost_per_1m_input: 3.00
    cost_per_1m_output: 15.00
    context_window: 200000
    capabilities:
      - coding
      - analysis
      - general
  
  claude-opus-4:
    provider: anthropic
    model_id: claude-opus-4-20251101
    cost_per_1m_input: 15.00
    cost_per_1m_output: 75.00
    context_window: 200000
    capabilities:
      - reasoning
      - architecture
      - review
      - complex
```

---

## 12. KOSTEN-KALKULATION

### 12.1 Kosten pro Variante (50 Builds/Monat)

| Variante | Kosten/Build | Monatlich | Jährlich |
|----------|--------------|-----------|----------|
| A: Budget | $8 | $400 | $4,800 |
| B: Optimal | $25 | $1,250 | $15,000 |
| C: Premium | $130 | $6,500 | $78,000 |
| D: Smart | $80 | $4,000 | $48,000 |

### 12.2 Hybrid Workflow Kosten

| Szenario | Workflow | Kosten/Build |
|----------|----------|--------------|
| Erste Idee testen | A only | $8 |
| Prototyp gut → Perfektionieren | A → C | $138 |
| 3 Versuche bis richtig | A + A + A → C | $154 |
| Täglich, sicher | B only | $25 |
| Kritisch, keine Fehler | C only | $130 |

### 12.3 Kosten-Tracking

```typescript
interface CostTracker {
  // Pro Build
  getBuildCost(buildId: string): CostBreakdown;
  
  // Pro Team
  getTeamCostTotal(teamId: string): number;
  getTeamCostThisMonth(teamId: string): number;
  
  // Pro User
  getUserCostTotal(userId: string): number;
  getUserCostThisMonth(userId: string): number;
  
  // Alerts
  setMonthlyBudget(teamId: string, budget: number): void;
  onBudgetWarning(callback: (team: Team, used: number, budget: number) => void): void;
}
```

---

## 13. MASTER RUNBOOK (AKTUALISIERT)

### Step 0 — Projekt-Setup

- [ ] `PROJECT_STATE.md` ausfüllen
- [ ] Contracts definieren (`api_contract.md`, `data_contract.md`)
- [ ] `capabilities.yml` erstellen
- [ ] **NEU:** Team Preset wählen (A/B/C/D)

### Step 1 — Repo & Struktur

- [ ] GitHub Repo erstellen
- [ ] **NEU:** Team erstellen (`POST /api/teams`)
- [ ] **NEU:** Repo dem Team zuweisen
- [ ] Ordnerstruktur nach Template

### Step 2 — Backend Skeleton

- [ ] **NEU:** Build starten (automatisch mit Preset A)
- [ ] `GET /health` implementiert
- [ ] Logging aktiv
- [ ] **NEU:** Prototyp prüfen → Approval Gate

### Step 3-6 — Features

- [ ] **NEU:** Nach Approval: Premium Build (C) startet automatisch
- [ ] Alle Features implementiert
- [ ] Tests geschrieben
- [ ] Review bestanden

### Step 7 — Frontend (falls vorhanden)

- [ ] UI implementiert
- [ ] E2E Tests

### Step 7.5 — Contract Verification (PFLICHT)

- [ ] `docs/CONTRACT_VERIFICATION.md` durcharbeiten
- [ ] Frontend ↔ Backend passt
- [ ] Backend ↔ Database passt

### Step 8 — QA & Regression

- [ ] Alle Tests grün
- [ ] Scorecard durchlaufen
- [ ] **NEU:** Final Review mit Premium Preset

### Step 9 — Production Checklist

- [ ] `PRODUCTION_CHECKLIST.md` komplett abgehakt
- [ ] **NEU:** Kosten-Report exportieren

### Step 10 — Deployment

- [ ] Deploy ausgeführt
- [ ] Smoke Test grün
- [ ] **NEU:** Team Status auf COMPLETED

---

## 14. CAPABILITIES (AKTUALISIERT)

```yaml
# capabilities.yml - AKTUALISIERT

schema_version: "2.0"

# NEUE SEKTION: Multi-Agent System
multi_agent:
  
  # Team Management
  - name: team_management
    description: "Create, configure, and manage agent teams"
    mode: HTTP
    criticality: HIGH
    endpoints:
      - "GET /api/teams"
      - "POST /api/teams"
      - "GET /api/teams/:id"
      - "PUT /api/teams/:id"
      - "DELETE /api/teams/:id"
    tests:
      - unit:team_create_validation
      - http:team_create_201
      - http:team_list_200
      - integration:team_crud_flow
  
  # Workflow Control
  - name: workflow_control
    description: "Control build workflow with approval gates"
    mode: HTTP
    criticality: CRITICAL
    endpoints:
      - "GET /api/teams/:id/status"
      - "POST /api/teams/:id/approve"
      - "POST /api/teams/:id/reject"
      - "POST /api/teams/:id/skip-premium"
    tests:
      - unit:workflow_state_machine
      - http:approve_triggers_premium
      - http:reject_restarts_prototype
      - integration:full_workflow_flow
  
  # Preset Configuration
  - name: preset_configuration
    description: "Configure team presets and agent models"
    mode: HTTP
    criticality: HIGH
    endpoints:
      - "GET /api/teams/:id/preset"
      - "PUT /api/teams/:id/preset"
      - "GET /api/teams/:id/agents"
      - "PUT /api/teams/:id/agents/:agent"
    tests:
      - unit:preset_validation
      - http:preset_change_200
      - integration:custom_agent_config
  
  # Build Management
  - name: build_management
    description: "Track and manage builds"
    mode: HTTP
    criticality: HIGH
    endpoints:
      - "GET /api/teams/:id/builds"
      - "GET /api/teams/:id/builds/:buildId"
      - "GET /api/teams/:id/builds/:buildId/logs"
      - "GET /api/teams/:id/builds/:buildId/cost"
    tests:
      - http:build_list_200
      - http:build_logs_stream
      - unit:cost_calculation
  
  # Agent Orchestration
  - name: agent_orchestration
    description: "Orchestrate agent execution"
    mode: INTERNAL
    criticality: CRITICAL
    tests:
      - unit:agent_sequence
      - unit:agent_error_handling
      - unit:agent_fallback
      - integration:full_agent_flow

# Bestehende Capabilities bleiben...
```

---

## 15. IMPLEMENTIERUNGS-TASKS

### 15.1 Priorität: KRITISCH

| # | Task | Status | Komplexität |
|---|------|--------|-------------|
| 1 | Team CRUD API Endpoints | ❌ TODO | Mittel |
| 2 | Workflow State Machine | ❌ TODO | Hoch |
| 3 | Approval/Reject Endpoints | ❌ TODO | Mittel |
| 4 | Redis Schema implementieren | ❌ TODO | Mittel |
| 5 | Preset Konfiguration laden | ❌ TODO | Niedrig |

### 15.2 Priorität: HOCH

| # | Task | Status | Komplexität |
|---|------|--------|-------------|
| 6 | Agent Orchestrator | ❌ TODO | Hoch |
| 7 | Build Tracking | ❌ TODO | Mittel |
| 8 | Kosten-Tracking | ❌ TODO | Mittel |
| 9 | Team Dashboard UI | ❌ TODO | Hoch |
| 10 | Team Settings UI | ❌ TODO | Mittel |

### 15.3 Priorität: MITTEL

| # | Task | Status | Komplexität |
|---|------|--------|-------------|
| 11 | Approval Dialog UI | ❌ TODO | Mittel |
| 12 | Build Progress UI | ❌ TODO | Mittel |
| 13 | Log Streaming | ❌ TODO | Mittel |
| 14 | Notification System | ❌ TODO | Mittel |
| 15 | Refactor Agents | ❌ TODO | Niedrig |

### 15.4 Priorität: NIEDRIG

| # | Task | Status | Komplexität |
|---|------|--------|-------------|
| 16 | Merge Agents | ❌ TODO | Niedrig |
| 17 | Multi-Repo Agents | ❌ TODO | Mittel |
| 18 | Tool Builder Agents | ❌ TODO | Niedrig |
| 19 | Budget Alerts | ❌ TODO | Niedrig |
| 20 | Export/Reports | ❌ TODO | Niedrig |

### 15.5 Queue Commands

```bash
# Kritisch
./queue-task.sh "Implement Team CRUD API endpoints (GET/POST/PUT/DELETE /api/teams)"
./queue-task.sh "Implement Workflow State Machine with Redis"
./queue-task.sh "Implement Approval/Reject/Skip endpoints"
./queue-task.sh "Create Redis schema for teams, builds, agent_runs"
./queue-task.sh "Load preset configuration from YAML files"

# Hoch
./queue-task.sh "Implement Agent Orchestrator for sequential execution"
./queue-task.sh "Implement Build tracking with agent runs"
./queue-task.sh "Implement Cost tracking per agent and build"
./queue-task.sh "Create Team Dashboard UI component"
./queue-task.sh "Create Team Settings UI with preset selection"

# Mittel
./queue-task.sh "Create Approval Dialog UI component"
./queue-task.sh "Create Build Progress UI with live updates"
./queue-task.sh "Implement Log Streaming via WebSocket"
./queue-task.sh "Implement Notification System for approval required"
./queue-task.sh "Add Refactor Agent (Budget/Standard/Premium)"

# Niedrig
./queue-task.sh "Add Merge Agent (Budget/Standard/Premium)"
./queue-task.sh "Add Multi-Repo Agent (Budget/Premium)"
./queue-task.sh "Add Tool Builder Agent (Budget/Premium)"
./queue-task.sh "Add Budget Alerts when threshold reached"
./queue-task.sh "Add Cost Export and Reports"
```

---

## APPENDIX A: API CONTRACT UPDATE

```markdown
# api_contract.md - NEUE ENDPOINTS

## Team Endpoints

### POST /api/teams
**Auth:** Required
**Request:**
```json
{
  "name": "string",
  "repo": "string",
  "preset": "A" | "B" | "C" | "D",
  "task": "string"
}
```
**Response 201:**
```json
{
  "id": "team_123",
  "name": "My Project",
  "repo": "github.com/user/project",
  "preset": "A",
  "workflow": {
    "phase": "PROTOTYPE_RUNNING"
  }
}
```

### POST /api/teams/:id/approve
**Auth:** Required
**Request:**
```json
{
  "comment": "string (optional)",
  "modifications": ["string"] (optional)
}
```
**Response 200:**
```json
{
  "team_id": "team_123",
  "phase": "PREMIUM_RUNNING",
  "premium": {
    "status": "running",
    "preset": "C"
  }
}
```

### POST /api/teams/:id/reject
**Auth:** Required
**Request:**
```json
{
  "reason": "string",
  "new_requirements": "string"
}
```
**Response 200:**
```json
{
  "team_id": "team_123",
  "phase": "PROTOTYPE_RUNNING",
  "prototype": {
    "status": "running",
    "iteration": 2
  }
}
```
```

---

## APPENDIX B: GLOSSAR

| Begriff | Bedeutung |
|---------|-----------|
| **Agent** | KI-Komponente mit spezifischer Aufgabe |
| **Preset** | Vorkonfigurierte Modell-Kombination (A/B/C/D) |
| **Build** | Ein vollständiger Durchlauf aller Agents |
| **Prototype** | Erster Build mit Budget-Preset |
| **Premium** | Finaler Build mit Premium-Preset |
| **Approval Gate** | Manueller Bestätigungsschritt |
| **Workflow** | Gesamter Prozess von Team-Erstellung bis Completion |

---

## APPENDIX C: CHECKLISTE

```
SYSTEM READY CHECKLIST:

INFRASTRUKTUR:
[ ] Redis läuft
[ ] PostgreSQL läuft (optional)
[ ] API Server läuft
[ ] GitHub Actions aktiv

KONFIGURATION:
[ ] presets.yml konfiguriert
[ ] models.yml konfiguriert
[ ] API Keys hinterlegt (Anthropic, OpenRouter)
[ ] GitHub Token hinterlegt

ENDPOINTS:
[ ] /api/teams CRUD
[ ] /api/teams/:id/status
[ ] /api/teams/:id/approve
[ ] /api/teams/:id/reject
[ ] /api/teams/:id/skip-premium
[ ] /api/teams/:id/preset
[ ] /api/teams/:id/builds

UI:
[ ] Team Dashboard
[ ] Team Settings
[ ] Approval Dialog
[ ] Build Progress

AGENTS:
[ ] Supervisor Agent
[ ] Architect Agent
[ ] Coach Agent
[ ] Code Agent
[ ] Review Agent
[ ] Test Agent
[ ] Docs Agent

WORKFLOWS:
[ ] Standard (A/B/C/D)
[ ] Refactor (E)
[ ] Merge (F)
[ ] Prototype → Approval → Premium
```

---

**Ende der Dokumentation**

*Erstellt: 2026-01-25*  
*Version: 1.0.0*  
*Status: Abgestimmt & Freigegeben*
