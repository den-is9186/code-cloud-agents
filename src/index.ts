import { SupervisorAgent } from './agents/supervisor';
import { ArchitectAgent } from './agents/architect';
import { CoachAgent } from './agents/coach';
import { CodeAgent } from './agents/code';
import { ReviewAgent } from './agents/review';
import { TestAgent } from './agents/test';
import { DocsAgent } from './agents/docs';
import { VisionAgent } from './agents/vision';
import { BuildResult } from './agents/types';

interface RunConfig {
  task: string;
  projectPath: string;
  preset?: 'A' | 'B' | 'C' | 'D' | 'LOCAL' | 'V';
}

const PRESETS = {
  A: { supervisor: 'deepseek-r1', architect: 'deepseek-r1', coach: 'deepseek-r1', code: 'deepseek-v3', review: 'deepseek-r1', test: 'deepseek-v3' },
  B: { supervisor: 'deepseek-r1', architect: 'deepseek-r1', coach: 'deepseek-r1', code: 'deepseek-v3', review: 'deepseek-r1', test: 'deepseek-v3' },
  C: { supervisor: 'claude-sonnet-4', architect: 'claude-sonnet-4', coach: 'claude-sonnet-4', code: 'claude-sonnet-4', review: 'claude-sonnet-4', test: 'claude-sonnet-4' },
  D: { supervisor: 'deepseek-r1', architect: 'deepseek-r1', coach: 'deepseek-r1', code: 'claude-sonnet-4', review: 'deepseek-r1', test: 'deepseek-v3' },
  LOCAL: { supervisor: 'deepseek-r1', architect: 'deepseek-r1', coach: 'deepseek-r1', code: 'deepseek-v3', review: 'deepseek-r1', test: 'deepseek-v3' },
  V: { supervisor: 'deepseek-r1', architect: 'deepseek-r1', coach: 'deepseek-r1', code: 'deepseek-v3', review: 'deepseek-r1', test: 'deepseek-v3' }
};

export async function run(config: RunConfig): Promise<BuildResult> {
  const preset = config.preset || 'LOCAL';
  const models = PRESETS[preset];

  console.log(`🚀 Starting build with preset ${preset}`);
  console.log(`📋 Task: ${config.task}`);
  console.log(`📁 Project: ${config.projectPath}`);

  // Initialize supervisor
  const supervisor = new SupervisorAgent({
    model: models.supervisor,
    maxIterations: 3,
    preset
  });

  // Register agents
  supervisor.registerAgent(new ArchitectAgent(models.architect));
  supervisor.registerAgent(new CoachAgent(models.coach));
  supervisor.registerAgent(new CodeAgent(models.code));
  supervisor.registerAgent(new ReviewAgent(models.review));
  supervisor.registerAgent(new TestAgent(models.test));
  supervisor.registerAgent(new DocsAgent()); // Always local
  supervisor.registerAgent(new VisionAgent()); // Always local

  // Execute
  const result = await supervisor.execute({
    task: config.task,
    projectPath: config.projectPath
  });

  // Summary
  console.log('\n📊 Build Summary:');
  console.log(`   Success: ${result.success ? '✅' : '❌'}`);
  console.log(`   Files changed: ${result.filesChanged.length}`);
  console.log(`   Tests written: ${result.testsWritten.length}`);
  console.log(`   Docs updated: ${result.docsUpdated.length}`);
  console.log(`   Total cost: $${result.totalCost.toFixed(4)}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);

  return result;
}

// CLI
if (require.main === module) {
  const task = process.argv[2] || 'Add a /health endpoint';
  const projectPath = process.argv[3] || '.';
  const preset = (process.argv[4] || 'LOCAL') as RunConfig['preset'];

  run({ task, projectPath, preset }).catch(console.error);
}

export { SupervisorAgent, ArchitectAgent, CoachAgent, CodeAgent, ReviewAgent, TestAgent, DocsAgent, VisionAgent };
export type { RunConfig };
export { llmClient } from './llm/client';
export * from './agents/types';
