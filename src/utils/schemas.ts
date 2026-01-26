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
