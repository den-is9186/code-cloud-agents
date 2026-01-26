# 🔧 AIDER BUGFIX TASKS - Code Review Fixes

> **Anweisung:** Führe diese Tasks der Reihe nach aus.
> **Quelle:** CODE_REVIEW_REPORT.md (59 Findings)
> **Priorität:** Kritische Security + Crash Bugs zuerst

---

## TASK 1: Command Injection Fix (SEC-002) ⚠️ CRITICAL

**Datei:** `src/tools/index.ts`

**Problem:** Git commands sind anfällig für Command Injection

**Finde und ersetze ALLE Stellen wo shell commands so aussehen:**
```typescript
// GEFÄHRLICH - FINDEN:
await execAsync(`git commit -m "${message}"`);
await execAsync(`git add ${file}`);
```

**Ersetze mit sicherer Version:**
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

// SICHER - ERSETZEN MIT:
await execFileAsync('git', ['commit', '-m', message]);
await execFileAsync('git', ['add', file]);
```

**Alle git commands in src/tools/index.ts müssen execFileAsync nutzen!**

---

## TASK 2: Path Traversal Fix (SEC-001) ⚠️ CRITICAL

**Datei:** `src/tools/index.ts`

**Problem:** Keine Validierung gegen `../` Path Traversal Attacks

**Füge diese Funktion am Anfang der Datei hinzu:**
```typescript
import path from 'path';

const BASE_DIR = process.cwd();

function validatePath(filePath: string): string {
  const resolved = path.resolve(BASE_DIR, filePath);
  if (!resolved.startsWith(BASE_DIR)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  return resolved;
}
```

**Dann: Alle file_read, file_write, file_delete Funktionen müssen validatePath() nutzen:**
```typescript
// VORHER:
const content = await fs.readFile(filePath, 'utf-8');

// NACHHER:
const safePath = validatePath(filePath);
const content = await fs.readFile(safePath, 'utf-8');
```

---

## TASK 3: JSON Schema Validation (BUG-001) ⚠️ CRITICAL

**Dateien:** Alle `src/agents/*.ts`

**Problem:** JSON.parse() ohne Validation kann crashen

**Schritt 1: Installiere zod (falls nicht vorhanden)**
```bash
npm install zod
```

**Schritt 2: Erstelle neue Datei `src/utils/schemas.ts`:**
```typescript
import { z } from 'zod';

// Schema für Architect Runbook
export const RunbookSchema = z.object({
  overview: z.string(),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    files: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional()
  }))
});

// Schema für Code Agent Response
export const CodeResponseSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    action: z.enum(['create', 'update', 'delete'])
  }))
});

// Schema für Review Agent Response
export const ReviewResponseSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    severity: z.enum(['error', 'warning', 'info']),
    message: z.string()
  })).optional(),
  suggestions: z.array(z.string()).optional()
});

// Schema für Test Agent Response
export const TestResponseSchema = z.object({
  passed: z.boolean(),
  results: z.array(z.object({
    name: z.string(),
    status: z.enum(['pass', 'fail', 'skip']),
    error: z.string().optional()
  })).optional()
});

// Safe JSON parse helper
export function safeJsonParse<T>(
  content: string, 
  schema: z.ZodSchema<T>,
  fallback?: T
): T {
  try {
    const parsed = JSON.parse(content);
    return schema.parse(parsed);
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw new Error(`JSON validation failed: ${error}`);
  }
}
```

**Schritt 3: Update alle Agents um schemas zu nutzen:**

In `src/agents/architect.ts`:
```typescript
import { RunbookSchema, safeJsonParse } from '../utils/schemas';
// ...
const runbook = safeJsonParse(response.content, RunbookSchema);
```

In `src/agents/code.ts`:
```typescript
import { CodeResponseSchema, safeJsonParse } from '../utils/schemas';
// ...
const result = safeJsonParse(response.content, CodeResponseSchema);
```

**Mache das gleiche für review.ts, test.ts, docs.ts, vision.ts, coach.ts**

---

## TASK 4: Supervisor Error Handling (BUG-002) ⚠️ CRITICAL

**Datei:** `src/agents/supervisor.ts`

**Problem:** `this.agents.get('architect')!` kann undefined sein

**Finde alle Stellen mit `this.agents.get(...)`:**
```typescript
// VORHER (unsicher):
const architect = this.agents.get('architect')!;
await architect.execute(input);
```

**Ersetze mit sicherer Version:**
```typescript
// NACHHER (sicher):
private getAgent(name: string): Agent {
  const agent = this.agents.get(name);
  if (!agent) {
    throw new Error(`Agent '${name}' not registered. Available: ${[...this.agents.keys()].join(', ')}`);
  }
  return agent;
}

// Nutzung:
const architect = this.getAgent('architect');
await architect.execute(input);
```

**Füge die getAgent() helper method zur Supervisor Klasse hinzu und ersetze alle direkten .get() Aufrufe.**

---

## TASK 5: Race Condition Fix (BUG-003) 🔴 HIGH

**Datei:** `src/agents/supervisor.ts`

**Problem:** `filesChanged` Array wird concurrent modifiziert

**Finde den Code wo filesChanged geändert wird:**
```typescript
// VORHER (Race Condition):
for (const task of tasks) {
  const result = await this.executeTask(task);
  filesChanged.push(...result.files); // GEFÄHRLICH bei parallel!
}
```

**Ersetze mit sicherer sequentieller Verarbeitung:**
```typescript
// NACHHER (sicher):
const results: string[] = [];
for (const task of tasks) {
  const result = await this.executeTask(task);
  results.push(...result.files);
}
// Erst am Ende zuweisen
filesChanged = [...filesChanged, ...results];
```

**ODER wenn parallel gewünscht, nutze Mutex:**
```typescript
// Alternative mit gesammelten Results:
const taskResults = await Promise.all(
  tasks.map(task => this.executeTask(task))
);
const allFiles = taskResults.flatMap(r => r.files);
filesChanged = [...filesChanged, ...allFiles];
```

---

## TASK 6: LLM Client Retry Logic (BUG-004) 🔴 HIGH

**Datei:** `src/llm/client.ts`

**Problem:** Keine Retry-Logic, Timeout, Rate-Limiting

**Füge retry wrapper hinzu:**
```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  timeout: 60000
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), config.timeout);
      });
      
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on validation errors
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        console.log(`Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
```

**Wrap alle LLM API calls mit withRetry():**
```typescript
// VORHER:
const response = await this.client.chat(messages);

// NACHHER:
const response = await withRetry(() => this.client.chat(messages));
```

---

## TASK 7: Memory Leak Fix (BUG-005) 🟡 MEDIUM

**Datei:** `src/chat/assistant.ts`

**Problem:** conversationHistory wächst unbegrenzt

**Füge sliding window hinzu:**
```typescript
const MAX_HISTORY_LENGTH = 50; // Behalte nur letzte 50 Messages

private pruneHistory(): void {
  if (this.conversationHistory.length > MAX_HISTORY_LENGTH) {
    // Behalte System Message + letzte N Messages
    const systemMessages = this.conversationHistory.filter(m => m.role === 'system');
    const recentMessages = this.conversationHistory
      .filter(m => m.role !== 'system')
      .slice(-MAX_HISTORY_LENGTH);
    
    this.conversationHistory = [...systemMessages, ...recentMessages];
  }
}

// Rufe pruneHistory() nach jeder neuen Message auf:
async chat(message: string): Promise<string> {
  this.conversationHistory.push({ role: 'user', content: message });
  this.pruneHistory(); // <-- NEU
  
  const response = await this.llm.chat(this.conversationHistory);
  
  this.conversationHistory.push({ role: 'assistant', content: response });
  this.pruneHistory(); // <-- NEU
  
  return response;
}
```

---

## TASK 8: Input Validation Helper (IMP-001) 🟡 MEDIUM

**Erstelle neue Datei:** `src/utils/validation.ts`

```typescript
import { z } from 'zod';

// Gemeinsame Validatoren
export const FilePathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .refine(p => !p.includes('..'), 'Path traversal not allowed')
  .refine(p => !p.startsWith('/'), 'Absolute paths not allowed');

export const TaskIdSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Task ID must be lowercase alphanumeric with dashes');

export const BuildConfigSchema = z.object({
  task: z.string().min(1),
  model: z.string().optional(),
  maxIterations: z.number().min(1).max(10).optional(),
  dryRun: z.boolean().optional()
});

// Validation helper
export function validate<T>(data: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
  return result.data;
}
```

---

## TASK 9: Constants statt Magic Numbers (OPT-008) 🟢 LOW

**Erstelle neue Datei:** `src/config/constants.ts`

```typescript
export const SUPERVISOR_CONFIG = {
  MAX_REVIEW_ITERATIONS: 3,
  MAX_TEST_RETRIES: 2,
  TASK_TIMEOUT_MS: 300000, // 5 minutes
} as const;

export const LLM_CONFIG = {
  DEFAULT_TIMEOUT_MS: 60000,
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
} as const;

export const CHAT_CONFIG = {
  MAX_HISTORY_LENGTH: 50,
} as const;

export const FILE_CONFIG = {
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  ALLOWED_EXTENSIONS: ['.ts', '.js', '.json', '.md', '.txt', '.yaml', '.yml'],
} as const;
```

**Dann ersetze alle magic numbers in den anderen Dateien mit diesen Constants.**

---

## 📋 AUSFÜHRUNG

**Reihenfolge (nach Priorität):**

```bash
# 1. Security Fixes ZUERST
aider --message "Führe TASK 1 aus: Command Injection Fix" src/tools/index.ts

aider --message "Führe TASK 2 aus: Path Traversal Fix" src/tools/index.ts

# 2. Crash Bugs
aider --message "Führe TASK 3 aus: Erstelle src/utils/schemas.ts mit Zod Schemas" src/utils/schemas.ts

aider --message "Führe TASK 3 fort: Update alle Agents um schemas zu nutzen" src/agents/*.ts

aider --message "Führe TASK 4 aus: Supervisor Error Handling" src/agents/supervisor.ts

aider --message "Führe TASK 5 aus: Race Condition Fix" src/agents/supervisor.ts

# 3. Stability
aider --message "Führe TASK 6 aus: LLM Client Retry Logic" src/llm/client.ts

aider --message "Führe TASK 7 aus: Memory Leak Fix" src/chat/assistant.ts

# 4. Code Quality
aider --message "Führe TASK 8 aus: Input Validation Helper" src/utils/validation.ts

aider --message "Führe TASK 9 aus: Constants Datei erstellen" src/config/constants.ts
```

---

## ✅ NACH ALLEN TASKS

```bash
# TypeScript kompilieren
npm run build

# Tests laufen lassen
npm test

# Manueller Test
npm run chat
```

---

## 📊 ERWARTETES ERGEBNIS

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Security Issues | 4 | 0 |
| Critical Bugs | 3 | 0 |
| High Bugs | 4 | 0 |
| Code Quality Score | 6.5/10 | ~8/10 |

---

**Erstellt:** 26. Januar 2026
**Basiert auf:** CODE_REVIEW_REPORT.md
**Geschätzte Zeit:** 2-3 Stunden (alle Tasks)
