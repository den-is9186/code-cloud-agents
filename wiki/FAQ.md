# Frequently Asked Questions (FAQ)

> Quick answers to common questions about Code Cloud Agents

**Last Updated:** 2025-01-25  
**Version:** 1.0.0

---

## 📋 Table of Contents

- [General](#-general)
- [Getting Started](#-getting-started)
- [Models & AI](#-models--ai)
- [Cost & Pricing](#-cost--pricing)
- [Technical Details](#-technical-details)
- [Development & Contribution](#-development--contribution)
- [Troubleshooting](#-troubleshooting)
- [Advanced Topics](#-advanced-topics)

---

## 🌟 General

### What is Code Cloud Agents?

Code Cloud Agents is an autonomous AI-powered code generation system that runs entirely on GitHub Actions. It uses advanced AI models (Claude Sonnet 4, Claude Opus 4, DeepSeek) with Aider AI to automatically build, test, and deploy software based on natural language task descriptions. Think of it as having a team of AI developers working in the cloud 24/7.

### How does it work?

The system follows a multi-agent workflow:

1. **You submit a task** via GitHub Actions UI or add it to `task-queue.txt`
2. **Supervisor Agent** analyzes the request and selects the appropriate workflow
3. **Architect Agent** creates a detailed implementation plan (runbook)
4. **Coach Agent** breaks down the plan into executable sub-tasks
5. **Code Agent** implements each task with the selected AI model
6. **Review Agent** checks code quality, security, and best practices
7. **Test Agent** writes and runs tests to ensure correctness
8. **Docs Agent** generates documentation
9. **Changes are automatically committed and pushed** to your repository

All of this happens automatically in GitHub Actions runners.

### What makes it different from regular AI coding assistants?

Unlike tools like GitHub Copilot or ChatGPT that provide suggestions, Code Cloud Agents:

- **Fully autonomous** - completes entire features without human intervention
- **Multi-agent system** - specialized agents for architecture, coding, testing, and review
- **Cloud-native** - runs on GitHub infrastructure, no local setup needed
- **Contract-first** - enforces API and data contracts before implementation
- **Production-ready** - includes security checks, testing, and deployment workflows
- **Cost-transparent** - clear pricing per build with multiple model options

### Is this a SaaS product or open source?

Code Cloud Agents is **open source** (MIT License). You can:

- Clone and run it in your own GitHub repository
- Customize workflows and agents for your needs
- Contribute improvements back to the project
- Use it commercially without licensing fees

You only pay for the AI model API usage (Anthropic Claude, DeepSeek, etc.).

---

## 🚀 Getting Started

### What are the system requirements?

**Minimal requirements:**

- GitHub account (free or paid)
- GitHub repository (public or private)
- API key for at least one supported AI model
- GitHub Actions enabled (free tier: 2,000 minutes/month for private repos, unlimited for public)

**No local installation needed!** Everything runs in GitHub Actions.

### Can I use it locally?

Yes! While designed for cloud execution, you can run it locally:

```bash
# Clone the repository
git clone https://github.com/den-is9186/code-cloud-agents.git
cd code-cloud-agents

# Install dependencies
npm install

# Install Aider
pip install aider-chat

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run a build task
aider --yes --auto-commits --model claude-sonnet-4 --message "Your task here"
```

### How do I add tasks to the queue?

There are two ways:

**1. Manual Trigger (Immediate):**
- Go to GitHub → Actions → "Auto Build with Aider"
- Click "Run workflow"
- Enter your task description
- Select AI model
- Click "Run workflow"

**2. Task Queue (Scheduled):**
```bash
# Edit task-queue.txt
echo "Create user authentication system" >> task-queue.txt
git add task-queue.txt
git commit -m "queue: add auth task"
git push
```

The scheduled workflow runs every 3 minutes and processes the queue automatically.

### How long does a typical build take?

Build times vary based on task complexity:

- **Simple tasks** (add a function): 2-5 minutes
- **Medium tasks** (create API endpoint): 5-15 minutes
- **Complex tasks** (full feature with tests): 15-45 minutes
- **Large refactors** (architecture changes): 30-60 minutes

The workflow has a 60-minute timeout limit.

### How do I know if my build succeeded?

After each build, check:

1. **GitHub Actions Summary** - shows build status and recent commits
2. **Repository commits** - Aider auto-commits changes with descriptive messages
3. **Build logs** - detailed output in the Actions run
4. **Build summary** - appears at the bottom of the workflow run

Failed builds will show error messages in the logs.

---

## 🤖 Models & AI

### What AI models does it support?

Code Cloud Agents supports multiple models with different trade-offs:

| Model | Provider | Strengths | Best For |
|-------|----------|-----------|----------|
| **Claude Sonnet 4** | Anthropic | Balanced quality/cost | Standard development |
| **Claude Opus 4** | Anthropic | Highest quality | Production code, complex logic |
| **DeepSeek R1 0528** | DeepSeek | Strong reasoning, budget | Planning, architecture |
| **DeepSeek V3.2** | DeepSeek | Fast, cheap | Prototypes, refactoring |
| **GPT-4** | OpenAI | Broad knowledge | General tasks |

Default: **Claude Sonnet 4** (best balance of quality and cost)

### What's the difference between tool calling and agentic AI?

**Tool Calling:**
- The AI model can invoke external functions (git, file system, APIs)
- Example: Model calls `git_commit("feat: add login")` to commit code
- All our supported models have excellent tool calling capabilities

**Agentic AI:**
- The model autonomously plans multi-step workflows
- Makes decisions based on outcomes (e.g., retry on failure)
- Self-corrects when tests fail or reviews find issues
- Maintains context across a long chain of operations

**Our system uses both:**
- **Tool Calling**: Every agent uses tools to interact with code and git
- **Agentic**: Supervisor orchestrates the workflow, delegates to specialists, loops until success

See [TOOL_CALLING_AND_AGENTIC.md](../docs/TOOL_CALLING_AND_AGENTIC.md) for details.

### Can I mix different models in one build?

Yes! Use the **Smart Preset (D)** which combines models strategically:

- **DeepSeek R1** for planning and architecture (cheap, strong reasoning)
- **Claude Opus 4** for final code implementation (expensive, highest quality)
- **Claude Sonnet 4** for reviews and tests (balanced)

This optimizes for cost while maintaining quality where it matters most.

### How do agents communicate with each other?

Agents follow a structured communication protocol:

1. **State Machine**: Each workflow has defined states (planning, coding, testing, etc.)
2. **Handoff Messages**: Agents pass structured JSON with task details, results, and feedback
3. **Shared Context**: All agents read from contracts (API, data) and runbooks
4. **Error Escalation**: Failed tasks automatically escalate back to previous agent with feedback

Example flow:
```
Architect → creates runbook.md
Coach → reads runbook.md, creates task-list.json
Code → reads task-list.json[0], writes code
Review → reads code, writes review-feedback.json
Code → reads feedback, fixes issues (loop)
Test → reads fixed code, writes tests
```

See [Multi-Agent-System.md](Multi-Agent-System.md) for the complete protocol.

---

## 💰 Cost & Pricing

### How much does it cost?

**GitHub Actions (Free tier):**
- Public repos: Unlimited minutes ✅
- Private repos: 2,000 minutes/month free, then $0.008/minute

**AI Model API Costs (Approximate):**

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Typical Build |
|-------|---------------------|----------------------|---------------|
| DeepSeek V3.2 | $0.27 | $1.10 | $0.10-$0.50 |
| DeepSeek R1 | $0.55 | $2.19 | $0.25-$1.00 |
| Claude Sonnet 4 | $3.00 | $15.00 | $0.50-$3.00 |
| Claude Opus 4 | $15.00 | $75.00 | $3.00-$15.00 |

**Example: Standard CRUD API build with Claude Sonnet 4:**
- Tokens used: ~100K input + 50K output
- Cost: (100K × $3/1M) + (50K × $15/1M) = **$1.05**

### Is there a free tier?

The software itself is **free and open source**. You only pay for:

1. **AI API usage** (pay-per-token to Anthropic, DeepSeek, etc.)
2. **GitHub Actions minutes** (free for public repos, 2,000 min/month for private)

**Budget-friendly option:** Use DeepSeek models for $0.10-$0.50 per build.

### How do I control costs?

**Built-in cost controls:**

1. **Model selection**: Choose budget models (DeepSeek) for prototyping
2. **Approval gates**: Premium models (Opus) require user confirmation before Phase 2
3. **Timeout limits**: Workflows auto-stop after 60 minutes
4. **Token limits**: Aider can be configured with max token budgets
5. **Preset system**: Select cost-optimized presets (A = budget, C = premium)

**Best practices:**
- Start with DeepSeek V3.2 for initial builds
- Use Claude Sonnet for production features
- Reserve Claude Opus for critical/complex code
- Monitor costs in your AI provider dashboard

---

## 🔧 Technical Details

### What programming languages are supported?

Aider (our underlying engine) supports **all major languages**:

✅ **First-class support:**
- Python, JavaScript/TypeScript, Java, C#, C++, Go, Rust
- Ruby, PHP, Swift, Kotlin, Scala
- HTML/CSS, SQL, Bash/Shell

✅ **Framework-aware:**
- React, Vue, Next.js, Express, FastAPI, Django
- Spring Boot, .NET, Rails, Laravel

The agents are trained to follow language-specific best practices and idioms.

### How secure is it?

**Security features:**

- ✅ **No code execution on external servers** - runs in your GitHub Actions
- ✅ **Secrets management** - API keys stored in GitHub Secrets (encrypted)
- ✅ **Rate limiting** - API endpoints have built-in rate limits
- ✅ **Input validation** - all file operations validate paths (no traversal)
- ✅ **CORS protection** - configurable allowed origins
- ✅ **Dependency scanning** - Dependabot checks for vulnerabilities
- ✅ **Code review** - automated security checks in Review Agent
- ✅ **No persistent storage** - temporary runners are destroyed after each build

**Security checklist enforced:**
- Secrets never committed to code
- `.env` files always in `.gitignore`
- Path traversal protection on file operations
- No stack traces in production logs

### What's contract-first development?

**Rule:** API and database changes MUST be documented in contracts BEFORE implementation.

**Workflow:**
1. Define endpoint in `CONTRACTS/api_contract.md`
2. Define schema in `CONTRACTS/data_contract.md`
3. Implement code that matches contracts
4. CI fails if code doesn't match contracts

**Benefits:**
- Frontend and backend teams can work in parallel
- No "surprises" when integrating components
- Forces thinking about design before coding
- Living documentation that's always up-to-date

Example:
```markdown
# CONTRACTS/api_contract.md
POST /api/users
Request: { name: string, email: string }
Response: { id: string, name: string, email: string, created_at: timestamp }
```

Code Agent will implement exactly this signature - no deviations.

### How often do scheduled builds run?

**Current schedule:** Every **3 minutes** (cron: `*/3 * * * *`)

This checks `task-queue.txt` for pending tasks and processes them automatically.

**Why 3 minutes?**
- Fast enough for good developer experience
- Doesn't waste GitHub Actions minutes on empty queue checks
- Allows time for previous build to complete before next check

**Customization:**
Edit `.github/workflows/auto-build.yml`:
```yaml
schedule:
  - cron: '*/5 * * * *'  # Change to 5 minutes
  - cron: '0 * * * *'    # Change to hourly
```

### Can I customize the workflow?

**Yes!** Multiple customization points:

**1. Agent Configuration:**
```yaml
# config/agents.yml
code_agent:
  model: claude-sonnet-4
  temperature: 0.7
  max_retries: 3
```

**2. Workflow Steps:**
```yaml
# .github/workflows/auto-build.yml
- name: Custom Pre-Build Step
  run: |
    # Your custom logic here
```

**3. Model Presets:**
```typescript
// Add your own preset
const MY_PRESET = {
  architect: 'claude-opus-4',
  code: 'my-custom-model',
  test: 'claude-sonnet-4'
};
```

**4. Tool Functions:**
```typescript
// src/tools/registry.ts
export const CUSTOM_TOOL = {
  schema: { /* ... */ },
  handler: async (params) => { /* your logic */ }
};
```

See [Development-Guide.md](Development-Guide.md) for detailed customization instructions.

---

## 👥 Development & Contribution

### How do I contribute?

We welcome contributions! Follow these steps:

**1. Fork and clone:**
```bash
git clone https://github.com/YOUR_USERNAME/code-cloud-agents.git
cd code-cloud-agents
git checkout -b feature/my-feature
```

**2. Make changes following our policies:**
- Read `ops/POLICY.md` for branch strategy
- Update contracts FIRST if changing APIs
- Add tests for new features
- Register in `capabilities.yml`

**3. Submit PR:**
- PR to `develop` branch (NOT main)
- Fill out PR template
- Ensure all tests pass
- Wait for review

**See:** [Contributing-Guide.md](Contributing-Guide.md) for complete guidelines.

### Can I add my own AI models?

Yes! The system is designed to be model-agnostic.

**Steps to add a new model:**

1. **Add model configuration:**
```typescript
// src/config/models.ts
export const MODELS = {
  'my-custom-model': {
    provider: 'custom',
    apiBase: 'https://api.example.com',
    contextWindow: 100000,
    pricing: { input: 1.0, output: 5.0 }
  }
};
```

2. **Add API client:**
```typescript
// src/clients/custom-client.ts
export class CustomModelClient {
  async chat(messages, tools) {
    // Your API implementation
  }
}
```

3. **Register in Aider:**
```bash
aider --model my-custom-model --api-base https://api.example.com
```

See [Development-Guide.md#Adding-Models](Development-Guide.md#adding-models) for details.

### What's the roadmap?

**Current Phase: Foundation (MVP)**
- ✅ Basic workflow with Aider
- ✅ Task queue system
- ✅ Multi-model support
- 🟡 Contract enforcement (in progress)
- 🔴 Multi-agent system (planned)

**Phase 2: Multi-Agent (Q1 2026)**
- Supervisor orchestration
- Specialized agents (Architect, Coach, Code, Review, Test, Docs)
- Agent presets (Budget, Standard, Premium, Smart)
- Cost tracking and reporting

**Phase 3: Enterprise (Q2 2026)**
- Slack/Discord notifications
- Multi-repository support
- Team management and permissions
- Advanced analytics dashboard

**Phase 4: Scale (Q3+ 2026)**
- Self-hosting options (Docker, K8s)
- VS Code extension
- Marketplace for custom agents
- Enterprise SSO integration

See [PROJECT_STATE.md](../PROJECT_STATE.md) for updated roadmap.

### How do I report bugs?

**GitHub Issues preferred:**

1. Go to [Issues](https://github.com/den-is9186/code-cloud-agents/issues)
2. Click "New Issue"
3. Choose template: Bug Report
4. Provide:
   - Description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - GitHub Actions log excerpt
   - Model and preset used

**For security vulnerabilities:**
Email maintainers directly (don't open public issue).

---

## 🔍 Troubleshooting

### My build failed with "API rate limit exceeded"

**Cause:** You hit your AI provider's rate limit.

**Solutions:**

1. **Wait and retry** - rate limits usually reset within an hour
2. **Upgrade your API plan** - most providers have higher tiers
3. **Use a different model** - switch to provider with available quota
4. **Add delays** - configure rate limiting in workflow:
```yaml
- name: Rate Limit Wait
  run: sleep 60
```

### The agent produced incorrect code

**Debugging steps:**

1. **Check the task description** - was it clear and unambiguous?
2. **Review the model used** - budget models may struggle with complex tasks
3. **Check contracts** - ensure contracts are up-to-date and complete
4. **Try a better model** - upgrade from DeepSeek to Claude Sonnet/Opus
5. **Add more context** - reference specific files or patterns to follow

**Quick fix:**
- Add a follow-up task: "Fix the bug in [file]: [specific issue]"
- The Review Agent should catch issues automatically in multi-agent mode

### How do I revert a bad commit?

If Aider committed unwanted changes:

```bash
# Find the commit hash
git log --oneline

# Revert specific commit
git revert <commit-hash>

# Or reset to previous state (careful!)
git reset --hard HEAD~1

# Push changes
git push origin main
```

**Prevention:**
- Review changes in GitHub before merging
- Use branch protection rules
- Test in a feature branch first

### Tests are failing after a build

**Common causes:**

1. **Missing dependencies** - Aider added new packages but didn't install them
2. **Environment variables** - tests need env vars that aren't set
3. **Breaking changes** - code changed but tests weren't updated
4. **Flaky tests** - tests depend on timing or external services

**Solutions:**

1. **Run tests locally:**
```bash
npm test
# or
pytest
```

2. **Update dependencies:**
```bash
npm install
# or
pip install -r requirements.txt
```

3. **Add a fix task:**
```
Fix failing tests in [test-file]. The error is: [error message]
```

4. **Check test logs** in GitHub Actions for detailed error messages

### How do I debug a workflow?

**Enable debug logging:**

1. Go to GitHub Repository Settings → Secrets
2. Add repository secret: `ACTIONS_STEP_DEBUG = true`
3. Re-run the workflow

**Manual debugging:**

```yaml
# Add to workflow
- name: Debug Output
  run: |
    echo "Current directory: $(pwd)"
    echo "Files: $(ls -la)"
    echo "Git status: $(git status)"
    echo "Environment: $(env)"
```

**Check logs:**
- GitHub Actions → Select workflow run → Expand each step
- Look for error messages in red

### Where do I find more troubleshooting help?

1. **Wiki:** [Troubleshooting.md](Troubleshooting.md) - comprehensive guide
2. **GitHub Discussions:** Ask questions to the community
3. **GitHub Issues:** Check existing issues or open a new one
4. **Docs:** [Development-Guide.md](Development-Guide.md) - detailed setup help

---

## 🎓 Advanced Topics

### How do I deploy to production?

**Pre-deployment checklist:**

1. **Complete [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md)** - all items must be ✅
2. **Run full test suite:**
```bash
npm run test:coverage
# Ensure ≥ 80% coverage
```

3. **Security scan:**
```bash
npm audit
# Fix all high/critical vulnerabilities
```

4. **Contract verification:**
- Ensure `CONTRACTS/api_contract.md` matches implementation
- Ensure `CONTRACTS/data_contract.md` matches database schema

5. **Merge to main:**
```bash
git checkout develop
git pull
git checkout -b release/v1.0.0
# Test thoroughly
git checkout main
git merge release/v1.0.0
git push origin main
```

6. **Deploy:**
- GitHub Pages, Vercel, or your hosting platform
- Set production environment variables
- Run smoke tests

**Post-deployment:**
- Monitor health endpoint: `GET /health`
- Check error logs
- Monitor performance metrics

See [Development-Guide.md#Deployment](Development-Guide.md#deployment) for platform-specific guides.

### Can I use this in a monorepo?

**Yes**, but with considerations:

**Challenges:**
- Aider processes entire repo context (slow with large monorepos)
- Changes may inadvertently affect unrelated packages
- Testing requires building multiple packages

**Solutions:**

1. **Scope tasks clearly:**
```
Update the user-service package only: add password reset endpoint
```

2. **Use Aider's file filtering:**
```bash
aider --yes --model claude-sonnet-4 --read src/user-service/** --message "..."
```

3. **Consider multi-repo approach:**
- Use Merge Agent (Phase 2 feature) to sync changes across repos

**Best practice:** For large monorepos, consider splitting into multiple Code Cloud Agents instances, one per major package.

### How do I integrate with CI/CD pipelines?

Code Cloud Agents IS a CI/CD pipeline, but you can integrate with others:

**Option 1: Trigger external pipeline after build**
```yaml
# .github/workflows/auto-build.yml
- name: Trigger External Pipeline
  if: success()
  run: |
    curl -X POST https://your-ci-system.com/api/builds \
      -H "Authorization: Bearer ${{ secrets.CI_TOKEN }}" \
      -d '{"branch": "main"}'
```

**Option 2: Use as a pre-commit step**
```yaml
# .github/workflows/pre-commit.yml
on: pull_request

jobs:
  aider-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Code Review
        run: |
          aider --yes --model claude-sonnet-4 \
            --message "Review this PR for bugs and security issues"
```

**Option 3: Webhook integration**
Set up webhooks to notify external systems when builds complete.

### What's the difference between the workflow presets?

We offer 6 presets optimizing for different priorities:

| Preset | Focus | Architect | Code | Review | Test | Cost/Build |
|--------|-------|-----------|------|--------|------|------------|
| **A (Budget)** | Lowest cost | DeepSeek R1 | DeepSeek V3.2 | DeepSeek V3.2 | DeepSeek V3.2 | $0.25-$1 |
| **B (Optimal)** | Balance | Claude Sonnet | Claude Sonnet | Claude Sonnet | Claude Sonnet | $2-$5 |
| **C (Premium)** | Best quality | Claude Opus | Claude Opus | Claude Opus | Claude Opus | $10-$25 |
| **D (Smart)** | Cost-optimized | DeepSeek R1 | Claude Opus | Claude Sonnet | Claude Sonnet | $5-$12 |
| **E (Fast)** | Speed | DeepSeek V3.2 | DeepSeek V3.2 | (skipped) | DeepSeek V3.2 | $0.50-$2 |
| **F (Quality)** | Thoroughness | Claude Opus | Claude Opus | Claude Opus | Claude Opus | $15-$40 |

**Recommendations:**
- **Prototypes:** Use A (Budget) or E (Fast)
- **Standard features:** Use B (Optimal)
- **Production code:** Use C (Premium) or D (Smart)
- **Critical systems:** Use F (Quality)

Configure in `.github/workflows/auto-build.yml`:
```yaml
inputs:
  preset:
    type: choice
    options: [A, B, C, D, E, F]
    default: B
```

---

## 📚 Additional Resources

- **[Home](Home.md)** - Wiki homepage
- **[Getting Started](Getting-Started.md)** - Setup guide
- **[Architecture Overview](Architecture-Overview.md)** - System design
- **[Development Guide](Development-Guide.md)** - Developer documentation
- **[API Reference](API-Reference.md)** - API endpoints
- **[Contributing Guide](Contributing-Guide.md)** - How to contribute
- **[Troubleshooting](Troubleshooting.md)** - Common issues and solutions
- **[Multi-Agent System](Multi-Agent-System.md)** - Agent details

---

## 🤝 Support

**Need more help?**

- 💬 [GitHub Discussions](https://github.com/den-is9186/code-cloud-agents/discussions) - Ask the community
- 🐛 [Report Bug](https://github.com/den-is9186/code-cloud-agents/issues/new?template=bug_report.md) - Open an issue
- 💡 [Feature Request](https://github.com/den-is9186/code-cloud-agents/issues/new?template=feature_request.md) - Suggest improvements
- 📧 Email maintainers for security issues

---

**Last Updated:** 2025-01-25  
**Maintained by:** [den-is9186](https://github.com/den-is9186)
