# Auto-Build System

> **Purpose:** Autonomous code generation system using GitHub Actions and Aider AI

---

## Overview

The Auto-Build System enables **autonomous code generation** through:
- **Task Queue**: Submit tasks that are processed automatically
- **GitHub Actions**: Workflow orchestration
- **Aider AI**: Code generation with Claude Sonnet 4
- **Automated Commits**: Changes are automatically committed and pushed

**Key Benefit:** Submit a task and let AI handle the implementation.

---

## Architecture

```
┌─────────────────────┐
│   User/Developer    │
│                     │
│  Submit Task via:   │
│  - GitHub UI        │
│  - queue-task.sh    │
│  - Manual trigger   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Task Queue        │
│  (task-queue.txt)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub Actions     │
│  (Every 3 minutes)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Aider AI          │
│  (Claude Sonnet 4)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Code Changes      │
│  (Auto-committed)   │
└─────────────────────┘
```

---

## Components

### 1. GitHub Actions Workflow

**File:** `.github/workflows/auto-build.yml`

**Triggers:**
- **Schedule**: Every 3 minutes (cron: `*/3 * * * *`)
- **Manual**: Workflow dispatch from GitHub UI
- **On-Demand**: Via GitHub CLI or API

**Permissions:**
```yaml
permissions:
  contents: write  # Required to push commits
```

**Timeout:** 60 minutes per workflow run

### 2. Task Queue

**File:** `task-queue.txt`

**Format:**
```txt
# Comments start with #
# Empty lines are ignored

Implement user authentication with JWT
Add rate limiting to API endpoints
Create health check endpoint with DB status
```

**Rules:**
- One task per line
- Lines starting with `#` are comments
- Empty lines are ignored
- First non-comment line is processed next

### 3. Queue Management Script

**File:** `queue-task.sh`

**Usage:**
```bash
# Add a task to the queue
./queue-task.sh "Create user registration endpoint"

# Output:
# ✅ Task added to queue
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Task: Create user registration endpoint
# Position: #3 in queue
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. Aider Integration

**Configuration:**
- **Model**: Claude Sonnet 4 (`claude-sonnet-4-5-20250929`)
- **Mode**: Auto-commit enabled (`--yes --auto-commits`)
- **API Key**: Stored in GitHub Secrets as `ANTHROPIC_API_KEY`

**Aider Flags:**
```bash
aider \
  --yes \              # Auto-approve changes
  --auto-commits \     # Auto-commit after changes
  --model "$MODEL" \   # AI model to use
  --message "$TASK"    # Task description
```

---

## Workflow Details

### Step 1: Checkout Repository

```yaml
- name: Checkout Repository
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    ref: main
    fetch-depth: 0  # Full history for git operations
```

**Purpose:** Get latest code from `main` branch

### Step 2: Configure Git

```yaml
- name: Configure Git
  run: |
    git config user.name "den-is9186"
    git config user.email "den-is9186@users.noreply.github.com"
```

**Purpose:** Set commit author for automated commits

### Step 3: Check Queue

```yaml
- name: Check Queue
  id: queue_check
  run: |
    if [ "${{ github.event_name }}" != "workflow_dispatch" ]; then
      if [ ! -f "task-queue.txt" ]; then
        echo "ℹ️  Keine task-queue.txt gefunden"
        exit 0
      fi

      TASKS=$(grep -v '^#' task-queue.txt | grep -v '^$' | wc -l)
      if [ "$TASKS" -eq 0 ]; then
        echo "ℹ️  Queue ist leer, nichts zu tun"
        exit 0
      fi

      echo "📋 $TASKS Tasks in Queue"
    fi
```

**Purpose:** 
- Skip if queue is empty (scheduled runs only)
- Count pending tasks
- Manual triggers bypass queue check

### Step 4: Setup Python & Aider

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

**Purpose:** Install Aider CLI tool

### Step 5: Run Auto-Build

```yaml
- name: Run Auto-Build
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    # Determine task source
    if [ -n "${{ github.event.inputs.task }}" ]; then
      TASK="${{ github.event.inputs.task }}"
      echo "📝 Manual task: $TASK"
    else
      # Get first task from queue
      TASK=$(grep -v '^#' task-queue.txt | grep -v '^$' | head -n 1)
      if [ -z "$TASK" ]; then
        echo "ℹ️  Queue ist leer, nichts zu tun"
        exit 0
      fi
      echo "📥 Task aus Queue geholt: $TASK"
    fi

    MODEL="${{ github.event.inputs.model || 'claude-sonnet-4-5-20250929' }}"

    # Execute Aider
    aider \
      --yes \
      --auto-commits \
      --model "$MODEL" \
      --message "$TASK"
```

**Purpose:**
- Select task (manual input or queue)
- Choose AI model
- Execute Aider with task

**Task Selection Logic:**
1. If manual trigger with task → Use that task
2. If queue trigger → Use first task from queue
3. If queue empty → Exit gracefully

### Step 6: Update Queue

```yaml
# Bei Queue-Processing: Task aus Queue entfernen
if [ -z "${{ github.event.inputs.task }}" ]; then
  echo "🗑️  Entferne Task aus Queue"
  # Remove first non-comment line
  grep -v '^#' task-queue.txt | grep -v '^$' | tail -n +2 > task-queue.tmp
  grep '^#' task-queue.txt > task-queue.new
  cat task-queue.tmp >> task-queue.new
  mv task-queue.new task-queue.txt
  rm -f task-queue.tmp

  git add task-queue.txt
  git commit -m "chore: processed task from queue" || true
fi
```

**Purpose:**
- Remove completed task from queue
- Preserve comments
- Commit updated queue

**Algorithm:**
1. Extract all non-comment, non-empty lines
2. Remove first line (completed task)
3. Preserve comment lines
4. Reconstruct file
5. Commit changes

### Step 7: Push Changes

```yaml
- name: Push Changes
  run: |
    git pull --rebase origin main || true

    if git diff --quiet && git diff --cached --quiet; then
      echo "ℹ️  Keine Änderungen zu pushen"
    else
      git push origin main
      echo "✅ Änderungen gepusht"
    fi
```

**Purpose:**
- Sync with remote (rebase strategy)
- Push if changes exist
- Skip if no changes

### Step 8: Build Summary

```yaml
- name: Build Summary
  if: always()
  run: |
    echo "### 🏗️ Build Summary" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "**Status:** ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
    echo "**Task:** ${{ github.event.inputs.task || 'Scheduled build' }}" >> $GITHUB_STEP_SUMMARY
    echo "**Model:** ${{ github.event.inputs.model || 'claude-sonnet-4-5-20250929' }}" >> $GITHUB_STEP_SUMMARY
    echo "**Time:** $(date)" >> $GITHUB_STEP_SUMMARY
```

**Purpose:** Create GitHub Actions summary with build details

---

## Usage Scenarios

### Scenario 1: Manual Task (Immediate)

**From GitHub UI:**
1. Go to repository → Actions
2. Select "Auto Build with Aider"
3. Click "Run workflow"
4. Enter task description
5. Select model (optional)
6. Click "Run workflow"

**From CLI:**
```bash
gh workflow run auto-build.yml \
  -f task="Create health check endpoint" \
  -f model="claude-sonnet-4-5-20250929"
```

**Behavior:**
- Executes immediately
- Uses provided task
- Does not affect queue

### Scenario 2: Queue-Based (Automated)

**Add to Queue:**
```bash
./queue-task.sh "Implement rate limiting"
```

**Behavior:**
- Task added to `task-queue.txt`
- Workflow picks it up in next 3-minute cycle
- Task removed from queue after processing

### Scenario 3: Multiple Queued Tasks

**Add Multiple:**
```bash
./queue-task.sh "Add user authentication"
./queue-task.sh "Create API documentation"
./queue-task.sh "Implement error handling"
```

**Behavior:**
- Tasks processed sequentially (one per workflow run)
- Each task gets its own workflow run
- ~3 minutes between tasks

### Scenario 4: Emergency Override

**Pause Queue:**
```bash
# Comment out all tasks
sed -i 's/^/# /' task-queue.txt
git add task-queue.txt
git commit -m "pause: queue processing paused"
git push
```

**Resume Queue:**
```bash
# Uncomment tasks
sed -i 's/^# //' task-queue.txt
git add task-queue.txt
git commit -m "resume: queue processing resumed"
git push
```

---

## Task Writing Best Practices

### ✅ Good Task Descriptions

**Specific:**
```
Create a GET /api/users endpoint that returns all users from the database with pagination support (limit=10, offset=0 defaults)
```

**Includes Context:**
```
Add JWT authentication middleware to protect all /api/* routes. Use the existing JWT secret from .env and return 401 for invalid tokens.
```

**References Standards:**
```
Implement rate limiting for API endpoints according to PRODUCTION_CHECKLIST.md requirements (100 requests per minute per IP)
```

### ❌ Poor Task Descriptions

**Too Vague:**
```
Add authentication
```

**Missing Context:**
```
Create endpoint
```

**Ambiguous:**
```
Fix the API
```

---

## Monitoring and Debugging

### Check Workflow Status

**Via GitHub UI:**
```
Repository → Actions → Auto Build with Aider
```

**Via CLI:**
```bash
# List recent workflow runs
gh run list --workflow=auto-build.yml --limit 5

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

### Check Queue Status

```bash
# View current queue
cat task-queue.txt

# Count pending tasks
grep -v '^#' task-queue.txt | grep -v '^$' | wc -l
```

### Common Issues

#### Issue: Workflow Not Triggering

**Causes:**
- Queue is empty
- Workflow file syntax error
- GitHub Actions disabled

**Debug:**
```bash
# Check queue
cat task-queue.txt

# Validate workflow syntax
gh workflow view auto-build.yml
```

#### Issue: Aider Fails

**Causes:**
- Invalid API key
- Task too complex
- API rate limit exceeded

**Debug:**
```bash
# Check workflow logs
gh run view <run-id> --log

# Look for Aider errors
gh run view <run-id> --log | grep -i error
```

#### Issue: Commits Not Pushed

**Causes:**
- No changes made by Aider
- Git conflicts
- Permission issues

**Debug:**
```bash
# Check if changes were made
gh run view <run-id> --log | grep "Keine Änderungen"

# Check for conflicts
gh run view <run-id> --log | grep -i conflict
```

---

## Performance Considerations

### Workflow Runtime

**Typical Times:**
- Queue check: ~5 seconds
- Aider execution: 2-15 minutes
- Git operations: ~10 seconds

**Total:** 2-20 minutes per task

### Queue Processing Rate

**Schedule:** Every 3 minutes
**Throughput:** ~20 tasks/hour (if each takes ~3 minutes)

**Adjust Schedule:**
```yaml
# Faster (every 1 minute)
- cron: '*/1 * * * *'

# Slower (every 10 minutes)
- cron: '*/10 * * * *'
```

### Cost Optimization

**API Costs:**
- Claude Sonnet 4: ~$0.10-1.00 per task
- Monitor usage in Anthropic dashboard

**GitHub Actions:**
- Free for public repos
- 2000 minutes/month for private repos (free tier)

---

## Security Best Practices

### Secret Management

**Store API Key:**
```
Repository Settings → Secrets and variables → Actions → New repository secret

Name: ANTHROPIC_API_KEY
Value: sk-ant-api03-...
```

**Never:**
❌ Commit API keys to code
❌ Log API keys in workflow
❌ Share secrets in PR comments

### Task Validation

**Sanitize Inputs:**
```bash
# Reject empty tasks
if [ -z "$TASK" ]; then
  echo "❌ Task cannot be empty"
  exit 1
fi

# Reject tasks with dangerous commands
if echo "$TASK" | grep -q "rm -rf"; then
  echo "❌ Dangerous task rejected"
  exit 1
fi
```

### Code Review

**Even with AI:**
- Review all generated code
- Check for security vulnerabilities
- Validate against contracts
- Run tests before merge

---

## Advanced Features

### Custom Models

**Add New Model:**
```yaml
options:
  - claude-sonnet-4-5-20250929
  - claude-opus-4-5
  - gpt-4
  - gpt-4-turbo  # New option
```

### Conditional Workflows

**Skip on [skip ci]:**
```yaml
on:
  schedule:
    - cron: '*/3 * * * *'
  workflow_dispatch:
  
jobs:
  build:
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
```

### Parallel Task Processing

**Not Recommended:** Can cause merge conflicts

**Alternative:** Use multiple branches
```bash
# Branch per task
./queue-task.sh "Task 1" > /dev/null
git checkout -b auto/task-1
# Process task on this branch
```

### Notifications

**Slack Notifications:**
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

## Troubleshooting

### Debug Mode

**Enable Verbose Logging:**
```yaml
- name: Run Auto-Build
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    DEBUG: true
  run: |
    set -x  # Enable bash debug mode
    aider --verbose --message "$TASK"
```

### Test Locally

**Simulate Workflow:**
```bash
# Install Aider locally
pip install aider-chat

# Set API key
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Test task
aider \
  --yes \
  --auto-commits \
  --model claude-sonnet-4-5-20250929 \
  --message "Create a simple hello world function"
```

### Rollback Changes

**Revert Last Commit:**
```bash
git revert HEAD
git push origin main
```

**Revert to Specific Commit:**
```bash
git reset --hard <commit-hash>
git push --force origin main
```

---

## Best Practices Summary

### ✅ DO:
- Write clear, specific task descriptions
- Review all generated code
- Monitor workflow runs
- Keep queue size reasonable (<10 tasks)
- Test changes after processing
- Use meaningful commit messages

### ❌ DON'T:
- Queue overly complex tasks
- Skip code review
- Ignore failed workflows
- Commit secrets
- Run untested code in production
- Process tasks faster than you can review

---

## Future Enhancements

**Planned:**
- [ ] Task priority system
- [ ] Parallel processing (safe mode)
- [ ] Web UI for queue management
- [ ] Automatic testing before commit
- [ ] Task retry logic
- [ ] Cost tracking dashboard

---

## Related Documentation

- [capabilities.yml](../capabilities.yml) - Auto-build feature registration
- [MASTER_RUNBOOK.md](../MASTER_RUNBOOK.md) - Overall development workflow
- [Monitoring and Logging](./Monitoring-And-Logging.md) - Workflow monitoring
- [ops/POLICY.md](../ops/POLICY.md) - Branching and merge policies
