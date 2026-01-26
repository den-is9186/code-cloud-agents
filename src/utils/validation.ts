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
    const errors = result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
  return result.data;
}
