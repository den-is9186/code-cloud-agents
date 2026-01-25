# Configuration Reference

> Complete reference for all configuration options in Code Cloud Agents

**Version:** 1.0.0  
**Last Updated:** 2025-01-25

---

## Table of Contents

1. [package.json Configuration](#packagejson-configuration)
2. [capabilities.yml Configuration](#capabilitiesyml-configuration)
3. [GitHub Actions Workflow Configuration](#github-actions-workflow-configuration)
4. [Redis Configuration](#redis-configuration)
5. [Aider Configuration](#aider-configuration)
6. [Jest Configuration](#jest-configuration)
7. [Models Configuration (config/models.yml)](#models-configuration)
8. [Presets Configuration (config/presets.yml)](#presets-configuration)
9. [Environment Variables](#environment-variables)
10. [Express Application Configuration](#express-application-configuration)

---

## package.json Configuration

**Location:** `/package.json`  
**Purpose:** Node.js project metadata, dependencies, and scripts

### Basic Metadata

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "description": "Express application with Redis support",
  "main": "src/index.js",
  "license": "ISC"
}
```

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `name` | string | Package name | Required |
| `version` | string | Semantic version (MAJOR.MINOR.PATCH) | Required |
| `description` | string | Brief project description | Optional |
| `main` | string | Entry point file | `index.js` |
| `license` | string | License identifier (SPDX) | `ISC` |

**When to change:**
- `name`: When initializing new project or renaming
- `version`: After each release (follow Semantic Versioning)
- `main`: When changing entry point structure

---

### Scripts Configuration

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "jest",
    "test:unit": "jest tests/example.test.js",
    "test:integration": "jest tests/integration.test.js",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

| Script | Command | Purpose | When to Use |
|--------|---------|---------|-------------|
| `start` | `node src/index.js` | Start production server | Production |
| `dev` | `node --watch src/index.js` | Development with hot reload | Development |
| `test` | `jest` | Run all tests | CI/CD, pre-commit |
| `test:unit` | `jest tests/example.test.js` | Run unit tests only | Focused testing |
| `test:integration` | `jest tests/integration.test.js` | Run integration tests only | API testing |
| `test:watch` | `jest --watch` | Watch mode for TDD | Development |
| `test:coverage` | `jest --coverage` | Generate coverage report | QA, CI/CD |

**When to change:**
- Add custom scripts for linting, building, deployment
- Modify entry points when restructuring project
- Add pre/post hooks for automated workflows

---

### Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

**Production Dependencies:**

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `express` | ^4.18.2 | Web framework | ✅ Yes |
| `ioredis` | ^5.3.2 | Redis client | ✅ Yes (for state management) |

**Development Dependencies:**

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `jest` | ^29.7.0 | Testing framework | ✅ Yes |
| `supertest` | ^6.3.3 | HTTP testing | ✅ Yes (for API tests) |

**When to change:**
- Weekly: Check for security updates (`npm audit`)
- Monthly: Update patch versions
- Quarterly: Review major/minor updates
- **ALWAYS:** Check security advisories before adding new dependencies

---

### Jest Configuration in package.json

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js"
    ],
    "testMatch": [
      "**/tests/**/*.test.js"
    ]
  }
}
```

| Option | Value | Description |
|--------|-------|-------------|
| `testEnvironment` | `"node"` | Use Node.js environment (not browser) |
| `coverageDirectory` | `"coverage"` | Output directory for coverage reports |
| `collectCoverageFrom` | `["src/**/*.js"]` | Files to include in coverage |
| `testMatch` | `["**/tests/**/*.test.js"]` | Test file patterns |

See [Jest Configuration](#jest-configuration) section for detailed options.

---

## capabilities.yml Configuration

**Location:** `/capabilities.yml`  
**Purpose:** Registry of all features/capabilities with test requirements

### Structure

```yaml
version: "1.0"
project: "code-cloud-agents"

capabilities:
  - id: "feature-id"
    name: "Feature Name"
    description: "What this feature does"
    status: "planned|in-progress|completed|deprecated"
    tests_required:
      - type: "unit|integration|e2e"
        description: "What to test"

coverage:
  minimum: 80
  targets:
    unit: 90
    integration: 70
```

---

### Capability Entry Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | string | ✅ Yes | Unique identifier (kebab-case) | `"auto-build-workflow"` |
| `name` | string | ✅ Yes | Human-readable name | `"Auto Build Workflow"` |
| `description` | string | ✅ Yes | What the feature does | `"GitHub Actions Workflow..."` |
| `status` | enum | ✅ Yes | Current state | `planned`, `in-progress`, `completed`, `deprecated` |
| `tests_required` | array | ✅ Yes | Required test specifications | See below |

---

### Test Requirement Fields

| Field | Type | Required | Description | Values |
|-------|------|----------|-------------|--------|
| `type` | enum | ✅ Yes | Test category | `unit`, `integration`, `e2e`, `validation`, `performance` |
| `description` | string | ✅ Yes | What to test | Any descriptive text |

**Test Types:**
- **unit:** Isolated function/module tests
- **integration:** Multi-component interaction tests
- **e2e:** End-to-end user journey tests
- **validation:** Input validation tests
- **performance:** Speed/load tests

---

### Coverage Targets

```yaml
coverage:
  minimum: 80          # Overall minimum coverage required
  targets:
    unit: 90           # Target for unit tests
    integration: 70    # Target for integration tests
    e2e: 60           # Target for e2e tests
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `minimum` | number | 80 | Overall coverage threshold (%) |
| `targets.unit` | number | 90 | Unit test coverage goal |
| `targets.integration` | number | 70 | Integration test coverage goal |
| `targets.e2e` | number | 60 | E2E test coverage goal (optional) |

**When to change:**
- **Increase minimum:** When code quality improves and you want to maintain it
- **Decrease temporarily:** Only during prototyping (restore before production)
- **Adjust targets:** Based on team capacity and project criticality

---

### Example: Complete Capability

```yaml
capabilities:
  - id: "agent-state-management"
    name: "Agent State Management API"
    description: "REST API for managing agent execution states in Redis"
    status: "completed"
    tests_required:
      - type: "unit"
        description: "Validate agent ID format"
      - type: "integration"
        description: "Create and retrieve agent state"
      - type: "integration"
        description: "Retry failed tasks"
      - type: "integration"
        description: "List states with filtering"
```

**When to change:**
- **Add capability:** When planning a new feature (BEFORE coding)
- **Update status:** After completing implementation milestones
- **Add tests:** When discovering new edge cases
- **Mark deprecated:** When phasing out a feature

---

## GitHub Actions Workflow Configuration

**Location:** `.github/workflows/auto-build.yml`  
**Purpose:** Automated code generation with AI agents

### Workflow Triggers

```yaml
on:
  workflow_dispatch:
    inputs:
      task:
        description: 'Build Task (leave empty to use queue)'
        required: false
        type: string
      model:
        description: 'AI Model'
        required: false
        type: choice
        default: 'claude-sonnet-4-5-20250929'
        options:
          - claude-sonnet-4-5-20250929
          - claude-opus-4-5
          - gpt-4

  schedule:
    - cron: '*/3 * * * *'  # Every 3 minutes
```

---

### Trigger Configuration

| Trigger | Type | Purpose | When It Runs |
|---------|------|---------|--------------|
| `workflow_dispatch` | Manual | User-triggered builds | On-demand via GitHub UI |
| `schedule` | Automated | Process task queue | Every 3 minutes |

**workflow_dispatch Inputs:**

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `task` | string | ❌ No | - | Custom task description (overrides queue) |
| `model` | choice | ❌ No | `claude-sonnet-4-5-20250929` | AI model to use |

**When to change:**
- **task input:** Leave as-is (flexible design)
- **model options:** Add new models when available
- **cron schedule:** Change frequency based on usage:
  - `*/3 * * * *` = Every 3 minutes (current)
  - `*/15 * * * *` = Every 15 minutes (less aggressive)
  - `0 */4 * * *` = Every 4 hours (conservative)

---

### Job Configuration

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    
    permissions:
      contents: write
```

| Option | Value | Description | When to Change |
|--------|-------|-------------|----------------|
| `runs-on` | `ubuntu-latest` | Runner OS | Rarely (unless need macOS/Windows) |
| `timeout-minutes` | `60` | Max job duration | Increase if builds take longer |
| `permissions.contents` | `write` | Allows git push | Required for commits |

---

### Step Configuration

#### Checkout Repository

```yaml
- name: Checkout Repository
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    ref: main
    fetch-depth: 0
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `token` | `${{ secrets.GITHUB_TOKEN }}` | Auth token (auto-provided) |
| `ref` | `main` | Branch to checkout |
| `fetch-depth` | `0` | Full history (needed for commits) |

**When to change `ref`:**
- `main` → `develop`: If working on development branch
- Never use feature branches (breaks automation)

---

#### Configure Git

```yaml
- name: Configure Git
  run: |
    git config user.name "den-is9186"
    git config user.email "den-is9186@users.noreply.github.com"
```

**Required for automated commits.**

| Config | Value | Description |
|--------|-------|-------------|
| `user.name` | `"den-is9186"` | GitHub username |
| `user.email` | `"den-is9186@users.noreply.github.com"` | GitHub no-reply email |

**When to change:**
- Replace with your GitHub username
- Use format: `{username}@users.noreply.github.com`

---

#### Setup Python & Aider

```yaml
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'

- name: Install Aider
  run: |
    pip install aider-chat
    aider --version
```

| Parameter | Value | Description | When to Change |
|-----------|-------|-------------|----------------|
| `python-version` | `'3.11'` | Python version | Update for Aider compatibility |

---

#### Run Auto-Build

```yaml
- name: Run Auto-Build
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    # Task determination logic
    MODEL="${{ github.event.inputs.model || 'claude-sonnet-4-5-20250929' }}"
    
    aider \
      --yes \
      --auto-commits \
      --model "$MODEL" \
      --message "$TASK"
```

**Aider Command Options:**

| Flag | Description | Required |
|------|-------------|----------|
| `--yes` | Auto-confirm prompts | ✅ Yes (for automation) |
| `--auto-commits` | Auto-commit changes | ✅ Yes (for automation) |
| `--model` | AI model to use | ✅ Yes |
| `--message` | Task description | ✅ Yes |

**When to change:**
- Add `--no-pretty` for cleaner logs
- Add `--no-stream` for buffered output
- Add `--edit-format whole` for whole-file edits

---

### Environment Variables in Workflow

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Required Secrets:**

| Secret | Purpose | How to Set |
|--------|---------|------------|
| `ANTHROPIC_API_KEY` | Claude API access | GitHub Settings → Secrets → New secret |
| `GITHUB_TOKEN` | Auto-provided | No action needed |

**When to change:**
- Rotate keys quarterly or after suspected leak
- Never commit keys to repository

---

## Redis Configuration

**Location:** `src/index.js` (runtime configuration)  
**Purpose:** State management for agent execution

### Configuration Object

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};
```

---

### Connection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `'localhost'` | Redis server hostname |
| `port` | number | `6379` | Redis server port |
| `retryStrategy` | function | See below | Reconnection logic |
| `maxRetriesPerRequest` | number | `3` | Max retries per operation |

---

### Retry Strategy

```javascript
retryStrategy: (times) => {
  const delay = Math.min(times * 50, 2000);
  return delay;
}
```

**Logic:**
- Attempt 1: Wait 50ms
- Attempt 2: Wait 100ms
- Attempt 3: Wait 150ms
- Attempt 40+: Wait 2000ms (capped)

**When to change:**
- **Increase delay:** If Redis is slow/overloaded
- **Decrease delay:** For faster reconnection in stable networks
- **Cap higher:** For patient retry behavior

---

### Environment Variables for Redis

```bash
REDIS_HOST=localhost     # Redis server hostname
REDIS_PORT=6379          # Redis server port
```

**Common Values:**

| Environment | Host | Port | Description |
|-------------|------|------|-------------|
| Local Dev | `localhost` | 6379 | Local Redis instance |
| Docker | `redis` | 6379 | Service name in docker-compose |
| Production | `redis.example.com` | 6379 | Hosted Redis service |
| Redis Cloud | `{endpoint}` | 6379 | Cloud provider endpoint |

---

### Redis Key Patterns

The application uses these key patterns:

| Pattern | Example | Purpose | TTL |
|---------|---------|---------|-----|
| `agent:state:{agentId}` | `agent:state:build123` | Agent execution state | 24 hours |
| `agent:states:index` | (set) | Index of all agent IDs | Persistent |
| `task:queue:{index}` | `task:queue:0` | Task metadata | 24 hours |

**When to change:**
- **Key patterns:** Only if refactoring data model
- **TTL:** Adjust based on retention requirements (see `DEFAULT_TTL` in code)

---

### Redis Data Structures

#### Agent State

```json
{
  "agentId": "build123",
  "status": "running",
  "progress": 45,
  "metadata": {},
  "retryCount": 0,
  "maxRetries": 3,
  "createdAt": "2025-01-25T12:00:00Z",
  "updatedAt": "2025-01-25T12:05:00Z"
}
```

---

### Configuration Constants

```javascript
const AGENT_STATE_PREFIX = 'agent:state:';
const AGENT_STATE_INDEX = 'agent:states:index';
const DEFAULT_TTL = 86400;  // 24 hours in seconds
const MAX_RETRIES = 3;
```

| Constant | Value | Description | When to Change |
|----------|-------|-------------|----------------|
| `DEFAULT_TTL` | `86400` (24h) | State expiration | Increase for longer retention |
| `MAX_RETRIES` | `3` | Max task retry attempts | Increase for resilience |

---

## Aider Configuration

**Location:** Command-line flags in workflow file  
**Purpose:** AI-powered code generation

### Command-Line Flags

```bash
aider \
  --yes \
  --auto-commits \
  --model "claude-sonnet-4-5-20250929" \
  --message "Task description"
```

---

### Core Flags

| Flag | Type | Default | Description | Required |
|------|------|---------|-------------|----------|
| `--yes` | boolean | false | Auto-confirm all prompts | ✅ Yes (automation) |
| `--auto-commits` | boolean | false | Automatically commit changes | ✅ Yes (automation) |
| `--model` | string | - | AI model identifier | ✅ Yes |
| `--message` | string | - | Task description | ✅ Yes |

---

### Optional Flags (Not Currently Used)

| Flag | Type | Description | When to Use |
|------|------|-------------|-------------|
| `--no-pretty` | boolean | Disable pretty output | Cleaner logs |
| `--no-stream` | boolean | Buffer output instead of streaming | Easier log parsing |
| `--edit-format` | string | Edit format (whole/diff/udiff) | Control how files are edited |
| `--no-auto-commits` | boolean | Disable auto-commit | Manual review needed |
| `--architect` | boolean | Enable architect mode | Complex refactoring |
| `--map-tokens` | number | Repository map token limit | Large codebases |
| `--file` | string | Files to include | Explicit file selection |

---

### Edit Formats

```bash
--edit-format whole    # Replace entire file
--edit-format diff     # Apply unified diff
--edit-format udiff    # Apply universal diff (default)
```

| Format | Speed | Safety | When to Use |
|--------|-------|--------|-------------|
| `whole` | Fast | Low | Small files, complete rewrites |
| `diff` | Medium | Medium | Standard changes |
| `udiff` | Slow | High | Large files, precise edits |

---

### Environment Variables for Aider

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...   # Required for Claude models
AIDER_MODEL=claude-sonnet-4           # Default model override
AIDER_AUTO_COMMITS=true               # Auto-commit override
```

**When to change:**
- Set `AIDER_MODEL` to change default model globally
- Set `AIDER_AUTO_COMMITS=false` for manual commit workflow

---

### Model Selection

Available models (configured in workflow):

| Model | Provider | Speed | Quality | Cost | Use Case |
|-------|----------|-------|---------|------|----------|
| `claude-sonnet-4-5-20250929` | Anthropic | Fast | High | Medium | **Default** - Standard builds |
| `claude-opus-4-5` | Anthropic | Slow | Highest | High | Production code |
| `gpt-4` | OpenAI | Medium | High | High | Alternative |

See [Models Configuration](#models-configuration) for comprehensive model options.

---

## Jest Configuration

**Location:** `package.json` (inline) or `jest.config.js` (dedicated)  
**Purpose:** JavaScript testing framework configuration

### Current Configuration

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": ["src/**/*.js"],
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

---

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `testEnvironment` | string | `"jsdom"` | Test environment |
| `coverageDirectory` | string | `"coverage"` | Output directory for coverage |
| `collectCoverageFrom` | array | - | Glob patterns for coverage |
| `testMatch` | array | - | Glob patterns for test files |
| `coverageThreshold` | object | - | Minimum coverage percentages |
| `setupFilesAfterEnv` | array | - | Setup files to run after Jest |
| `verbose` | boolean | false | Display individual test results |

---

### Test Environment Options

| Value | Description | When to Use |
|-------|-------------|-------------|
| `node` | Node.js environment | **Current** - Backend/API testing |
| `jsdom` | Browser DOM simulation | Frontend/React testing |

**When to change:**
- Use `node` for backend/CLI applications
- Use `jsdom` for frontend applications with DOM manipulation

---

### Coverage Configuration

```json
{
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/index.js"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

**Coverage Threshold Fields:**

| Field | Type | Description | Recommended |
|-------|------|-------------|-------------|
| `branches` | number | Branch coverage % | 80 |
| `functions` | number | Function coverage % | 80 |
| `lines` | number | Line coverage % | 80 |
| `statements` | number | Statement coverage % | 80 |

**When to change:**
- **Increase:** When code quality improves
- **Decrease temporarily:** During rapid prototyping (restore before prod)
- **Per-directory:** Add path-specific thresholds

---

### Test Match Patterns

```json
{
  "testMatch": [
    "**/tests/**/*.test.js",
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ]
}
```

**Pattern Examples:**

| Pattern | Matches | Use Case |
|---------|---------|----------|
| `**/tests/**/*.test.js` | `tests/api.test.js` | **Current** - Dedicated test directory |
| `**/__tests__/**/*.js` | `src/__tests__/api.js` | Co-located tests |
| `**/*.spec.js` | `src/api.spec.js` | Spec naming convention |

---

### Setup Files

```json
{
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"]
}
```

**Use setup files for:**
- Global test utilities
- Mock configurations
- Database seeding
- Custom matchers

**Example setup.js:**

```javascript
// tests/setup.js
beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global teardown
});
```

---

### Advanced Options

| Option | Type | Description | When to Use |
|--------|------|-------------|-------------|
| `testTimeout` | number | Test timeout (ms) | Slow integration tests |
| `bail` | number | Stop after N failures | Fast feedback in CI |
| `maxWorkers` | number/string | Parallel workers | Control resource usage |
| `clearMocks` | boolean | Auto-clear mocks | Prevent test pollution |
| `moduleNameMapper` | object | Path aliases | Import shortcuts |

**Example:**

```json
{
  "testTimeout": 10000,
  "bail": 1,
  "maxWorkers": "50%",
  "clearMocks": true
}
```

---

## Models Configuration

**Location:** `config/models.yml`  
**Purpose:** AI model definitions with pricing, capabilities, and use cases

### Structure

```yaml
models:
  model-name:
    provider: "anthropic|novita"
    model_id: "provider/model-id"
    display_name: "Human Readable Name"
    tier: "budget|standard|premium|special"
    pricing:
      input_per_million: 0.00
      output_per_million: 0.00
      currency: USD
    context_window: 200000
    max_output: 64000
    capabilities:
      reasoning: 0-10
      coding: 0-10
      tool_calling: 0-10
      agentic: 0-10
      speed: 0-10
    best_for:
      - "Use case 1"
      - "Use case 2"
    notes: "Additional information"
```

---

### Model Tiers

| Tier | Cost Range | Quality | Speed | Use Case |
|------|------------|---------|-------|----------|
| `budget` | $0.27-$2.50 | Good | Fast | Prototypes, internal tools |
| `standard` | $3.00-$15.00 | High | Medium | Production features |
| `premium` | $15.00-$75.00 | Highest | Slow | Critical production code |
| `special` | Varies | Specialized | Varies | Vision, long-context, etc. |

---

### Available Models

**Budget Tier:**

| Model | Input/M | Output/M | Context | Best For |
|-------|---------|----------|---------|----------|
| `deepseek-v3.2` | $0.27 | $1.10 | 163K | **Coding** - Cleanest JSON output |
| `deepseek-r1-0528` | $0.70 | $2.50 | 163K | **Reasoning** - Supervisor agent |
| `deepseek-r1-turbo` | $0.70 | $2.50 | 64K | **Speed** - Live debugging |

**Standard Tier:**

| Model | Input/M | Output/M | Context | Best For |
|-------|---------|----------|---------|----------|
| `claude-sonnet-4` | $3.00 | $15.00 | 200K | **Default** - Best balance |

**Premium Tier:**

| Model | Input/M | Output/M | Context | Best For |
|-------|---------|----------|---------|----------|
| `claude-opus-4` | $15.00 | $75.00 | 200K | **Production** - Highest quality |

**Special Tier:**

| Model | Input/M | Output/M | Context | Best For |
|-------|---------|----------|---------|----------|
| `qwen3-omni-30b` | $0.25 | $0.97 | 65K | **Vision** - Screenshot → Code |
| `llama-4-maverick` | $0.27 | $0.80 | 1M | **Long Context** - Huge codebases |
| `kimi-k2` | $0.57 | $2.30 | 131K | **Reviews** - Personality + reasoning |

---

### Capabilities Rating (0-10)

| Capability | Description | Example Use |
|------------|-------------|-------------|
| `reasoning` | Logical deduction, planning | Architecture, debugging |
| `coding` | Code generation quality | Feature implementation |
| `tool_calling` | Function calling accuracy | API integration, workflows |
| `agentic` | Multi-step task handling | Complex automation |
| `speed` | Response latency | Real-time feedback |
| `vision` | Image understanding | Screenshot analysis |
| `long_context` | Large input handling | Full repo analysis |

---

### Selection Guide

```yaml
selection_guide:
  by_task:
    coding: "deepseek-v3.2"
    reasoning: "deepseek-r1-0528"
    speed: "deepseek-r1-turbo"
    vision: "qwen3-omni-30b"
    long_context: "llama-4-maverick"
    reviews: "kimi-k2 oder deepseek-r1-0528"
    standard: "claude-sonnet-4"
    premium: "claude-opus-4"
```

**When to change:**
- **Add models:** When new providers/models become available
- **Update pricing:** Check quarterly for price changes
- **Adjust ratings:** Based on real-world performance
- **Update best_for:** As use cases evolve

---

## Presets Configuration

**Location:** `config/presets.yml`  
**Purpose:** Predefined team configurations for different use cases

### Preset Structure

```yaml
presets:
  PRESET_ID:
    name: "Preset Name"
    description: "What this preset optimizes for"
    estimated_cost_per_build: 25
    quality_score: 79
    error_rate: 0.08
    recommended: true  # Optional
    
    agents:
      supervisor:
        model: model-name
        role: "What this agent does"
      architect:
        model: model-name
        role: "What this agent does"
      # ... more agents
    
    use_cases:
      - "Use case 1"
      - "Use case 2"
```

---

### Standard Presets

| Preset | Cost | Quality | Speed | Description |
|--------|------|---------|-------|-------------|
| **A** | $8 | 71 | Fast | **Budget** - Prototypes, POCs |
| **B** | $25 | 79 | Medium | **Optimal** ✅ - Best balance |
| **B+** | $12 | 75 | Very Fast | **Speed** - Live debugging |
| **C** | $130 | 90 | Slow | **Premium** - Production code |
| **D** | $80 | 86 | Medium | **Smart** - Premium reasoning, budget execution |

---

### Special Presets

| Preset | Cost | Description | When to Use |
|--------|------|-------------|-------------|
| **V** | $15 | **Vision** - Image analysis | Screenshot → Code, UI bugs |
| **L** | $20 | **Long Context** - 1M tokens | Legacy refactoring, multi-file changes |

---

### Task-Specific Presets

| Preset | Variants | Description |
|--------|----------|-------------|
| **E** | Budget/Standard/Premium | **Refactor** - Code cleanup |
| **F** | Budget/Standard/Premium | **Merge** - Conflict resolution |

**Variant Pricing:**

| Variant | E (Refactor) | F (Merge) |
|---------|--------------|-----------|
| Budget | $1 | $1 |
| Standard | $6 | $6 |
| Premium | $30 | $45 |

---

### Agent Roles

Standard agent types across presets:

| Agent | Role | Appears In |
|-------|------|------------|
| `supervisor` | Orchestrates all agents | All presets |
| `architect` | Creates runbook, designs system | A, B, C, D, L |
| `coach` | Defines sub-tasks | A, B, B+, C, D, V, L |
| `code` | Writes implementation code | All presets |
| `review` | Code review and QA | All presets |
| `test` | Writes test cases | All presets |
| `docs` | Documentation | All presets |
| `vision` | Analyzes images | V only |

---

### Selection Guide

```yaml
selection_guide:
  by_priority:
    cost: ["A", "B+", "V", "L"]
    quality: ["C", "D", "B"]
    speed: ["B+", "A"]
    vision: ["V"]
    large_repos: ["L"]
  
  by_use_case:
    prototype: "A"
    standard_dev: "B"
    live_debugging: "B+"
    production: "C"
    cost_optimized_quality: "D"
    screenshot_to_code: "V"
    legacy_refactor: "L"
    code_cleanup: "E"
    merge_conflicts: "F"
```

---

### Two-Phase Workflow

Cost-optimized strategy for production features:

```yaml
two_phase_workflow:
  phase_1:
    preset: "A"           # Budget prototype
    cost: $8
    ends_with: "AWAITING_APPROVAL"
  
  phase_2:
    preset: "C"           # Premium polish
    cost: $130
    requires: "User Approval"
  
  total_cost: $138        # vs. $650 for 5 direct premium attempts
  savings_percent: 79%
```

**When to use:**
1. Start with Preset A for rapid prototyping
2. Get user approval on prototype
3. Polish with Preset C for production
4. Save 79% compared to direct premium approach

---

### When to Change Presets

**Select preset based on:**

| Scenario | Recommended Preset | Reason |
|----------|-------------------|--------|
| New feature exploration | A | Fast, cheap iteration |
| Standard development | B | Best balance |
| Bug fixing with Aider | B+ | Speed matters |
| Pre-release code | C | Highest quality |
| Important but budget-conscious | D | Smart cost optimization |
| UI from screenshot | V | Vision capabilities |
| Large-scale refactoring | L | 1M context window |
| Code cleanup | E-budget/standard | Task-specific |

---

## Environment Variables

**Location:** `.env` (local), GitHub Secrets (CI/CD), process environment (production)  
**Reference:** `.env.example` (template)

### Required Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | string | ✅ Yes | - | Claude API key |
| `NODE_ENV` | enum | ❌ No | `development` | Environment mode |
| `PORT` | number | ❌ No | `3000` | Server port |

---

### Optional Variables

| Variable | Type | Default | Description | When to Set |
|----------|------|---------|-------------|-------------|
| `REDIS_HOST` | string | `localhost` | Redis hostname | Production, Docker |
| `REDIS_PORT` | number | `6379` | Redis port | Non-standard setups |
| `LOG_LEVEL` | enum | `debug` | Logging verbosity | Production (use `info`) |
| `AIDER_MODEL` | string | - | Default Aider model | Override default |
| `AIDER_AUTO_COMMITS` | boolean | - | Auto-commit flag | Workflow customization |
| `GITHUB_TOKEN` | string | - | GitHub API token | Local development |

---

### Environment-Specific Values

**Development:**

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Production:**

```bash
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
REDIS_HOST=redis.production.com
REDIS_PORT=6379
```

**Docker Compose:**

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
REDIS_HOST=redis  # Service name
REDIS_PORT=6379
```

---

### LOG_LEVEL Options

| Level | Verbosity | Use Case |
|-------|-----------|----------|
| `error` | Minimal | Production (errors only) |
| `warn` | Low | Production (errors + warnings) |
| `info` | Medium | Production (important events) |
| `debug` | High | **Development** (all details) |
| `trace` | Maximum | Debugging complex issues |

---

### GitHub Secrets Configuration

**Required in GitHub Actions:**

```
Settings → Secrets and variables → Actions → New repository secret
```

| Secret Name | Value Example | Description |
|-------------|---------------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Claude API key |

**Auto-provided by GitHub:**

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Automatically generated for workflow authentication |

---

### Security Best Practices

**DO:**
- ✅ Use `.env.example` as template (commit this)
- ✅ Add `.env` to `.gitignore` (never commit this)
- ✅ Rotate API keys quarterly
- ✅ Use different keys for dev/prod
- ✅ Store production secrets in GitHub Secrets

**DON'T:**
- ❌ Commit `.env` files
- ❌ Hard-code secrets in code
- ❌ Share secrets via chat/email
- ❌ Use production secrets in development

---

## Express Application Configuration

**Location:** `src/index.js`  
**Purpose:** Runtime server and API configuration

### Server Configuration

```javascript
const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = process.cwd();
const ALLOWED_DIRS = ['src', 'tests', 'CONTRACTS', 'ops'];
```

| Constant | Type | Default | Description | When to Change |
|----------|------|---------|-------------|----------------|
| `PORT` | number | `3000` | HTTP server port | Via `PORT` env var |
| `PROJECT_ROOT` | string | `process.cwd()` | Application root | Never (dynamic) |
| `ALLOWED_DIRS` | array | See above | File access whitelist | Add directories as needed |

---

### Middleware Configuration

#### JSON Body Parser

```javascript
app.use(express.json({ limit: '10mb' }));
```

| Option | Value | Description | When to Change |
|--------|-------|-------------|----------------|
| `limit` | `'10mb'` | Max request body size | Increase for large file uploads |

**Common values:**
- `'1mb'` - Minimal (small JSON only)
- `'10mb'` - **Current** (medium files)
- `'50mb'` - Large files
- `'100mb'` - Very large uploads

---

#### Request Timeout

```javascript
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});
```

| Timeout | Value (ms) | Description | When to Change |
|---------|------------|-------------|----------------|
| Request | `30000` | Max request duration | Increase for slow uploads |
| Response | `30000` | Max response duration | Increase for large responses |

---

### Security Configuration

#### Path Validation

```javascript
const ALLOWED_DIRS = ['src', 'tests', 'CONTRACTS', 'ops'];

function validatePath(requestedPath) {
  // Path traversal protection
  // Whitelist validation
}
```

**Allowed directories:**

| Directory | Purpose | Exposed via API |
|-----------|---------|-----------------|
| `src` | Source code | ✅ Yes |
| `tests` | Test files | ✅ Yes |
| `CONTRACTS` | API/Data contracts | ✅ Yes |
| `ops` | Operations docs | ✅ Yes |

**When to change:**
- **Add directory:** When creating new accessible area
- **Remove directory:** To restrict access
- **Never expose:** `.git`, `node_modules`, `.env`

---

### API Configuration Constants

```javascript
const AGENT_STATE_PREFIX = 'agent:state:';
const AGENT_STATE_INDEX = 'agent:states:index';
const DEFAULT_TTL = 86400;  // 24 hours
const MAX_RETRIES = 3;
```

| Constant | Value | Description | When to Change |
|----------|-------|-------------|----------------|
| `DEFAULT_TTL` | `86400` (24h) | State retention period | Increase for longer history |
| `MAX_RETRIES` | `3` | Task retry limit | Increase for resilience |

---

### File Size Limits

```javascript
if (stats.size > 10 * 1024 * 1024) {
  return res.status(400).json({
    error: { code: 'FILE_TOO_LARGE', message: '...' }
  });
}
```

| Limit | Value | Description | When to Change |
|-------|-------|-------------|----------------|
| Max file size | 10 MB | Read/write limit | Increase for large files |
| Max body size | 10 MB | Request limit | Match file size |

---

### Graceful Shutdown

```javascript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

**Handled signals:**

| Signal | Source | Description |
|--------|--------|-------------|
| `SIGTERM` | Kubernetes, Docker | Graceful termination request |
| `SIGINT` | Ctrl+C | User interrupt |

**Shutdown sequence:**
1. Stop accepting new connections
2. Close HTTP server
3. Close Redis connection
4. Exit process

---

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

**Standard error codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Bad request parameters |
| `INVALID_PATH` | 400 | Path validation failed |
| `FILE_NOT_FOUND` | 404 | File doesn't exist |
| `STATE_NOT_FOUND` | 404 | Agent state not found |
| `FILE_TOO_LARGE` | 400 | File exceeds size limit |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Configuration Checklist

Use this checklist when setting up or modifying configurations:

### Initial Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set `ANTHROPIC_API_KEY` in `.env`
- [ ] Configure GitHub username in workflow
- [ ] Add `ANTHROPIC_API_KEY` to GitHub Secrets
- [ ] Update `package.json` name and description
- [ ] Review `ALLOWED_DIRS` in `src/index.js`

### Before Production
- [ ] Set `NODE_ENV=production`
- [ ] Set `LOG_LEVEL=info` or `warn`
- [ ] Configure production Redis host
- [ ] Review and adjust timeouts
- [ ] Set appropriate `DEFAULT_TTL`
- [ ] Review file size limits
- [ ] Rotate all API keys
- [ ] Test graceful shutdown

### Regular Maintenance
- [ ] Check for dependency updates (weekly)
- [ ] Review error rates and adjust `MAX_RETRIES` (monthly)
- [ ] Review and update model pricing (quarterly)
- [ ] Rotate API keys (quarterly)
- [ ] Review and optimize Redis TTL (quarterly)
- [ ] Update Jest coverage thresholds (as needed)

---

## Troubleshooting

### Common Configuration Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Workflow not running | No builds triggered | Check cron syntax, verify secrets |
| Aider fails | API errors | Verify `ANTHROPIC_API_KEY` in GitHub Secrets |
| Redis connection failed | `/health` returns 503 | Check `REDIS_HOST` and `REDIS_PORT` |
| Tests not running | Jest can't find tests | Check `testMatch` patterns |
| File access denied | 400 error from API | Add directory to `ALLOWED_DIRS` |

---

### Configuration Validation

**Validate package.json:**

```bash
npm install  # Will fail if package.json is invalid
```

**Validate YAML files:**

```bash
# Install yamllint
pip install yamllint

# Validate
yamllint capabilities.yml
yamllint config/models.yml
yamllint config/presets.yml
```

**Validate workflow:**

```bash
# GitHub CLI
gh workflow view auto-build.yml
```

---

## Related Documentation

- [MASTER_RUNBOOK.md](../MASTER_RUNBOOK.md) - Implementation workflow
- [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) - Pre-deployment checks
- [CONTRACTS/api_contract.md](../CONTRACTS/api_contract.md) - API endpoints
- [PROJECT_STATE.md](../PROJECT_STATE.md) - Current project status

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-25 | Initial comprehensive reference |

---

**Last Updated:** 2025-01-25  
**Maintained By:** Code Cloud Agents Team
