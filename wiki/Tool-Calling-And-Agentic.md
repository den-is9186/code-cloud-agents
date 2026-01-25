# Tool Calling and Agentic AI: A Complete Guide

Welcome! This guide explains two fundamental concepts that power our multi-agent system: **Tool Calling** and **Agentic AI**. Understanding the difference is key to understanding how modern AI systems work.

---

## 📚 Table of Contents

- [What is Tool Calling?](#what-is-tool-calling)
- [What is Agentic AI?](#what-is-agentic-ai)
- [Key Differences](#key-differences)
- [How They Work Together](#how-they-work-together)
- [Real-World Examples](#real-world-examples)
- [Model Recommendations](#model-recommendations)
- [Best Practices](#best-practices)
- [Implementation Details](#implementation-details)

---

## What is Tool Calling?

### Simple Definition

**Tool Calling** (also called Function Calling) is when an AI model realizes it needs external help and makes a structured request to use a specific tool or function.

Think of it like this: If you're writing an email and need to know today's date, you'd open your calendar app. Similarly, an AI model "calls" external tools when it needs to perform actions it can't do on its own.

### How It Works

```
┌──────────────┐
│   AI Model   │  "I need to save a file"
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│  Structured Tool Call Request   │
│  {                               │
│    "tool": "file_write",         │
│    "parameters": {               │
│      "path": "src/user.ts",     │
│      "content": "code here..."   │
│    }                             │
│  }                               │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────┐
│  Tool Engine │  Executes the actual write
└──────┬───────┘
       │
       ▼
   ✅ Result returned to model
```

### Example: Simple Tool Call

**User asks:** "Create a file called hello.ts with a simple function"

**AI's thought process:**
1. ❌ I can't directly create files in the filesystem
2. ✅ But I can use the `file_write` tool!
3. 📤 Let me make a tool call...

**Tool call generated:**
```json
{
  "tool": "file_write",
  "parameters": {
    "path": "src/hello.ts",
    "content": "export function hello() {\n  console.log('Hello!');\n}"
  }
}
```

**Result:** File is created! ✅

### Tools Available in Our System

Our agents can call these tools:

```typescript
// 📁 File Operations
file_read      // Read file contents
file_write     // Write/create files
file_delete    // Delete files
file_search    // Search through files

// 🔧 Git Operations
git_clone      // Clone a repository
git_commit     // Commit changes
git_push       // Push to remote
git_branch     // Create/switch branches
git_merge      // Merge branches

// 🤖 LLM Operations
llm_chat       // Chat with another LLM
llm_analyze    // Analyze code/text
llm_generate   // Generate content

// 🧪 Testing & Quality
test_run       // Run test suite
test_coverage  // Check code coverage
lint_check     // Run linters

// 📦 Build Tools
npm_install    // Install dependencies
npm_build      // Build the project
docker_build   // Build Docker images
```

---

## What is Agentic AI?

### Simple Definition

**Agentic AI** is when an AI model acts like an autonomous agent that can:
- 🎯 **Plan** complex multi-step workflows
- 🤔 **Decide** which tools to use and when
- 🔄 **Loop** and retry when things fail
- 🔧 **Self-correct** based on feedback
- 📊 **Track** progress toward a goal

Think of it like the difference between:
- **Regular AI**: A helpful assistant that answers questions
- **Tool-Calling AI**: An assistant that can use tools when asked
- **Agentic AI**: A project manager that plans the work, assigns tasks, checks results, and adjusts the plan as needed

### The Agentic Loop

```
┌─────────────────────────────────────────────────┐
│          THE AGENTIC WORKFLOW                   │
└─────────────────────────────────────────────────┘

1. 📥 RECEIVE GOAL
   "Build a REST API for user management"
          │
          ▼
2. 🎯 PLAN APPROACH
   ├─ Need database schema
   ├─ Need API endpoints (CRUD)
   ├─ Need authentication
   ├─ Need tests
   └─ Need documentation
          │
          ▼
3. 🔄 EXECUTE LOOP
   For each sub-task:
   ┌───────────────────────────────┐
   │ a. Delegate to specialist     │
   │ b. Check result               │
   │ c. If error → analyze & retry │
   │ d. If success → next task     │
   └───────────────────────────────┘
          │
          ▼
4. ✅ VERIFY GOAL
   - All tasks complete?
   - Tests passing?
   - Quality standards met?
          │
          ▼
5. 🎉 MISSION COMPLETE
```

### Key Agentic Capabilities

| Capability | Description | Example |
|------------|-------------|---------|
| **Planning** | Breaking down complex goals into steps | "To build API: 1) Design schema 2) Create endpoints 3) Add tests" |
| **Decision Making** | Choosing the right action/tool | "Test failed → Need to fix code, not write more tests" |
| **Delegation** | Assigning work to specialists | "Send database design to Architect Agent" |
| **Looping** | Repeating actions until success | "Keep fixing code until tests pass" |
| **Self-Correction** | Learning from errors | "Review said 'missing validation' → Add validation logic" |
| **State Management** | Tracking what's done/pending | "Completed 3/5 tasks, current: writing tests" |

---

## Key Differences

Let's compare three levels of AI capability:

### 📊 Comparison Table

| Feature | Regular Chat AI | Tool-Calling AI | Agentic AI |
|---------|----------------|-----------------|------------|
| **Answers questions** | ✅ | ✅ | ✅ |
| **Uses external tools** | ❌ | ✅ | ✅ |
| **Multi-step planning** | ❌ | ❌ | ✅ |
| **Self-correction** | ❌ | ❌ | ✅ |
| **Autonomous operation** | ❌ | ❌ | ✅ |
| **Handles complexity** | Low | Medium | High |
| **Example use case** | "Explain REST APIs" | "Create a file with this code" | "Build a complete REST API system" |

### 🎭 Side-by-Side Example

**Task:** "Create a user authentication system"

#### Regular Chat AI Response:
```
Here's how to build authentication:
1. Create a User model...
2. Add password hashing...
3. Create login endpoint...
[provides explanation only]
```
❌ Nothing actually happens

#### Tool-Calling AI Response:
```
I'll create the files for you:
[tool_call: file_write("models/User.ts", "...")]
[tool_call: file_write("auth/login.ts", "...")]
```
✅ Files created, but no planning or error checking

#### Agentic AI Response:
```
I'll build a complete authentication system:

PHASE 1 - Planning:
✓ Analyzed requirements
✓ Created implementation runbook
✓ Broke into 8 sub-tasks

PHASE 2 - Implementation:
✓ Task 1: Database schema → Complete
✓ Task 2: User model → Complete, Review passed
✓ Task 3: Password hashing → Complete
✓ Task 4: Login endpoint → Had errors, fixed, tests now pass
✓ Task 5: JWT tokens → Complete
...

PHASE 3 - Verification:
✓ All 47 tests passing
✓ Security review passed
✓ Documentation complete

✅ Authentication system ready for deployment!
```

---

## How They Work Together

In our multi-agent system, **Tool Calling** and **Agentic AI** work together seamlessly:

### The Architecture

```
┌────────────────────────────────────────────────────────┐
│                   SUPERVISOR AGENT                      │
│                  (Agentic Brain 🧠)                    │
│                                                        │
│  Responsibilities:                                     │
│  • Plans the overall workflow                          │
│  • Delegates to specialist agents                      │
│  • Monitors progress                                   │
│  • Handles errors and retries                          │
│  • Makes strategic decisions                           │
└───────────────┬────────────────────────────────────────┘
                │
                │ Delegates to specialists ↓
                │
    ┌───────────┴───────────┬─────────────┬──────────────┐
    │                       │             │              │
    ▼                       ▼             ▼              ▼
┌─────────┐           ┌─────────┐   ┌─────────┐   ┌─────────┐
│  CODE   │           │ REVIEW  │   │  TEST   │   │  DOCS   │
│  AGENT  │           │  AGENT  │   │  AGENT  │   │  AGENT  │
└────┬────┘           └────┬────┘   └────┬────┘   └────┬────┘
     │                     │             │             │
     │ All use Tool Calling to perform actual work    │
     │                     │             │             │
     ▼                     ▼             ▼             ▼
┌──────────────────────────────────────────────────────────┐
│              TOOL EXECUTION LAYER 🔧                     │
│                                                          │
│  file_write  git_commit  test_run  llm_analyze         │
│  file_read   git_push    lint_check  docker_build      │
└──────────────────────────────────────────────────────────┘
```

### Workflow Example: Building a Feature

Let's see both concepts in action:

```
USER REQUEST: "Add user registration endpoint"
                    │
                    ▼
╔═══════════════════════════════════════════════════════════╗
║  SUPERVISOR (Agentic Planning)                            ║
║                                                           ║
║  1. 🎯 PLAN PHASE                                         ║
║     • Analyze: Need endpoint + validation + tests        ║
║     • Choose: Use Preset B (Sonnet 4)                    ║
║     • Delegate: Send to Architect for design             ║
╚═══════════════════════════════════════════════════════════╝
                    │
                    ▼
┌───────────────────────────────────────────────────────────┐
│  ARCHITECT AGENT (Tool Calling)                           │
│  [tool_call: file_read("docs/API_SPEC.md")]              │
│  [tool_call: llm_analyze(requirements)]                  │
│  → Returns: Technical design document                     │
└───────────────────────────────────────────────────────────┘
                    │
                    ▼
╔═══════════════════════════════════════════════════════════╗
║  SUPERVISOR (Agentic Decision)                            ║
║  • Review design ✓                                        ║
║  • Break into 3 tasks                                     ║
║  • Delegate: Task 1 to Code Agent                         ║
╚═══════════════════════════════════════════════════════════╝
                    │
                    ▼
┌───────────────────────────────────────────────────────────┐
│  CODE AGENT (Tool Calling)                                │
│  [tool_call: file_write("routes/register.ts", "...")]   │
│  [tool_call: file_write("validators/user.ts", "...")]   │
│  → Files created                                          │
└───────────────────────────────────────────────────────────┘
                    │
                    ▼
╔═══════════════════════════════════════════════════════════╗
║  SUPERVISOR (Agentic Verification)                        ║
║  • Delegate: Send code to Review Agent                    ║
╚═══════════════════════════════════════════════════════════╝
                    │
                    ▼
┌───────────────────────────────────────────────────────────┐
│  REVIEW AGENT (Tool Calling)                              │
│  [tool_call: file_read("routes/register.ts")]           │
│  [tool_call: lint_check()]                               │
│  → Found issues: Missing input validation ❌              │
└───────────────────────────────────────────────────────────┘
                    │
                    ▼
╔═══════════════════════════════════════════════════════════╗
║  SUPERVISOR (Agentic Self-Correction) 🔄                  ║
║  • Detected error                                         ║
║  • Decision: Send back to Code Agent with feedback        ║
╚═══════════════════════════════════════════════════════════╝
                    │
                    ▼
┌───────────────────────────────────────────────────────────┐
│  CODE AGENT (Tool Calling - Retry)                        │
│  [tool_call: file_write("routes/register.ts", "...")]   │
│  → Added validation ✓                                     │
└───────────────────────────────────────────────────────────┘
                    │
                    ▼
╔═══════════════════════════════════════════════════════════╗
║  SUPERVISOR (Agentic Verification - Retry)                ║
║  • Delegate: Review again                                 ║
╚═══════════════════════════════════════════════════════════╝
                    │
                    ▼
┌───────────────────────────────────────────────────────────┐
│  REVIEW AGENT (Tool Calling)                              │
│  → Code looks good ✅                                     │
└───────────────────────────────────────────────────────────┘
                    │
                    ▼
╔═══════════════════════════════════════════════════════════╗
║  SUPERVISOR (Agentic Progress)                            ║
║  • Task 1 complete ✓                                      ║
║  • Delegate: Task 2 (Tests) to Test Agent                 ║
╚═══════════════════════════════════════════════════════════╝
                    │
                    ▼
                [continues...]
```

**Legend:**
- 🧠 **Agentic parts** (planning, deciding, looping) = Supervisor
- 🔧 **Tool Calling parts** (actual execution) = All agents

---

## Real-World Examples

### Example 1: Simple Request

**Request:** "Fix the typo in README.md"

#### Tool-Calling Approach (Simple)
```typescript
// One agent, one action
[tool_call: file_read("README.md")]
[tool_call: file_write("README.md", corrected_content)]
✅ Done in 2 tool calls
```

This is **Tool Calling only** - straightforward execution.

---

### Example 2: Complex Request

**Request:** "Refactor the authentication system to use JWT instead of sessions"

#### Agentic Approach (Complex)

```typescript
// SUPERVISOR (Agentic orchestration)
{
  step: 1,
  action: "PLAN",
  plan: {
    phase1: "Analysis",
    phase2: "Implementation", 
    phase3: "Testing",
    phase4: "Documentation"
  }
}

// Phase 1: Analysis (Agentic delegation)
supervisor.delegate("architect", {
  task: "Analyze current auth system",
  tools: ["file_read", "code_analyze"]
})
// Architect uses Tool Calling:
[tool_call: file_read("src/auth/session.ts")]
[tool_call: file_read("src/middleware/auth.ts")]
[tool_call: llm_analyze(current_architecture)]

// Phase 2: Implementation (Agentic looping)
for (each file in affected_files) {
  // CODE AGENT (Tool Calling)
  [tool_call: file_write(file, new_content)]
  
  // REVIEW AGENT (Tool Calling)
  [tool_call: lint_check()]
  [tool_call: security_scan()]
  
  // SUPERVISOR (Agentic decision)
  if (review.hasErrors) {
    // Agentic self-correction!
    retry_count++;
    supervisor.delegate("code_agent", {
      task: "Fix errors",
      feedback: review.errors
    })
  }
}

// Phase 3: Testing (Agentic verification)
[tool_call: test_run("auth.test.ts")]
if (tests_failed) {
  // Agentic loop back
  supervisor.delegate("code_agent", {
    task: "Fix test failures",
    test_output: test_results
  })
}

// Phase 4: Documentation (Agentic completion)
[tool_call: file_write("docs/AUTH.md", updated_docs)]
[tool_call: git_commit("refactor: migrate to JWT auth")]

✅ Completed with 47 tool calls, 3 retries, full success
```

---

### Example 3: Error Recovery

**Request:** "Deploy the application"

```typescript
// WITHOUT Agentic (just Tool Calling)
[tool_call: docker_build()]
❌ Build failed: Missing environment variable
// STUCK - no recovery!

// WITH Agentic
[tool_call: docker_build()]
❌ Build failed: Missing environment variable

// Agentic self-correction:
supervisor.analyze(error) 
// → Detected: Need to check .env file

[tool_call: file_read(".env.example")]
supervisor.decide()
// → Decision: Create .env from template

[tool_call: file_write(".env", template_with_values)]
[tool_call: docker_build()]
✅ Build successful!

[tool_call: docker_run()]
❌ Container exited: Port 3000 already in use

// Agentic problem-solving:
supervisor.analyze(error)
// → Detected: Port conflict

[tool_call: system_exec("lsof -i :3000")]
supervisor.decide()
// → Decision: Use port 3001 instead

[tool_call: file_write("config/server.ts", "PORT=3001")]
[tool_call: docker_build()]
[tool_call: docker_run()]
✅ Application deployed successfully!
```

**Without Agentic:** Failed at first error ❌  
**With Agentic:** Self-corrected and succeeded ✅

---

## Model Recommendations

Different AI models have different strengths for Tool Calling and Agentic capabilities.

### Tool Calling Models

**Best for precise, reliable function calls:**

| Model | Quality | Cost | Best For |
|-------|---------|------|----------|
| **Claude Opus 4** | ⭐⭐⭐⭐⭐ | $$$ | Complex multi-tool chains, production |
| **Claude Sonnet 4** | ⭐⭐⭐⭐⭐ | $$ | Standard development, best balance |
| **DeepSeek V3.2** | ⭐⭐⭐⭐⭐ | $ | Budget-friendly, excellent JSON quality |
| **DeepSeek R1 0528** | ⭐⭐⭐⭐⭐ | $ | Budget agents, good reliability |

**Why these models?**
- Clean, valid JSON output
- Low hallucination rate
- Accurate parameter extraction
- Consistent tool selection

### Agentic Models

**Best for planning, reasoning, and decision-making:**

| Model | Quality | Cost | Best For |
|-------|---------|------|----------|
| **Claude Opus 4** | ⭐⭐⭐⭐⭐ | $$$ | Complex reasoning, critical decisions |
| **Claude Sonnet 4** | ⭐⭐⭐⭐ | $$ | Balanced performance, most use cases |
| **DeepSeek R1 0528** | ⭐⭐⭐⭐⭐ | $ | Strong reasoning at low cost |
| **GPT-4** | ⭐⭐⭐⭐ | $$$ | Complex planning scenarios |

**Why these models?**
- Strong reasoning capabilities
- Good at breaking down complex tasks
- Can maintain context over long conversations
- Effective error analysis

### Our Preset Strategy

We combine models strategically based on the task:

```typescript
// Preset A: Budget-Friendly
{
  supervisor: "DeepSeek R1 0528",      // Agentic planning
  agents: "DeepSeek V3.2",             // Tool calling
  cost: "$",
  use_for: "Prototypes, experiments, learning"
}

// Preset B: Optimal Balance
{
  supervisor: "Claude Sonnet 4",       // Agentic planning
  agents: "Claude Sonnet 4",           // Tool calling
  cost: "$$",
  use_for: "Production features, standard builds"
}

// Preset C: Maximum Quality
{
  supervisor: "Claude Opus 4",         // Agentic planning
  agents: "Claude Opus 4",             // Tool calling
  cost: "$$$",
  use_for: "Critical systems, complex architecture"
}

// Preset D: Smart Mix
{
  supervisor: "DeepSeek R1 0528",      // Budget but strong reasoning
  critical_agents: "Claude Opus 4",    // Quality where it matters
  simple_agents: "DeepSeek V3.2",      // Budget for simple tasks
  cost: "$$",
  use_for: "Cost-optimized production"
}
```

### Choosing the Right Model

```
┌─────────────────────────────────────────┐
│  Is the task simple and well-defined?  │
│  (e.g., "create a file", "run tests")  │
└────┬──────────────────────┬─────────────┘
     │ YES                  │ NO
     ▼                      ▼
┌─────────────┐      ┌──────────────────┐
│ Tool Calling│      │   Needs both:    │
│   Model     │      │   • Tool Calling │
│             │      │   • Agentic      │
│ Use: Sonnet 4│      │                  │
│ or DeepSeek │      │   Use: Opus 4    │
│             │      │   or R1 + Opus   │
└─────────────┘      └──────────────────┘
```

**Decision Matrix:**

| Scenario | Recommended Approach |
|----------|---------------------|
| Create a single file | Tool Calling only (Sonnet/DeepSeek) |
| Fix a typo | Tool Calling only (Sonnet/DeepSeek) |
| Build a feature | Agentic Supervisor + Tool-calling agents |
| Refactor system | Agentic Supervisor + Tool-calling agents |
| Debug complex issue | Agentic (Opus/R1) |
| Production deployment | Agentic Supervisor (Opus) + Mixed agents |

---

## Best Practices

### For Tool Calling

#### ✅ DO:

1. **Define clear tool schemas**
   ```typescript
   {
     name: "file_write",
     description: "Write content to a file",
     parameters: {
       path: { type: "string", required: true },
       content: { type: "string", required: true },
       mode: { type: "string", enum: ["write", "append"], default: "write" }
     }
   }
   ```

2. **Validate tool parameters**
   ```typescript
   function validateToolCall(call: ToolCall): boolean {
     if (!call.tool || !call.parameters) return false;
     if (call.tool === "file_write") {
       return !!call.parameters.path && !!call.parameters.content;
     }
     return true;
   }
   ```

3. **Handle tool errors gracefully**
   ```typescript
   try {
     const result = await executeTool(toolCall);
     return { success: true, result };
   } catch (error) {
     return { 
       success: false, 
       error: error.message,
       retry_suggestion: "Check file permissions"
     };
   }
   ```

4. **Provide clear tool descriptions**
   - Good: "Read the contents of a file from the filesystem"
   - Bad: "Read file"

#### ❌ DON'T:

1. **Don't create too many similar tools**
   - Bad: `file_write`, `file_write_append`, `file_write_create`
   - Good: `file_write` with a `mode` parameter

2. **Don't use vague parameter names**
   - Bad: `data`, `info`, `stuff`
   - Good: `file_content`, `commit_message`, `branch_name`

3. **Don't ignore tool execution results**
   - Always check if the tool succeeded
   - Pass results back to the model

---

### For Agentic Systems

#### ✅ DO:

1. **Break complex goals into phases**
   ```typescript
   const workflow = {
     phase1: { name: "Analysis", agents: ["architect"] },
     phase2: { name: "Implementation", agents: ["code", "review"] },
     phase3: { name: "Testing", agents: ["test"] },
     phase4: { name: "Documentation", agents: ["docs"] }
   };
   ```

2. **Implement retry logic with limits**
   ```typescript
   const MAX_RETRIES = 3;
   let retryCount = 0;
   
   while (retryCount < MAX_RETRIES) {
     const result = await agent.execute(task);
     if (result.success) break;
     
     retryCount++;
     task = supervisor.adjustTask(task, result.feedback);
   }
   ```

3. **Track state across the workflow**
   ```typescript
   interface WorkflowState {
     currentPhase: number;
     completedTasks: string[];
     pendingTasks: string[];
     errors: Error[];
     retries: Map<string, number>;
   }
   ```

4. **Set clear success criteria**
   ```typescript
   const successCriteria = {
     all_tests_pass: true,
     code_review_approved: true,
     no_linting_errors: true,
     documentation_complete: true
   };
   ```

5. **Use human checkpoints**
   ```typescript
   // After major phase
   if (phase === "implementation") {
     await supervisor.pauseForApproval({
       message: "Phase 1 complete. Review and approve to continue?",
       details: completedTasks
     });
   }
   ```

#### ❌ DON'T:

1. **Don't create infinite loops**
   - Always have a maximum retry count
   - Add circuit breakers for repeated failures

2. **Don't ignore agent feedback**
   - Review agents provide valuable input
   - Use feedback to improve next iteration

3. **Don't skip planning phase**
   - Rushing into execution leads to rework
   - Spend time upfront understanding the goal

4. **Don't lose context**
   - Keep track of what's been done
   - Pass relevant history to agents

---

### Combining Both Effectively

#### Pattern: Supervisor + Specialists

```typescript
// SUPERVISOR (Agentic)
class SupervisorAgent {
  async execute(goal: string) {
    // 1. Plan
    const plan = await this.createPlan(goal);
    
    // 2. Execute with specialists
    for (const task of plan.tasks) {
      // Delegate to specialist
      const agent = this.selectAgent(task.type);
      const result = await agent.execute(task);
      
      // 3. Verify
      if (!result.success) {
        // 4. Self-correct
        task.feedback = result.error;
        task.retryCount++;
        
        if (task.retryCount < MAX_RETRIES) {
          // Try again with feedback
          continue;
        }
      }
      
      // 5. Track progress
      plan.markComplete(task);
    }
    
    return plan.isComplete();
  }
}

// SPECIALIST (Tool Calling)
class CodeAgent {
  async execute(task: Task) {
    // Use tools to perform the actual work
    const files = await this.callTool("file_read", {...});
    const analysis = await this.callTool("llm_analyze", {...});
    const written = await this.callTool("file_write", {...});
    
    return { success: true, files_modified: [...] };
  }
}
```

---

## Implementation Details

### Agent Configuration

Each agent in our system is configured with specific capabilities:

```typescript
interface AgentConfig {
  // Identity
  name: string;
  type: "supervisor" | "specialist";
  
  // Capabilities
  canPlan: boolean;          // Agentic
  canDelegate: boolean;      // Agentic
  canSelfCorrect: boolean;   // Agentic
  
  // Tool access
  allowedTools: string[];    // Tool Calling
  
  // Behavior
  maxRetries: number;
  timeout: number;
  escalateTo?: string;
}
```

**Example configurations:**

```typescript
// Supervisor Agent
const supervisorConfig: AgentConfig = {
  name: "supervisor",
  type: "supervisor",
  canPlan: true,           // ✅ Agentic planning
  canDelegate: true,       // ✅ Agentic delegation
  canSelfCorrect: true,    // ✅ Agentic self-correction
  allowedTools: [          // Tool calling for coordination
    "llm_chat",
    "llm_analyze"
  ],
  maxRetries: 5,
  timeout: 300000  // 5 minutes
};

// Code Agent
const codeAgentConfig: AgentConfig = {
  name: "code_agent",
  type: "specialist",
  canPlan: false,          // ❌ No planning (follows instructions)
  canDelegate: false,      // ❌ No delegation (does work itself)
  canSelfCorrect: true,    // ✅ Can fix its own errors
  allowedTools: [          // Tool calling for implementation
    "file_read",
    "file_write",
    "file_delete",
    "git_commit"
  ],
  maxRetries: 3,
  timeout: 120000,  // 2 minutes
  escalateTo: "supervisor"
};

// Review Agent
const reviewAgentConfig: AgentConfig = {
  name: "review_agent",
  type: "specialist",
  canPlan: false,          // ❌ No planning
  canDelegate: false,      // ❌ No delegation
  canSelfCorrect: false,   // ❌ No self-correction (provides feedback only)
  allowedTools: [          // Tool calling for analysis
    "file_read",
    "lint_check",
    "llm_analyze"
  ],
  maxRetries: 1,
  timeout: 60000,   // 1 minute
  escalateTo: "code_agent"  // Send issues to code agent
};
```

### Tool Registry Implementation

```typescript
// Define tool schemas
interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, ParameterSchema>;
  returns: string;
  examples: Example[];
}

// Tool Registry
export const TOOL_REGISTRY: Record<string, ToolSchema> = {
  file_write: {
    name: "file_write",
    description: "Write or append content to a file",
    parameters: {
      path: {
        type: "string",
        description: "Path to the file",
        required: true
      },
      content: {
        type: "string",
        description: "Content to write",
        required: true
      },
      mode: {
        type: "string",
        enum: ["write", "append"],
        default: "write",
        description: "Write mode"
      }
    },
    returns: "Success status and file path",
    examples: [
      {
        input: { path: "src/app.ts", content: "console.log('hello');", mode: "write" },
        output: { success: true, path: "src/app.ts" }
      }
    ]
  },
  
  git_commit: {
    name: "git_commit",
    description: "Commit staged changes with a message",
    parameters: {
      message: {
        type: "string",
        description: "Commit message (use conventional commits format)",
        required: true
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "Files to stage (optional, stages all if omitted)"
      }
    },
    returns: "Commit hash and summary",
    examples: [
      {
        input: { message: "feat: add user authentication", files: ["src/auth.ts"] },
        output: { success: true, commit: "a1b2c3d", files_committed: 1 }
      }
    ]
  }
};
```

### Error Recovery Flow

```typescript
interface ErrorRecoveryStrategy {
  analyze(error: Error): ErrorAnalysis;
  decide(analysis: ErrorAnalysis): RecoveryAction;
  execute(action: RecoveryAction): Promise<Result>;
}

class AgenticErrorRecovery implements ErrorRecoveryStrategy {
  async analyze(error: Error): Promise<ErrorAnalysis> {
    // Use LLM to understand the error
    const analysis = await this.llm.analyze({
      error: error.message,
      stack: error.stack,
      context: this.workflowState
    });
    
    return {
      category: analysis.category,  // "missing_file", "permission", "syntax"
      severity: analysis.severity,  // "low", "medium", "high"
      fixable: analysis.fixable,    // Can we auto-fix?
      suggestion: analysis.suggestion
    };
  }
  
  decide(analysis: ErrorAnalysis): RecoveryAction {
    // Agentic decision making
    if (analysis.severity === "high" && !analysis.fixable) {
      return { type: "escalate", to: "human" };
    }
    
    if (analysis.category === "missing_file") {
      return { type: "create_file", path: analysis.missing_path };
    }
    
    if (analysis.category === "syntax") {
      return { type: "retry", with_correction: analysis.suggestion };
    }
    
    return { type: "retry", max_attempts: 2 };
  }
  
  async execute(action: RecoveryAction): Promise<Result> {
    // Execute the recovery action
    switch (action.type) {
      case "create_file":
        await this.toolEngine.execute("file_write", {
          path: action.path,
          content: "// Auto-generated\n"
        });
        break;
        
      case "retry":
        // Retry with modifications
        break;
        
      case "escalate":
        // Notify human
        await this.notifyHuman(action.reason);
        break;
    }
  }
}
```

---

## Quick Reference

### When to Use What

```
Need to perform a single action?
→ Tool Calling ✅

Need to accomplish a complex goal?
→ Agentic AI ✅

Need both planning AND execution?
→ Agentic Supervisor + Tool-calling Specialists ✅

Building a simple CRUD app?
→ Start with Tool Calling, add Agentic if complexity grows

Building a production system with quality requirements?
→ Full Agentic system from the start ✅
```

### Key Takeaways

| Concept | Tool Calling | Agentic AI |
|---------|-------------|------------|
| **What it does** | Executes functions | Plans & orchestrates |
| **Intelligence level** | Tactical (how) | Strategic (what & why) |
| **Scope** | Single action | Multi-step workflows |
| **Error handling** | Returns error | Analyzes & fixes |
| **Best for** | Simple tasks | Complex projects |
| **All agents need it?** | ✅ Yes | ❌ Usually just supervisor |

### Mental Model

```
🎯 Goal: Build a house

❌ Regular AI:
   "Here's how to build a house... [explains]"

✅ Tool-Calling AI:
   [calls: hammer_nail()]
   [calls: saw_wood()]
   [calls: paint_wall()]
   "I can use tools!"

⭐ Agentic AI:
   "I'll be your general contractor:
    1. Hired architect → got blueprints ✓
    2. Hired electrician → wiring done ✓
    3. Electrician found issue → fixed ✓
    4. Hired plumber → plumbing done ✓
    5. Inspector approved → passed ✓
    6. Your house is ready!"
```

---

## Further Reading

- [Multi-Agent System Architecture](Multi-Agent-System.md)
- [Model Preset Configuration](Configuration-Reference.md)
- [Tool Development Guide](Development-Guide.md)
- [Best Practices for Agents](Contributing-Guide.md)

---

## Summary

**Tool Calling** and **Agentic AI** are complementary:

- **Tool Calling** = The **hands** (execution)
- **Agentic AI** = The **brain** (planning & decision-making)

Together, they create a powerful system that can:
1. 🎯 Understand complex goals
2. 📋 Plan multi-step workflows
3. 🔧 Execute using the right tools
4. 🔍 Verify results
5. 🔄 Self-correct when needed
6. ✅ Deliver complete solutions

Our multi-agent system uses **Agentic supervisors** to orchestrate **Tool-calling specialists**, creating an efficient and reliable development workflow.

---

*Last updated: [Auto-generated]*
