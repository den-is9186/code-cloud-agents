import { z } from 'zod';

// Gemeinsame Validatoren
export const FilePathSchema = z
  .string()
  .min(1, 'Path cannot be empty')
  .refine((p) => !p.includes('..'), 'Path traversal not allowed')
  .refine((p) => !p.startsWith('/'), 'Absolute paths not allowed');

export const TaskIdSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Task ID must be lowercase alphanumeric with dashes');

export const BuildConfigSchema = z.object({
  task: z.string().min(1),
  model: z.string().optional(),
  maxIterations: z.number().min(1).max(10).optional(),
  dryRun: z.boolean().optional(),
});

// Validation helper
export function validate<T>(data: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
  return result.data;
}

// BUG-001: Safe JSON parsing with schema validation
export function safeJsonParse<T>(json: string, schema: z.ZodSchema<T>): T {
  try {
    const parsed = JSON.parse(json);
    return validate(parsed, schema);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

// Agent Response Schemas
export const RunbookStepSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  commands: z.array(z.string()),
  expectedOutcome: z.string().optional(),
});

export const RunbookResponseSchema = z.object({
  runbook: z.string(),
  steps: z.array(RunbookStepSchema),
  estimatedTime: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  estimatedHours: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
});

export const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  totalEstimatedHours: z.number().optional(),
  executionOrder: z.array(z.string()).optional(),
});

export const CodeChangeSchema = z.object({
  file: z.string(),
  changes: z.string(),
  reasoning: z.string().optional(),
});

export const CodeResponseSchema = z.object({
  filesChanged: z.array(CodeChangeSchema),
  summary: z.string().optional(),
  testsAdded: z.boolean().optional(),
});

export const ReviewIssueSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const ReviewResponseSchema = z.object({
  approved: z.boolean(),
  issues: z.array(ReviewIssueSchema),
  overallQuality: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
});

export const TestResultSchema = z.object({
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  duration: z.number().optional(),
});

export const TestResponseSchema = z.object({
  testsWritten: z.array(z.string()),
  testResults: TestResultSchema.optional(),
  coverage: z.number().min(0).max(100).optional(),
});

export const DocsResponseSchema = z.object({
  filesDocumented: z.array(z.string()),
  coverage: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
});

export const VisionAnalysisSchema = z.object({
  layout: z
    .object({
      type: z.string(),
      columns: z.number().optional(),
      gap: z.string().optional(),
    })
    .optional(),
  components: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
        variant: z.string().optional(),
        position: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional(),
      })
    )
    .optional(),
  colors: z.record(z.string(), z.string()).optional(),
  typography: z
    .record(
      z.string(),
      z.object({
        family: z.string().optional(),
        size: z.string().optional(),
        weight: z.number().optional(),
      })
    )
    .optional(),
  spacing: z.record(z.string(), z.string()).optional(),
});

export const VisionResponseSchema = z.object({
  analysis: VisionAnalysisSchema,
  generatedCode: z
    .array(
      z.object({
        file: z.string(),
        content: z.string(),
        language: z.string(),
      })
    )
    .optional(),
  summary: z.string().optional(),
});
