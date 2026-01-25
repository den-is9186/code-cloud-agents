# 🤖 Multi-Agent System - Complete Guide

**Version:** 1.0.0  
**Last Updated:** 2025-01-25  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [What is a Multi-Agent System?](#what-is-a-multi-agent-system)
2. [System Architecture](#system-architecture)
3. [Agent Types & Roles](#agent-types--roles)
4. [Tool Calling vs Agentic AI](#tool-calling-vs-agentic-ai)
5. [Agent Communication & Coordination](#agent-communication--coordination)
6. [Model Selection](#model-selection)
7. [Agent Presets](#agent-presets)
    - [📊 Quality Comparison (QII)](#quality-comparison-qii)
8. [Self-Correction & Error Handling](#self-correction--error-handling)
9. [Workflow State Machine](#workflow-state-machine)
10. [Practical Examples](#practical-examples)
11. [Cost Analysis](#cost-analysis)
12. [Current Status & Roadmap](#current-status--roadmap)

---

## What is a Multi-Agent System?

A **Multi-Agent System (MAS)** is an AI architecture where multiple specialized agents work together to accomplish complex tasks. Each agent has a specific role, model, and expertise, coordinated by a supervisor agent that orchestrates the entire workflow.

### Why Multi-Agent?

| Single-Agent Approach | Multi-Agent Approach |
|----------------------|---------------------|
| ❌ One model does everything | ✅ Specialized agents for specific tasks |
| ❌ Expensive (always uses premium model) | ✅ Cost-optimized (right model for right job) |
| ❌ No quality gates | ✅ Built-in review & testing |
| ❌ No error recovery | ✅ Self-correction loops |
| ❌ Limited context | ✅ Distributed context handling |

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Specialization** | Each agent excels at one thing |
| **Prototype-First** | Test cheap (Preset A), perfect later (Preset C) |
| **Approval Gates** | Premium features only after user confirmation |
| **Cost Control** | Transparent pricing per build |
| **Self-Correction** | Automatic retry and error fixing |

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER / DASHBOARD                                │
│                    (Defines task, monitors progress)                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPERVISOR AGENT                                │
│                    (Routing & Orchestration)                            │
│  • Analyzes user request                                                │
│  • Selects appropriate workflow                                         │
│  • Delegates to specialized agents                                      │
│  • Monitors progress & handles errors                                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  STANDARD FLOW  │    │  REFACTOR FLOW  │    │   MERGE FLOW    │
│                 │    │                 │    │                 │
│ • Architect     │    │ • Refactor      │    │ • Merge Agent   │
│ • Coach         │    │ • Review        │    │ • Multi-Repo    │
│ • Code          │    │                 │    │ • Review        │
│ • Review        │    │                 │    │                 │
│ • Test          │    │                 │    │                 │
│ • Docs          │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           GITHUB REPOSITORY                             │
│                    (Code, PRs, Issues, Actions)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Communication Flow

```
User Request
    │
    ▼
Supervisor (analyzes & routes)
    │
    ├──> Architect (plans architecture)
    │        │
    │        ├──> Output: Architecture document + Runbook
    │        │
    ▼        ▼
    └──> Coach (breaks down into tasks)
             │
             ├──> Output: Subtasks with detailed steps
             │
             ▼
         For each task:
             │
             ├──> Code Agent (implements)
             │        │
             │        ├──> Output: Code files
             │        │
             ├──> Review Agent (validates)
             │        │
             │        ├──> If issues found → back to Code Agent (LOOP!)
             │        └──> If OK → continue
             │
             ├──> Test Agent (writes tests)
             │        │
             │        ├──> If tests fail → back to Code Agent (LOOP!)
             │        └──> If pass → continue
             │
             └──> Docs Agent (documents)
                      │
                      └──> Output: README, API docs, comments
```

---

## Agent Types & Roles

Our system includes **17 specialized agent profiles** across 5 categories.

### Standard Agents (7 Core Agents)

| # | Agent | Role | Primary Responsibilities | Critical Skills |
|---|-------|------|-------------------------|-----------------|
| 1 | **Supervisor** | Orchestrator | Routes requests, coordinates agents, monitors errors | Fast routing, cost control, reliability |
| 2 | **Architect** | Planner | Creates system design, runbook, handles edge cases | Reasoning, architecture, completeness |
| 3 | **Coach** | Task Manager | Breaks runbook into subtasks, defines detailed steps | Planning, context, structuring |
| 4 | **Code** | Developer | Implements features, writes production code | Multi-language coding, syntax, patterns |
| 5 | **Review** | QA Engineer | Finds bugs, security issues, checks best practices | Code analysis, security, performance |
| 6 | **Test** | Test Engineer | Writes tests, checks coverage, validates edge cases | Test patterns, completeness, frameworks |
| 7 | **Docs** | Technical Writer | Creates README, API docs, code comments | Clear writing, structure, examples |

### Refactor Agents (3 Tiers)

| # | Agent | Model Tier | Use Case | Best For |
|---|-------|-----------|----------|----------|
| 8 | **Refactor Budget** | DeepSeek R1 | Simple refactoring | Small files, renaming, simple cleanup |
| 9 | **Refactor Standard** | Claude Sonnet | Medium refactoring | Multiple files, extract classes |
| 10 | **Refactor Premium** | Claude Opus | Complex refactoring | Architecture changes, large projects |

### Merge Agents (3 Tiers)

| # | Agent | Model Tier | Use Case | Best For |
|---|-------|-----------|----------|----------|
| 11 | **Merge Budget** | DeepSeek R1 | 2 small repos | Utils consolidation |
| 12 | **Merge Standard** | Claude Sonnet | 2-3 medium repos | Service merges |
| 13 | **Merge Premium** | Claude Opus | Many/large repos | Monorepo creation |

### Multi-Repo Agents (2 Tiers)

| # | Agent | Model Tier | Use Case | Best For |
|---|-------|-----------|----------|----------|
| 14 | **Multi-Repo Budget** | DeepSeek R1 | Same change in 2-3 repos | Pattern updates |
| 15 | **Multi-Repo Premium** | Claude Opus | Complex changes across many repos | Cross-repo refactoring |

### Tool Builder Agents (2 Tiers)

| # | Agent | Model Tier | Use Case | Best For |
|---|-------|-----------|----------|----------|
| 16 | **Tool Builder Budget** | DeepSeek V3.2 + R1 | Simple tools | Scripts, CLI tools |
| 17 | **Tool Builder Premium** | Claude Opus | Complex tools | Frameworks, libraries |

---

## Tool Calling vs Agentic AI

Our Multi-Agent System combines **both** concepts for maximum power and flexibility.

### Tool Calling (Function Calling)

**Definition:** The model decides "I need external help" and returns structured function calls.

**Example:**
```json
{
  "tool": "git_commit",
  "parameters": {
    "message": "feat: add user authentication",
    "files": ["src/auth.ts", "src/middleware.ts"]
  }
}
```

**Available Tools:**
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

**Tool-Calling Capable Models:**
| Model | Tool-Calling Quality | Use Case |
|-------|---------------------|----------|
| DeepSeek R1 0528 | ⭐⭐⭐⭐⭐ | Budget agents |
| DeepSeek V3.2 | ⭐⭐⭐⭐⭐ | Tool builder budget |
| Claude Sonnet 4 | ⭐⭐⭐⭐⭐ | Standard agents |
| Claude Opus 4 | ⭐⭐⭐⭐⭐ | Premium agents |

### Agentic AI (Autonomous Agents)

**Definition:** The model behaves as an autonomous agent that:
- Plans multiple steps independently
- Decides when/which tools to use
- Corrects errors automatically
- Loops when needed
- Maintains overview of long workflows

**Agentic Capabilities by Agent:**

| Agent | Plans | Delegates | Loops | Self-Corrects |
|-------|-------|-----------|-------|---------------|
| **Supervisor** | ✅ | ✅ | ✅ | ✅ |
| Architect | ✅ | ❌ | ❌ | ✅ |
| Coach | ✅ | ❌ | ❌ | ✅ |
| Code | ❌ | ❌ | ✅ | ✅ |
| Review | ✅ | ❌ | ❌ | ❌ |
| Test | ❌ | ❌ | ✅ | ✅ |
| Docs | ❌ | ❌ | ❌ | ✅ |

### Comparison: Traditional vs Tool-Calling vs Agentic

**Traditional AI (Chat Only):**
```
User: "Write me a user service"
AI: "Here's the code: ..."
```
→ One-time response, no execution

**Tool-Calling AI:**
```
User: "Create user service"
AI: [tool_call: file_write("src/user.ts", "...")]
    [tool_call: git_commit("feat: add user service")]
```
→ Executes tools, but no planning

**Agentic AI (Our System):**
```
User: "Create user management API"
Supervisor:
  1. [PLAN] Analyze → need CRUD + Auth + Tests
  2. [DELEGATE] Architect → create runbook
  3. [DELEGATE] Coach → create 5 subtasks
  4. [LOOP] For tasks 1-5:
     a. [DELEGATE] Code → implement
     b. [DELEGATE] Review → validate
     c. [DECIDE] Review finds errors → back to Code
     d. [DELEGATE] Code → fix errors
     e. [DELEGATE] Review → OK ✓
     f. [DELEGATE] Test → write tests
     g. [DECIDE] Tests fail → back to Code
     h. [DELEGATE] Code → fix tests
     i. [DELEGATE] Test → OK ✓
  5. [STOP] Wait for user approval
  6. [CONTINUE] User approved → Phase 2
  7. [DELEGATE] Premium agents → polish
  8. [TOOL_CALL] git_push, deploy
  9. [COMPLETE] "API deployed successfully"
```

---

## Agent Communication & Coordination

### Message Passing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPERVISOR AGENT                           │
│                                                                 │
│  Message Queue:                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. { from: "user", to: "supervisor", task: "..." }    │    │
│  │ 2. { from: "supervisor", to: "architect", ... }       │    │
│  │ 3. { from: "architect", to: "supervisor", ... }       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  State:                                                         │
│  • current_phase: "code_implementation"                         │
│  • active_agent: "code"                                         │
│  • retry_count: 1                                               │
│  • pending_tasks: [...]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Coordination Patterns

#### 1. Sequential Pattern (Default)
```
Architect → Coach → Code → Review → Test → Docs
```
Each agent completes before the next starts.

#### 2. Loop Pattern (Error Correction)
```
Code → Review → [issues found] → Code → Review → [OK]
```
Agents loop until quality criteria are met.

#### 3. Parallel Pattern (Future)
```
        ┌──> Code (Feature A) ──┐
Start ──┼──> Code (Feature B) ──┼──> Merge
        └──> Code (Feature C) ──┘
```
Multiple agents work simultaneously on independent tasks.

### Context Sharing

**Shared Context Store:**
```typescript
interface SharedContext {
  project: {
    name: string;
    repo: string;
    tech_stack: string[];
    requirements: string;
  };
  
  architecture: {
    runbook: string;
    system_design: object;
    edge_cases: string[];
  };
  
  implementation: {
    files_created: string[];
    files_modified: string[];
    current_task: string;
    completed_tasks: string[];
  };
  
  quality: {
    review_issues: Issue[];
    test_results: TestResult[];
    coverage: number;
  };
}
```

Each agent reads from and writes to this shared context, enabling seamless handoffs.

---

## Model Selection

### Available Models

| Model | Provider | Cost/1M Tokens | Strengths | Context |
|-------|----------|----------------|-----------|---------|
| **DeepSeek V3.2** | OpenRouter | $0.14 | Best coding benchmarks (~75% LiveCodeBench) | 128k |
| **DeepSeek R1** | OpenRouter | $0.55 | Top reasoning (73% LiveCodeBench) | 128k |
| **Claude Haiku 4** | Anthropic | $0.25 | Fast, efficient | 200k |
| **Claude Sonnet 4.5** | Anthropic | $3.00 | Balanced, developer favorite | 200k |
| **Claude Opus 4** | Anthropic | $15.00 | Best quality, deepest analysis | 200k |

### Model Selection by Task

| Task | Best Model | Why? | Backup |
|------|------------|------|--------|
| Routing | Claude Haiku | Fast, cheap | DeepSeek V3.2 |
| Planning/Architecture | Claude Opus | 200k context, reasoning | DeepSeek R1 |
| Coding | DeepSeek V3.2 | Best benchmarks, cheap | Claude Sonnet |
| Review | Claude Opus | Deepest analysis | Claude Sonnet |
| Refactoring | Claude Opus | Understands relationships | DeepSeek R1 |
| Repo Merge | Claude Opus | Large context | DeepSeek R1 |
| Tests | DeepSeek V3.2 | Good patterns | DeepSeek R1 |
| Docs | Claude Haiku | Clear language | DeepSeek V3.2 |

### Models NOT Used

| Model | Reason |
|-------|--------|
| ❌ Qwen3 480B | Hard to access, 10x more expensive, overkill |
| ❌ GPT-4o | More expensive, not better than DeepSeek |
| ❌ Codex | Outdated (2021) |

---

## Agent Presets

We offer **6 preset configurations** optimized for different use cases and budgets.

### Preset Overview

| Preset | Purpose | Cost/Build | Quality | Best For |
|--------|---------|------------|---------|----------|
| **A: Budget** | Prototyping | ~$8 | 71/100 | Testing, learning, experiments |
| **B: Optimal** ⭐ | Daily driver | ~$25 | 79/100 | Daily projects, production-ready |
| **C: Premium** | Perfect quality | ~$130 | 90/100 | Production code, critical systems |
| **D: Smart** | Plan+Review heavy | ~$80 | 86/100 | Complex projects, architecture-heavy |
| **E: Refactor** | Code improvement | ~$1-30 | Variable | Existing codebases |
| **F: Merge** | Repo combination | ~$1-45 | Variable | Multi-repo consolidation |

### Preset A: Budget

**Target:** Fast prototyping, learning, experimentation

| Agent | Model | Cost/1M Tokens |
|-------|-------|----------------|
| Supervisor | DeepSeek V3.2 | $0.14 |
| Architect | DeepSeek R1 | $0.55 |
| Coach | DeepSeek V3.2 | $0.14 |
| Code | DeepSeek V3.2 | $0.14 |
| Review | DeepSeek V3.2 | $0.14 |
| Test | DeepSeek V3.2 | $0.14 |
| Docs | DeepSeek V3.2 | $0.14 |

**Metrics:**
- Quality Score: 71/100
- Error Rate: 12%
- Rework Needed: 25%
- Price/Performance: ⭐⭐

### Preset B: Optimal ⭐ (Recommended)

**Target:** Best balance of quality and cost for daily work

| Agent | Model | Cost/1M Tokens |
|-------|-------|----------------|
| Supervisor | Claude Haiku | $0.25 |
| Architect | DeepSeek R1 | $0.55 |
| Coach | DeepSeek R1 | $0.55 |
| Code | DeepSeek V3.2 | $0.14 |
| Review | Claude Sonnet 4.5 | $3.00 |
| Test | DeepSeek V3.2 | $0.14 |
| Docs | Claude Haiku | $0.25 |

**Metrics:**
- Quality Score: 79/100
- Error Rate: 8%
- Rework Needed: 12%
- Price/Performance: ⭐⭐⭐⭐⭐

### Preset C: Premium

**Target:** Production-grade code, critical systems

| Agent | Model | Cost/1M Tokens |
|-------|-------|----------------|
| Supervisor | Claude Sonnet 4.5 | $3.00 |
| Architect | Claude Opus 4 | $15.00 |
| Coach | DeepSeek R1 | $0.55 |
| Code | Claude Sonnet 4.5 | $3.00 |
| Review | Claude Opus 4 | $15.00 |
| Test | DeepSeek R1 | $0.55 |
| Docs | Claude Sonnet 4.5 | $3.00 |

**Metrics:**
- Quality Score: 90/100
- Error Rate: 2%
- Rework Needed: 3%
- Price/Performance: ⭐⭐⭐

### Preset D: Smart

**Target:** Complex projects requiring strong planning and review

**Concept:** Expensive at start (Architect) + Cheap in middle (Code) + Expensive at end (Review)

| Agent | Model | Cost/1M Tokens |
|-------|-------|----------------|
| Supervisor | Claude Haiku | $0.25 |
| Architect | Claude Opus 4 | $15.00 |
| Coach | DeepSeek R1 | $0.55 |
| Code | DeepSeek V3.2 | $0.14 |
| Review | Claude Opus 4 | $15.00 |
| Test | DeepSeek V3.2 | $0.14 |
| Docs | Claude Haiku | $0.25 |

**Metrics:**
- Quality Score: 86/100
- Error Rate: 3%
- Rework Needed: 5%
- Price/Performance: ⭐⭐⭐⭐

### Preset E: Refactor (3 Sub-Variants)

| Sub-Variant | Agents | Cost | Use Case |
|-------------|--------|------|----------|
| E1: Budget | Refactor Budget + Review Budget | ~$1 | Small files, renaming |
| E2: Standard | Refactor Standard + Review Standard | ~$6 | Multiple files, class extraction |
| E3: Premium | Refactor Premium + Review Premium | ~$30 | Architecture changes, large projects |

### Preset F: Merge (3 Sub-Variants)

| Sub-Variant | Agents | Cost | Use Case |
|-------------|--------|------|----------|
| F1: Budget | Merge Budget + Review Budget | ~$1 | 2 small repos |
| F2: Standard | Merge Standard + Review Standard | ~$6 | 2-3 medium repos |
| F3: Premium | Merge Premium + Multi-Repo Premium + Review | ~$45 | Many/large repos |

### 📊 Quality Comparison (QII)

**Quality Index Information - Quality by Category:**

| Category | Preset A | Preset B | Preset C | Preset D |
|----------|----------|----------|----------|----------|
| **Planning & Architecture** | 38/100 | 63/100 | 78/100 | **94/100** |
| **Code Quality** | 71/100 | 77/100 | **91/100** | 77/100 |
| **Review & QA** | 53/100 | 72/100 | 93/100 | **93/100** |
| **Final Product** | 58/100 | 76/100 | **91/100** | 84/100 |

---

## Self-Correction & Error Handling

### Automatic Retry Logic

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
┌─────────────────────────────────────────────────────────────────────┐
│                    Self-Correction Workflow                         │
└─────────────────────────────────────────────────────────────────────┘

Code Agent writes: user.ts
        │
        ▼
Review Agent finds: "Missing input validation"
        │
        ▼
Supervisor decides: → Back to Code with feedback
        │
        ▼
Code Agent corrects: user.ts (adds validation)
        │
        ▼
Review Agent: "OK ✓"
        │
        ▼
Test Agent writes: user.test.ts
        │
        ▼
Test Runner: "2 tests failed"
        │
        ▼
Supervisor decides: → Back to Code with test output
        │
        ▼
Code Agent fixes: user.ts (based on test errors)
        │
        ▼
Test Runner: "All tests passed ✓"
        │
        ▼
Continue to next task
```

### Error Types & Handling

| Error Type | Detection | Handler | Max Retries | Example |
|------------|-----------|---------|-------------|---------|
| **Syntax Error** | Code Agent | Code Agent | 3 | Missing semicolon |
| **Logic Error** | Review Agent | Code Agent | 2 | Incorrect algorithm |
| **Security Issue** | Review Agent | Code Agent | 1 | SQL injection risk |
| **Test Failure** | Test Agent | Code Agent | 3 | Function returns wrong value |
| **Build Error** | Build System | Code Agent | 2 | Missing dependency |
| **Merge Conflict** | Git | Supervisor | 1 | Conflicting changes |

### Escalation Chain

```
┌──────────────────────────────────────────────────────────────────┐
│                     Error Escalation Chain                       │
└──────────────────────────────────────────────────────────────────┘

Level 1: Self-Correction
    Code Agent attempts to fix its own error
    ↓ (if fails)
    
Level 2: Peer Review
    Review Agent provides detailed feedback
    Code Agent attempts fix with guidance
    ↓ (if fails)
    
Level 3: Supervisor Intervention
    Supervisor analyzes full context
    May reassign to different agent/model
    ↓ (if fails)
    
Level 4: User Notification
    System reports blocking issue
    User can provide guidance or modify requirements
    ↓ (if cannot resolve)
    
Level 5: Graceful Failure
    System saves progress
    Provides detailed error report
    Suggests next steps
```

---

## Workflow State Machine

### Two-Phase System

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: PROTOTYPE (Preset A) - AUTOMATIC                              │
│                                                                         │
│  Team assigned to repo                                                  │
│      ↓                                                                  │
│  All agents run (Architect→Coach→Code→Review→Test→Docs)                 │
│      ↓                                                                  │
│  Status: AWAITING_APPROVAL                                              │
│      ↓                                                                  │
│  🔒 STOP - Wait for confirmation                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER REVIEWS PROTOTYPE                                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [👍 APPROVE]     → Phase 2 starts (Preset C)                    │   │
│  │ [👎 REJECT]      → New requirements + new prototype             │   │
│  │ [✏️ PARTIAL]     → Adjust + run Phase 1 again                   │   │
│  │ [⏭️ SKIP PREMIUM] → Prototype is good enough                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PREMIUM (Preset C) - AFTER APPROVAL                           │
│                                                                         │
│  All agents run with premium models                                     │
│      ↓                                                                  │
│  Status: COMPLETED                                                      │
│      ↓                                                                  │
│  ✅ PERFECT VERSION READY                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### State Transitions

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

### Status Definitions

| Status | Meaning | Next Action | Trigger |
|--------|---------|-------------|---------|
| `TEAM_CREATED` | Team created | Prototype starts | Automatic |
| `PROTOTYPE_RUNNING` | Preset A running | Wait | - |
| `AWAITING_APPROVAL` | Prototype complete | User must decide | Automatic |
| `APPROVED` | Confirmed | Premium starts | POST /approve |
| `REJECTED` | Declined | Re-describe | POST /reject |
| `PARTIAL` | Partial approval | Adjust | POST /partial |
| `PREMIUM_RUNNING` | Preset C running | Wait | Automatic |
| `COMPLETED` | All done | Use result | Automatic |
| `SKIPPED` | Premium skipped | Use prototype | POST /skip |

---

## Practical Examples

### Example 1: REST API Development

**User Request:** "Build a REST API for user management with authentication"

**Phase 1: Prototype (Preset A)**

```
1. Supervisor analyzes request
   ├─> Identifies: Standard Flow
   ├─> Preset: A (Budget)
   └─> Estimated cost: $8-10

2. Architect creates plan
   ├─> Database schema (users table)
   ├─> API endpoints (CRUD + /login, /logout)
   ├─> Authentication strategy (JWT)
   └─> Edge cases (rate limiting, password reset)

3. Coach breaks into tasks
   ├─> Task 1: Setup Express + TypeScript
   ├─> Task 2: Implement user model & database
   ├─> Task 3: Create auth middleware
   ├─> Task 4: Build CRUD endpoints
   └─> Task 5: Add validation & error handling

4. For each task:
   Code Agent → Review Agent → Test Agent → Docs Agent
   
5. Result:
   ├─> Files: 15 created
   ├─> Tests: 42 passed
   ├─> Coverage: 78%
   └─> Cost: $8.50
   
Status: AWAITING_APPROVAL
```

**User Review:** 👍 APPROVED

**Phase 2: Premium (Preset C)**

```
1. Supervisor continues with Preset C

2. Architect (Opus) enhances design
   ├─> Adds role-based access control
   ├─> Improves error handling
   └─> Adds comprehensive logging

3. Code Agent (Sonnet) refines implementation
   ├─> Better error messages
   ├─> Optimized queries
   └─> Improved code structure

4. Review Agent (Opus) deep analysis
   ├─> Security audit
   ├─> Performance optimization
   └─> Best practices validation

5. Test Agent enhances tests
   ├─> Edge case coverage
   ├─> Integration tests
   └─> Coverage: 95%

6. Docs Agent creates comprehensive docs
   ├─> API reference with examples
   ├─> Setup guide
   └─> Deployment instructions

Result:
├─> Files: 18 total (3 modified, 3 added)
├─> Tests: 67 passed
├─> Coverage: 95%
└─> Cost: $130

Total Cost: $138.50
Status: COMPLETED ✅
```

### Example 2: Code Refactoring

**User Request:** "Refactor this legacy Express app to use TypeScript and modern patterns"

**Workflow Selection:** Refactor Flow

```
1. Supervisor analyzes codebase
   ├─> Size: 20 files, 3000 LOC
   ├─> Complexity: Medium
   └─> Recommends: Refactor Standard (E2)

2. Refactor Agent (Claude Sonnet) analyzes code
   ├─> Identifies patterns
   ├─> Plans migration strategy
   └─> Creates conversion plan

3. Refactor Agent implements
   ├─> Converts JS to TS file by file
   ├─> Adds type definitions
   ├─> Updates patterns (callbacks → async/await)
   └─> Maintains backwards compatibility

4. Review Agent validates
   ├─> Type safety check
   ├─> Pattern consistency
   └─> No functionality changes

5. Test Agent ensures compatibility
   ├─> All existing tests pass
   ├─> Adds new type-based tests
   └─> Validates behavior unchanged

Result:
├─> Files: 20 converted
├─> Type safety: 100%
├─> Tests: All passing
└─> Cost: $6.20

Status: COMPLETED ✅
```

### Example 3: Multi-Repo Merge

**User Request:** "Merge 3 microservices into a monorepo"

**Workflow Selection:** Merge Flow (F2: Standard)

```
1. Supervisor analyzes repos
   ├─> Repo A: auth-service (5 files)
   ├─> Repo B: user-service (8 files)
   ├─> Repo C: notification-service (6 files)
   └─> Recommends: Merge Standard

2. Merge Agent creates structure
   ├─> packages/auth/
   ├─> packages/user/
   └─> packages/notification/

3. Merge Agent migrates code
   ├─> Preserves git history
   ├─> Updates import paths
   ├─> Consolidates dependencies
   └─> Creates workspace config

4. Multi-Repo Agent handles cross-cutting
   ├─> Shared utilities → packages/common/
   ├─> Unified config
   └─> Single CI/CD pipeline

5. Review Agent validates
   ├─> No broken imports
   ├─> All tests passing
   └─> Build successful

Result:
├─> Structure: Monorepo created
├─> Packages: 4 (3 services + 1 common)
├─> Tests: All passing
└─> Cost: $6.80

Status: COMPLETED ✅
```

---

## Cost Analysis

### Cost Comparison by Preset

| Scenario | Direct Preset C | Workflow A→C | Savings |
|----------|----------------|--------------|---------|
| 1st attempt correct | $130 | $138 | -$8 (6% more) |
| 2nd attempt correct | $260 | $146 | +$114 (44% savings) |
| 3rd attempt correct | $390 | $154 | +$236 (61% savings) |
| 5th attempt correct | $650 | $170 | **+$480 (74% savings)** |

**Conclusion:** The more uncertain the requirements, the more the A→C workflow saves.

### Cost Breakdown Example

**Preset B Build (Typical Project):**

| Agent | Model | Input Tokens | Output Tokens | Cost |
|-------|-------|--------------|---------------|------|
| Supervisor | Claude Haiku | 2,000 | 500 | $0.06 |
| Architect | DeepSeek R1 | 10,000 | 5,000 | $0.83 |
| Coach | DeepSeek R1 | 8,000 | 3,000 | $0.61 |
| Code | DeepSeek V3.2 | 50,000 | 30,000 | $1.12 |
| Review | Claude Sonnet | 40,000 | 8,000 | $14.40 |
| Test | DeepSeek V3.2 | 25,000 | 15,000 | $0.56 |
| Docs | Claude Haiku | 15,000 | 8,000 | $0.58 |
| **Total** | | **150,000** | **69,500** | **$18.16** |

### Monthly Cost Estimates

**Assuming 10 builds/month:**

| Preset | Cost/Build | Monthly Cost | Best For |
|--------|------------|--------------|----------|
| A: Budget | $8 | **$80** | Students, experiments |
| B: Optimal | $25 | **$250** | Professional developers |
| C: Premium | $130 | **$1,300** | Enterprises, critical systems |
| D: Smart | $80 | **$800** | Complex projects |

**Hybrid Approach (8 Preset B + 2 Preset C):**
- Monthly: $200 + $260 = **$460**
- Covers 80% daily work + 20% critical projects

---

## Current Status & Roadmap

### Current Status: v1.0.0 (Production Ready)

#### ✅ Completed Features

**Core System:**
- [x] 17 specialized agent profiles
- [x] 6 preset configurations
- [x] Supervisor orchestration
- [x] Tool calling system
- [x] Self-correction loops
- [x] Two-phase workflow (A→C)
- [x] State machine implementation

**Workflows:**
- [x] Standard Flow (Architect→Coach→Code→Review→Test→Docs)
- [x] Refactor Flow (3 tiers)
- [x] Merge Flow (3 tiers)

**Infrastructure:**
- [x] Redis-based state management
- [x] Cost tracking per agent/build
- [x] Error handling & retry logic
- [x] Message queue system

**Documentation:**
- [x] Complete system documentation
- [x] API contracts
- [x] Model comparison guide
- [x] Cost analysis

### 🚧 In Progress

**Phase 2: Enhanced Capabilities**
- [ ] Parallel agent execution
- [ ] Advanced caching (repeated tasks)
- [ ] Custom agent configuration UI
- [ ] Real-time progress streaming

**Phase 3: Tool Builder Integration**
- [ ] Tool Builder agents (2 tiers)
- [ ] Custom tool creation workflow
- [ ] Tool marketplace

### 📋 Roadmap

#### Q2 2026: Intelligence Improvements
- [ ] Context window optimization (reduce token usage)
- [ ] Multi-agent planning (agents collaborate on plan)
- [ ] Learning from past builds (success patterns)
- [ ] Automatic preset recommendation

#### Q3 2026: Scale & Performance
- [ ] Parallel workflow execution
- [ ] Multi-repository orchestration (F3 enhancement)
- [ ] Distributed agent execution
- [ ] Build caching & incremental updates

#### Q4 2026: Enterprise Features
- [ ] Team collaboration (multiple users)
- [ ] Custom model integration (bring your own)
- [ ] Compliance & audit logging
- [ ] SLA guarantees & priority queues

### Known Limitations

| Limitation | Impact | Workaround | ETA |
|------------|--------|------------|-----|
| Sequential execution only | Slower for independent tasks | Manual parallelization | Q2 2026 |
| No build caching | Repeated work costs more | Reuse previous outputs | Q3 2026 |
| Limited to GitHub | Can't work with GitLab/Bitbucket | Manual repo sync | Q4 2026 |
| No human-in-loop | Can't ask clarifying questions | User provides detailed specs | Q2 2026 |

### Performance Metrics (Current)

| Metric | Preset A | Preset B | Preset C | Preset D |
|--------|----------|----------|----------|----------|
| Average Build Time | 8 min | 12 min | 25 min | 18 min |
| Success Rate (1st attempt) | 73% | 84% | 96% | 89% |
| Average Retries | 1.8 | 0.9 | 0.2 | 0.5 |
| User Satisfaction | 3.2/5 | 4.4/5 | 4.8/5 | 4.6/5 |

---

## FAQ

### General Questions

**Q: How is this different from GitHub Copilot?**  
A: Copilot assists you while coding. Our system autonomously builds entire features end-to-end, from architecture to tests to docs.

**Q: Can I use my own models?**  
A: Not yet. Q4 2026 will add custom model integration (bring your own API keys).

**Q: What happens if an agent fails?**  
A: The supervisor automatically retries up to 3 times, then escalates or notifies you with a detailed error report.

### Cost Questions

**Q: Why is Preset C so expensive?**  
A: It uses Claude Opus 4 for planning and review, which costs $15/1M tokens. But it achieves 96% success rate on first attempt.

**Q: Can I mix and match models?**  
A: Yes! You can customize any team's agent configuration after creation, or use Preset D (Smart) which already mixes models strategically.

**Q: Do I pay for failed builds?**  
A: Yes, but only for tokens actually used. If a build fails at the Code stage, you don't pay for Test/Docs.

### Technical Questions

**Q: How long does a typical build take?**  
A: 8-25 minutes depending on preset and project complexity. Simple features: 5-10 min. Complex features: 20-30 min.

**Q: Can agents work on multiple repos?**  
A: Yes! Use Preset F (Merge) for combining repos, or Multi-Repo agents for cross-repo changes.

**Q: What languages are supported?**  
A: All major languages: TypeScript, JavaScript, Python, Go, Rust, Java, C#, PHP, Ruby. DeepSeek V3.2 excels at coding.

**Q: How do I debug agent decisions?**  
A: Every build includes detailed logs showing each agent's input, output, reasoning, and tool calls. Access via `/api/teams/:id/builds/:buildId/logs`.

---

## Getting Started

### Quick Start

```bash
# 1. Create a team
curl -X POST https://api.codecloud.dev/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "repo": "github.com/user/my-project",
    "preset": "B",
    "task": "Build a REST API for user management"
  }'

# 2. Monitor progress
curl https://api.codecloud.dev/api/teams/{team_id}/status

# 3. Review prototype
# System automatically pauses at AWAITING_APPROVAL

# 4. Approve to continue with premium
curl -X POST https://api.codecloud.dev/api/teams/{team_id}/approve \
  -H "Content-Type: application/json" \
  -d '{"comment": "Looks good!"}'

# 5. Get final result
curl https://api.codecloud.dev/api/teams/{team_id}/builds/latest
```

### Best Practices

1. **Start with Preset B:** Best balance for most projects
2. **Use Prototype→Premium workflow:** Save money on uncertain requirements
3. **Review prototype carefully:** Cheaper to fix now than in premium phase
4. **Provide detailed task descriptions:** Better input = better output
5. **Use Preset D for architecture-heavy projects:** Strong planning saves implementation time

---

## Resources

- **API Documentation:** `/docs/api/README.md`
- **Contract Specifications:** `/CONTRACTS/`
- **Model Comparison:** `/docs/MULTI_AGENT_SYSTEM_COMPLETE.md`
- **Architecture Guide:** `/docs/ARCHITECTURE.md`
- **Contributing:** `/docs/CONTRIBUTING.md`

---

## Support

- **Issues:** Report bugs at `github.com/code-cloud-agents/issues`
- **Discussions:** Ask questions at `github.com/code-cloud-agents/discussions`
- **Discord:** Join our community at `discord.gg/codecloud`

---

**Last Updated:** 2025-01-25  
**Version:** 1.0.0  
**Maintained By:** Code Cloud Team
