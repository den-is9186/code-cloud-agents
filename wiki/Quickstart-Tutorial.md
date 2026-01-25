# Quickstart Tutorial

**⏱️ Time to first build: 5-10 minutes**

Get your first AI-powered autonomous build running in minutes. This tutorial takes you from zero to watching Aider + Claude Sonnet 4 write code for you automatically.

---

## ✅ Prerequisites Check

Before you start, verify you have:

```bash
# Check Node.js (v16+)
node --version

# Check npm
npm --version

# Check Python (v3.11+)
python3 --version

# Check git
git --version
```

You'll also need:
- A GitHub account
- An Anthropic API key ([get one here](https://console.anthropic.com/))
- 5 minutes of your time

---

## 🚀 Quick Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/den-is9186/code-cloud-agents.git
cd code-cloud-agents
```

**Expected output:**
```
Cloning into 'code-cloud-agents'...
remote: Enumerating objects: 150, done.
remote: Counting objects: 100% (150/150), done.
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 45 packages, and audited 46 packages in 3s
found 0 vulnerabilities
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
nano .env  # or use your favorite editor
```

Update this line in `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-ACTUAL-KEY-HERE
```

**💡 Tip:** Keep your API key secret! Never commit it to git.

---

## 🎯 Your First Build

### Quick Test: Manual Build

Let's trigger a simple build manually to see the system in action.

#### Step 1: Go to GitHub Actions

Navigate to your repository on GitHub:
```
https://github.com/YOUR-USERNAME/code-cloud-agents/actions
```

#### Step 2: Trigger the Workflow

1. Click on **"Auto Build with Aider"** workflow (left sidebar)
2. Click **"Run workflow"** button (right side)
3. Enter a simple task:
   ```
   Add a comment to the README explaining what this project does
   ```
4. Keep the default model: `claude-sonnet-4-5-20250929`
5. Click **"Run workflow"** (green button)

**What you should see:**

```
┌─────────────────────────────────────┐
│ ✓ Auto Build with Aider            │
│   Running...                         │
│                                      │
│   ○ Checkout Repository             │
│   ○ Configure Git                   │
│   ○ Setup Python                    │
│   ○ Install Aider                   │
│   → Run Auto-Build                  │
└─────────────────────────────────────┘
```

#### Step 3: Watch the Magic Happen

Click on the running workflow to see live logs. You'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Auto-Build gestartet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Task: Add a comment to the README explaining what this project does
🤖 Model: claude-sonnet-4-5-20250929
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aider v0.x.x
Model: anthropic/claude-sonnet-4-5-20250929
...
✅ Build abgeschlossen
✅ Änderungen gepusht
```

#### Step 4: Verify the Results

After the workflow completes (1-3 minutes), check your repository:

```bash
# Pull the changes Aider made
git pull origin main

# See what changed
git log --oneline -1
git show HEAD
```

**Expected output:**
```
abc1234 feat: add explanatory comment to README

diff --git a/README.md b/README.md
+ <!-- This project implements an autonomous code generation... -->
```

**🎉 Congratulations!** You just ran your first AI-powered autonomous build!

---

## 📥 Using the Task Queue

Instead of triggering builds manually, you can use the task queue for automated, scheduled builds.

### Step 1: Add Tasks to the Queue

```bash
# Add your first task
./queue-task.sh "Create a new test file for the health endpoint"

# Add more tasks
./queue-task.sh "Add a comment to explain the Express setup"
./queue-task.sh "Update the .gitignore to exclude coverage reports"
```

**Expected output:**
```
✅ Task added to queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task: Create a new test file for the health endpoint
Position: #1 in queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current queue:
     1  Create a new test file for the health endpoint
```

### Step 2: Check Your Queue

```bash
cat task-queue.txt
```

**What you'll see:**
```
# Code Cloud Agents - Task Queue
# Tasks are processed automatically every 3 minutes
Create a new test file for the health endpoint
Add a comment to explain the Express setup
Update the .gitignore to exclude coverage reports
```

### Step 3: Commit and Push the Queue

```bash
git add task-queue.txt
git commit -m "chore: add tasks to queue"
git push origin main
```

### Step 4: Watch the Automated Builds

The scheduled workflow runs **every 3 minutes** and automatically:

1. Checks the queue
2. Takes the first task
3. Runs Aider to complete it
4. Commits and pushes the changes
5. Removes the task from the queue
6. Repeats for the next task in 3 minutes

**Monitor progress:**

```
┌──────────────────────────────────────────┐
│ GitHub Actions Status:                   │
│                                           │
│ ○ 14:00 - Processing task #1             │
│ ✓ 14:03 - Task #1 complete, pushed       │
│ ○ 14:06 - Processing task #2             │
│ ✓ 14:09 - Task #2 complete, pushed       │
│ ○ 14:12 - Processing task #3             │
└──────────────────────────────────────────┘
```

**View on GitHub:**
```
https://github.com/YOUR-USERNAME/code-cloud-agents/actions
```

Each completed task will show up as a new commit in your repository!

---

## 🔍 Verifying Results

### Check Build History

```bash
# Pull latest changes
git pull origin main

# See recent auto-builds
git log --oneline --grep="aider\|task" -10

# View detailed changes from last build
git show HEAD
```

**Expected output:**
```
def9876 feat: create test file for health endpoint
abc1234 feat: add comment explaining Express setup
5678def chore: update gitignore with coverage
```

### View Build Summaries

Each GitHub Actions run includes a summary. Check it at:
```
Actions → Auto Build with Aider → [Latest Run] → Summary tab
```

You'll see:
```markdown
### 🏗️ Build Summary

**Status:** success
**Task:** Create a new test file for the health endpoint
**Model:** claude-sonnet-4-5-20250929
**Time:** 2024-01-15 14:03:45 UTC

**Recent Commits:**
def9876 feat: create test file for health endpoint
abc1234 feat: add comment explaining Express setup
```

### Test the Application

```bash
# Install dependencies (if not done)
npm install

# Run tests
npm test

# Start the application
npm start
```

**Expected output:**
```
> my-app@1.0.0 start
> node src/index.js

Server running on port 8080
```

**Test the health endpoint:**
```bash
curl http://localhost:8080/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T14:05:00.000Z"
}
```

---

## 🎓 What You Just Learned

✅ **Manual builds** - Trigger one-off tasks via GitHub UI
✅ **Task queue** - Schedule multiple tasks for automated processing  
✅ **Monitoring** - Watch builds in GitHub Actions logs  
✅ **Results verification** - Check commits and test changes  

---

## 🚦 Common Issues & Solutions

### Issue: "ANTHROPIC_API_KEY not found"

**Solution:**
```bash
# Check if secret is set in GitHub
# Go to: Settings → Secrets and variables → Actions
# Add: ANTHROPIC_API_KEY with your key
```

### Issue: "Queue is empty, nothing to do"

**Solution:**
```bash
# Make sure you committed and pushed task-queue.txt
git add task-queue.txt
git commit -m "chore: add tasks"
git push origin main
```

### Issue: Workflow not triggering every 3 minutes

**Solution:**
- GitHub Actions can have delays during high usage
- Check workflow status in the "Actions" tab
- Manual triggers always work immediately

### Issue: Build failed with Aider error

**Solution:**
```bash
# Check the workflow logs for details
# Common issues:
# - API rate limits (wait and retry)
# - Invalid task description (be more specific)
# - Model unavailable (try different model)
```

---

## 📚 Next Steps

Now that you have the basics working, explore more advanced features:

### 1. **Try Different Models**

When triggering manually, experiment with:
- `claude-sonnet-4-5-20250929` (default, balanced)
- `claude-opus-4-5` (more powerful, slower)
- `gpt-4` (OpenAI alternative)

### 2. **Complex Tasks**

Add more sophisticated tasks to your queue:
```bash
./queue-task.sh "Implement rate limiting middleware for all API endpoints"
./queue-task.sh "Add integration tests for the authentication flow"
./queue-task.sh "Create a new endpoint for user registration"
```

### 3. **Explore the Documentation**

- **[Master Runbook](../MASTER_RUNBOOK.md)** - Full development workflow
- **[Production Checklist](../PRODUCTION_CHECKLIST.md)** - Pre-deployment requirements
- **[Project State](../PROJECT_STATE.md)** - Current status and roadmap
- **[Capabilities](../capabilities.yml)** - Feature registry

### 4. **Customize the Workflow**

Edit `.github/workflows/auto-build.yml` to:
- Change the schedule frequency
- Add notifications (Slack, Discord)
- Customize Aider parameters
- Add post-build testing

### 5. **Set Up Contracts**

For production use, define your APIs first:
```bash
# Edit these files before adding features
nano CONTRACTS/api_contract.md
nano CONTRACTS/data_contract.md
```

### 6. **Run Tests Locally**

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Watch mode (for development)
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 💡 Pro Tips

### Queue Management

```bash
# View queue with line numbers
cat -n task-queue.txt

# Add high-priority task to front of queue
sed -i '2i Your urgent task here' task-queue.txt

# Clear the queue
echo "# Code Cloud Agents - Task Queue" > task-queue.txt
```

### Better Task Descriptions

❌ **Bad:** "Fix the bug"  
✅ **Good:** "Fix the CORS error in the API endpoint that prevents OPTIONS requests"

❌ **Bad:** "Add feature"  
✅ **Good:** "Add user authentication with JWT tokens and /login endpoint"

### Monitor API Usage

```bash
# Check your Anthropic usage
# Visit: https://console.anthropic.com/settings/usage
```

### Local Development with Aider

```bash
# Install Aider locally
pip install aider-chat

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY

# Run Aider interactively
aider --model claude-sonnet-4-5-20250929

# Or one-off command
aider --yes --message "Add a TODO comment to index.js"
```

---

## 🎯 Quick Reference

### Key Commands

| Command | Purpose |
|---------|---------|
| `./queue-task.sh "task"` | Add task to queue |
| `cat task-queue.txt` | View current queue |
| `git log --oneline -5` | See recent builds |
| `npm test` | Run all tests |
| `npm start` | Start the app |

### Important Files

| File | Purpose |
|------|---------|
| `task-queue.txt` | Task queue |
| `.github/workflows/auto-build.yml` | Build workflow |
| `.env` | Local environment variables |
| `capabilities.yml` | Feature registry |
| `CONTRACTS/` | API/DB contracts |

### Useful URLs

```bash
# GitHub Actions
https://github.com/YOUR-USERNAME/code-cloud-agents/actions

# Anthropic Console
https://console.anthropic.com/

# Aider Documentation
https://aider.chat/docs/
```

---

## 🤝 Need Help?

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions and share experiences
- **Documentation:** Check `docs/` folder for detailed guides

---

**🚀 You're all set!** Your autonomous AI code generation system is ready. Add tasks to the queue and watch the magic happen!

---

*Last updated: 2024-01-15*
