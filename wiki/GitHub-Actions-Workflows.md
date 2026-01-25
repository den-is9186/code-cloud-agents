# GitHub Actions Workflows

> **Comprehensive guide to the Auto-Build workflow, task queue system, and GitHub Actions automation in the Code Cloud Agents project.**

---

## Table of Contents

1. [Overview](#overview)
2. [Auto-Build Workflow](#auto-build-workflow)
3. [Triggering Workflows](#triggering-workflows)
4. [Task Queue System](#task-queue-system)
5. [Workflow Configuration](#workflow-configuration)
6. [Adding Tasks to Queue](#adding-tasks-to-queue)
7. [Workflow Secrets Setup](#workflow-secrets-setup)
8. [Build Summary & Logs](#build-summary--logs)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

The **Auto Build with Aider** workflow automates code generation and modifications using AI models (Claude/GPT) through the [Aider](https://aider.chat) tool. It supports:

- 🤖 **AI-powered code generation** with multiple model options
- 📋 **Task queue processing** for automated batch operations
- ⏰ **Scheduled execution** every 3 minutes
- 🎯 **Manual triggering** with custom tasks
- 🔄 **Automatic commits and pushes** to the main branch

**Key Features:**
- Zero-touch automation for routine development tasks
- Queue-based task management
- Flexible model selection (Claude Sonnet, Opus, GPT-4)
- Built-in error handling and recovery
- Comprehensive build summaries

---

## Auto-Build Workflow

### Workflow File

**Location:** `.github/workflows/auto-build.yml`

### Workflow Architecture

```
┌─────────────────┐
│  Trigger Event  │
│  (Manual/Cron)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Queue    │◄─── Scheduled runs check task-queue.txt
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Setup Python   │
│  Install Aider  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Run Auto-Build │◄─── Execute task with AI model
│  (Aider + AI)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Commit & Push  │◄─── Auto-commit changes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Summary   │◄─── Generate report
└─────────────────┘
```

### Execution Flow

1. **Checkout Repository** - Fetches the latest code from `main` branch
2. **Configure Git** - Sets up Git user credentials
3. **Check Queue** - Determines if there are pending tasks (for scheduled runs)
4. **Setup Python** - Installs Python 3.11
5. **Install Aider** - Installs the Aider AI coding assistant
6. **Run Auto-Build** - Executes the task using the specified AI model
7. **Push Changes** - Commits and pushes generated code
8. **Build Summary** - Creates a summary report

---

## Triggering Workflows

### 1. Scheduled Execution (Automatic)

The workflow runs **every 3 minutes** via cron schedule:

```yaml
schedule:
  - cron: '*/3 * * * *'
```

**Behavior:**
- Checks `task-queue.txt` for pending tasks
- Processes the first non-commented task
- Exits gracefully if queue is empty
- Removes processed task from queue

**Example Log:**
```
📋 3 Tasks in Queue
📥 Task aus Queue geholt: Add user authentication module
🚀 Auto-Build gestartet
```

### 2. Manual Execution (On-Demand)

Trigger the workflow manually from the GitHub Actions UI.

**Steps:**
1. Go to **Actions** tab in GitHub
2. Select **Auto Build with Aider** workflow
3. Click **Run workflow**
4. Fill in optional parameters:
   - **Task**: Custom task description (overrides queue)
   - **Model**: AI model to use

**Available Models:**
- `claude-sonnet-4-5-20250929` (default, fastest)
- `claude-opus-4-5` (most capable)
- `gpt-4` (OpenAI alternative)

**Manual Trigger YAML:**
```yaml
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
```

### Trigger Decision Logic

```bash
if [ -n "${{ github.event.inputs.task }}" ]; then
  # Manual task provided → use it
  TASK="${{ github.event.inputs.task }}"
else
  # Use queue (scheduled OR manual without task input)
  TASK=$(grep -v '^#' task-queue.txt | grep -v '^$' | head -n 1)
fi
```

---

## Task Queue System

### Queue File Structure

**Location:** `task-queue.txt`

**Format:**
```
# Task Queue
# Eine Task pro Zeile
# GitHub Actions arbeitet alle 4h die nächste Task ab
# Queue processing started - Sun Jan 25 21:06:34 CET 2026

Implement user authentication with JWT tokens
Add API rate limiting middleware
Create database migration for new users table
Update documentation for API endpoints
```

**Rules:**
- One task per line
- Lines starting with `#` are comments (ignored)
- Empty lines are ignored
- First non-comment line is processed next
- Tasks are removed after successful processing

### Queue Processing Logic

```bash
# Get first non-commented task
TASK=$(grep -v '^#' task-queue.txt | grep -v '^$' | head -n 1)

if [ -z "$TASK" ]; then
  echo "ℹ️  Queue ist leer, nichts zu tun"
  exit 0
fi

# After successful build, remove processed task
grep -v '^#' task-queue.txt | grep -v '^$' | tail -n +2 > task-queue.tmp
grep '^#' task-queue.txt > task-queue.new
cat task-queue.tmp >> task-queue.new
mv task-queue.new task-queue.txt
```

### Queue States

| State | Description | Action |
|-------|-------------|--------|
| **Empty** | No tasks in queue | Workflow exits gracefully |
| **Pending** | Tasks waiting | Processes first task |
| **Processing** | Task being executed | Aider runs with AI model |
| **Completed** | Task finished | Task removed, changes committed |

---

## Workflow Configuration

### Full Workflow YAML

```yaml
name: Auto Build with Aider

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
    - cron: '*/3 * * * *'

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    permissions:
      contents: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          ref: main
          fetch-depth: 0

      - name: Configure Git
        run: |
          git config user.name "den-is9186"
          git config user.email "den-is9186@users.noreply.github.com"

      # ... (rest of workflow)
```

### Key Configuration Parameters

#### Job Settings

```yaml
runs-on: ubuntu-latest        # Use GitHub-hosted runner
timeout-minutes: 60           # Max execution time: 1 hour
permissions:
  contents: write             # Allow commits/pushes
```

#### Cron Schedule

```yaml
schedule:
  - cron: '*/3 * * * *'       # Every 3 minutes
```

**Cron Syntax:**
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

**Common Schedules:**
- `*/3 * * * *` - Every 3 minutes
- `0 */4 * * *` - Every 4 hours
- `0 9,17 * * 1-5` - 9 AM and 5 PM, weekdays only
- `0 0 * * *` - Daily at midnight

#### Aider Execution

```bash
aider \
  --yes \                     # Auto-confirm prompts
  --auto-commits \            # Automatically commit changes
  --model "$MODEL" \          # AI model selection
  --message "$TASK" \         # Task description
  || {
    echo "❌ Aider Build fehlgeschlagen"
    exit 1
  }
```

**Aider Flags:**
- `--yes`: Skip confirmation prompts (required for CI)
- `--auto-commits`: Commit changes after each edit
- `--model`: Specify AI model
- `--message`: Task/instruction for the AI

---

## Adding Tasks to Queue

### Method 1: Using queue-task.sh Script

**Script Location:** `queue-task.sh`

**Usage:**
```bash
./queue-task.sh "Your task description"
```

**Example:**
```bash
./queue-task.sh "Add user authentication with JWT"
```

**Output:**
```
✅ Task added to queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task: Add user authentication with JWT
Position: #3 in queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current queue:
     1  # Task Queue
     2  # Eine Task pro Zeile
     3  # GitHub Actions arbeitet alle 4h die nächste Task ab
     4  # Queue processing started - Sun Jan 25 21:06:34 CET 2026
     5  Implement database migrations
     6  Add API documentation
     7  Add user authentication with JWT
```

### Method 2: Direct File Edit

**Edit `task-queue.txt`:**
```bash
# Open in editor
nano task-queue.txt

# Or append directly
echo "Create admin dashboard" >> task-queue.txt
```

### Method 3: GitHub Web Interface

1. Go to repository on GitHub
2. Navigate to `task-queue.txt`
3. Click **Edit** (pencil icon)
4. Add your task on a new line
5. Commit changes

### Task Format Best Practices

✅ **Good Task Descriptions:**
```
Add JWT authentication to user login endpoint
Create database schema for orders table
Implement rate limiting with Redis
Update API documentation for v2 endpoints
Fix memory leak in webhook handler
```

❌ **Poor Task Descriptions:**
```
fix stuff
update things
make it better
do the thing
```

**Tips:**
- Be specific and actionable
- Include context (what, where, why)
- Reference specific files/modules when needed
- Keep tasks focused (one feature/fix per task)

---

## Workflow Secrets Setup

### Required Secrets

#### 1. ANTHROPIC_API_KEY (Required)

**What:** API key for Claude models (Anthropic)

**How to Get:**
1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Copy the key (starts with `sk-ant-...`)

**How to Set:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your API key
5. Click **Add secret**

#### 2. GITHUB_TOKEN (Automatic)

**What:** Token for Git operations (commit, push)

**How to Get:**
- Automatically provided by GitHub Actions
- No setup required

**Permissions:**
```yaml
permissions:
  contents: write    # Allows commits and pushes
```

### Optional Secrets

#### OPENAI_API_KEY

**Required if using:** `gpt-4` model

**How to Get:**
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add as repository secret: `OPENAI_API_KEY`

### Testing Secrets

**Verify secret is set:**
```yaml
- name: Test Secret
  run: |
    if [ -z "${{ secrets.ANTHROPIC_API_KEY }}" ]; then
      echo "❌ ANTHROPIC_API_KEY not set"
      exit 1
    else
      echo "✅ ANTHROPIC_API_KEY is configured"
    fi
```

### Security Best Practices

✅ **DO:**
- Use GitHub Secrets (never commit keys)
- Rotate keys regularly
- Use environment-specific keys (dev/prod)
- Monitor API usage

❌ **DON'T:**
- Commit API keys to repository
- Share keys in logs or output
- Use production keys in testing
- Print secret values in workflows

---

## Build Summary & Logs

### Viewing Workflow Runs

1. Go to **Actions** tab
2. Select **Auto Build with Aider** workflow
3. Click on a specific run

### Build Summary Format

```markdown
### 🏗️ Build Summary

**Status:** success
**Task:** Add user authentication
**Model:** claude-sonnet-4-5-20250929
**Time:** Mon Jan 27 14:23:45 UTC 2025

**Recent Commits:**
abc1234 feat: add JWT authentication
def5678 chore: update dependencies
ghi9012 docs: update API documentation
```

### Log Levels

**Informational (ℹ️):**
```
ℹ️  Queue ist leer, nichts zu tun
ℹ️  Keine task-queue.txt gefunden
ℹ️  Keine Änderungen zu pushen
```

**Success (✅):**
```
✅ Build abgeschlossen
✅ Änderungen gepusht
✅ Task added to queue
```

**Processing (📋 🚀 📥):**
```
📋 3 Tasks in Queue
🚀 Auto-Build gestartet
📥 Task aus Queue geholt: Add authentication
```

**Error (❌):**
```
❌ Aider Build fehlgeschlagen
❌ Error: Task description required
```

### Downloading Logs

**Via GitHub UI:**
1. Open workflow run
2. Click **⋮** (three dots)
3. Select **Download log archive**

**Via GitHub CLI:**
```bash
# Install GitHub CLI
gh auth login

# List recent runs
gh run list --workflow=auto-build.yml

# View specific run logs
gh run view <run-id> --log

# Download logs
gh run download <run-id>
```

### Job Artifacts

**View Changes:**
```bash
# In workflow logs, see:
git log --oneline -5

# Shows commits made during build
```

**Check Diff:**
```bash
git diff HEAD~1 HEAD    # Compare with previous commit
```

---

## Troubleshooting

### Common Issues

#### 1. Queue Not Processing

**Symptom:**
```
ℹ️  Queue ist leer, nichts zu tun
```

**Causes:**
- Empty `task-queue.txt`
- All lines are comments (`#`)
- Only blank lines

**Solution:**
```bash
# Check queue file
cat task-queue.txt

# Add a task
echo "Test task" >> task-queue.txt

# Verify non-comment lines
grep -v '^#' task-queue.txt | grep -v '^$'
```

#### 2. API Key Missing

**Symptom:**
```
❌ Aider Build fehlgeschlagen
Error: ANTHROPIC_API_KEY not set
```

**Solution:**
1. Verify secret is set: **Settings** → **Secrets** → **ANTHROPIC_API_KEY**
2. Check secret name matches exactly (case-sensitive)
3. Re-create secret if needed

#### 3. Git Push Failure

**Symptom:**
```
! [rejected]        main -> main (fetch first)
error: failed to push some refs
```

**Solution:**
- Workflow includes `git pull --rebase` before push
- If persistent, check branch protection rules
- Ensure workflow has `contents: write` permission

#### 4. Aider Installation Fails

**Symptom:**
```
ERROR: Could not find a version that satisfies the requirement aider-chat
```

**Solution:**
```yaml
- name: Install Aider with Retry
  run: |
    pip install --upgrade pip
    pip install aider-chat || pip install aider-chat --no-cache-dir
```

#### 5. Workflow Timeout

**Symptom:**
```
Error: The operation was canceled.
(after 60 minutes)
```

**Solution:**
- Break large tasks into smaller ones
- Increase timeout:
```yaml
timeout-minutes: 120    # 2 hours
```

#### 6. Model API Rate Limits

**Symptom:**
```
Error: Rate limit exceeded (429)
```

**Solution:**
- Reduce cron frequency
- Use lower-tier model for simple tasks
- Monitor API usage dashboard

### Debug Mode

**Enable verbose logging:**

```yaml
- name: Run Auto-Build
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    DEBUG: 1
  run: |
    set -x    # Enable bash debug output
    
    # Your build commands...
    aider --verbose \
      --yes \
      --auto-commits \
      --model "$MODEL" \
      --message "$TASK"
```

### Testing Locally

**Simulate workflow locally:**

```bash
# Set API key
export ANTHROPIC_API_KEY="your-key"

# Run Aider command
aider \
  --yes \
  --auto-commits \
  --model claude-sonnet-4-5-20250929 \
  --message "Add test feature"

# Test queue script
./queue-task.sh "Test task"
```

### Getting Help

**Check Aider logs:**
```bash
# View Aider's debug output
aider --verbose --help

# Check version
aider --version
```

**GitHub Actions Debugging:**
- Enable step debugging: Re-run jobs with **Enable debug logging**
- Add debugging steps:
```yaml
- name: Debug Environment
  run: |
    echo "Working directory: $(pwd)"
    echo "Queue file exists: $([ -f task-queue.txt ] && echo yes || echo no)"
    echo "Git status:"
    git status
```

---

## Best Practices

### 1. Task Management

✅ **DO:**
- Keep tasks atomic and focused
- Use descriptive task names
- Prioritize tasks in queue order
- Review auto-generated code

❌ **DON'T:**
- Queue vague tasks
- Mix multiple features in one task
- Assume all outputs are perfect
- Skip code review of AI changes

### 2. Queue Organization

**Structured Queue Example:**
```
# Task Queue
# High Priority
# ─────────────────────────────────────
Fix critical security vulnerability in auth module

# Feature Development
# ─────────────────────────────────────
Add user profile editing
Implement email notifications
Create admin dashboard

# Technical Debt
# ─────────────────────────────────────
Refactor database queries for performance
Update deprecated dependencies
Add unit tests for payment module
```

### 3. Model Selection Strategy

| Model | Best For | Cost | Speed |
|-------|----------|------|-------|
| `claude-sonnet-4-5` | Routine tasks, refactoring | Low | Fast |
| `claude-opus-4-5` | Complex logic, architecture | High | Slow |
| `gpt-4` | Specific use cases | Medium | Medium |

**Decision Tree:**
```
Is task complex/architectural?
  ├─ Yes → Use claude-opus-4-5
  └─ No → Use claude-sonnet-4-5 (default)

Need specific GPT-4 features?
  └─ Yes → Use gpt-4
```

### 4. Monitoring & Maintenance

**Weekly Checklist:**
- [ ] Review workflow run history
- [ ] Check API usage/costs
- [ ] Clear processed tasks from queue
- [ ] Update dependencies (Python, Aider)
- [ ] Review auto-generated commits

**Monthly Checklist:**
- [ ] Rotate API keys
- [ ] Optimize cron schedule
- [ ] Archive old workflow logs
- [ ] Review and refine task patterns

### 5. Security

**Protect Sensitive Data:**
```yaml
# ❌ NEVER DO THIS
- name: Debug
  run: echo ${{ secrets.ANTHROPIC_API_KEY }}

# ✅ DO THIS
- name: Check Secret
  run: |
    if [ -z "${{ secrets.ANTHROPIC_API_KEY }}" ]; then
      echo "Secret not set"
    else
      echo "Secret configured (value hidden)"
    fi
```

**Branch Protection:**
- Enable branch protection for `main`
- Require pull request reviews (for critical changes)
- Consider separate branch for auto-builds

### 6. Cost Optimization

**Reduce API Costs:**
1. **Adjust Schedule:** Change from every 3 minutes to less frequent
   ```yaml
   - cron: '0 */6 * * *'    # Every 6 hours
   ```

2. **Use Cheaper Models:** Default to Sonnet for most tasks

3. **Batch Tasks:** Group related tasks to reduce API calls

4. **Set Limits:** Configure Aider token limits
   ```bash
   aider --message "$TASK" --max-tokens 4096
   ```

### 7. Code Quality

**Post-Build Validation:**
```yaml
- name: Run Tests
  run: |
    npm test || echo "Tests failed - review needed"

- name: Lint Code
  run: |
    npm run lint || echo "Linting issues - review needed"
```

**Review Process:**
1. Let workflow complete
2. Review generated commits
3. Run tests locally
4. Create PR if changes need review
5. Merge or revert as needed

### 8. Documentation

**Keep Documentation Updated:**
- Document custom workflows in wiki
- Comment complex task patterns
- Maintain changelog of workflow updates
- Share learnings with team

---

## Advanced Usage

### Custom Workflow Triggers

**Trigger on PR:**
```yaml
on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - 'task-queue.txt'
```

**Trigger on specific branches:**
```yaml
on:
  push:
    branches:
      - develop
      - feature/*
```

### Multiple AI Models per Task

**Model fallback strategy:**
```bash
MODELS=("claude-sonnet-4-5-20250929" "gpt-4")

for MODEL in "${MODELS[@]}"; do
  aider --model "$MODEL" --message "$TASK" && break
done
```

### Task Dependencies

**Sequential task execution:**
```bash
# task-queue.txt
TASK_GROUP_START: User Authentication
Add JWT token generation
Add login endpoint
Add token validation middleware
Update authentication docs
TASK_GROUP_END
```

### Notifications

**Add Slack notifications:**
```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Build ${{ job.status }}: ${{ github.event.inputs.task }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Quick Reference

### Common Commands

```bash
# Add task to queue
./queue-task.sh "Task description"

# View queue
cat task-queue.txt

# Count pending tasks
grep -v '^#' task-queue.txt | grep -v '^$' | wc -l

# Clear queue
echo "# Task Queue" > task-queue.txt

# Manual workflow trigger (GitHub CLI)
gh workflow run auto-build.yml -f task="Custom task" -f model="claude-opus-4-5"

# View latest run
gh run list --workflow=auto-build.yml --limit 1

# Watch workflow in real-time
gh run watch
```

### Workflow URLs

- **Actions:** `https://github.com/{owner}/{repo}/actions`
- **Workflow File:** `.github/workflows/auto-build.yml`
- **Queue File:** `task-queue.txt`
- **Queue Script:** `queue-task.sh`

---

## Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Aider Documentation](https://aider.chat/docs/)
- [Anthropic API Docs](https://docs.anthropic.com/)

### Related Wiki Pages
- [Project Architecture](./Project-Architecture.md)
- [Development Workflow](./Development-Workflow.md)
- [API Documentation](./API-Documentation.md)

### Support
- Report workflow issues: GitHub Issues
- Aider support: [GitHub Discussions](https://github.com/paul-gauthier/aider/discussions)
- Team chat: Internal Slack #devops

---

## Changelog

| Date | Change | Version |
|------|--------|---------|
| 2025-01-27 | Initial wiki page created | 1.0.0 |
| 2025-01-25 | Auto-build workflow deployed | 0.9.0 |

---

**Last Updated:** January 27, 2025  
**Maintained by:** DevOps Team  
**Status:** ✅ Active
