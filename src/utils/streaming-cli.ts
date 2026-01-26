import { streamEmitter, StreamEventType } from './events';
import { logger } from './logger';

/**
 * CLI Progress Bar and Streaming Output
 */
export class StreamingCLI {
  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Build events
    streamEmitter.on(StreamEventType.BUILD_START, () => {
      console.log('\n🚀 Build started...\n');
    });

    streamEmitter.on(StreamEventType.BUILD_COMPLETE, (event: any) => {
      if (event.success) {
        console.log('\n✅ Build completed successfully!\n');
      } else {
        console.log('\n❌ Build failed!');
        if (event.errors && event.errors.length > 0) {
          console.log('Errors:');
          event.errors.forEach((err: string) => console.log(`  - ${err}`));
        }
        console.log();
      }
    });

    // Agent events
    streamEmitter.on(StreamEventType.AGENT_START, (event: any) => {
      console.log(`📐 ${event.agent}: ${event.task}`);
    });

    streamEmitter.on(StreamEventType.AGENT_COMPLETE, (event: any) => {
      const emoji = event.success ? '✅' : '❌';
      const duration = (event.duration / 1000).toFixed(1);
      console.log(`${emoji} ${event.agent} completed in ${duration}s`);
    });

    // Task events
    streamEmitter.on(StreamEventType.TASK_START, (event: any) => {
      console.log(`  ⚡ Task: ${event.description}`);
    });

    streamEmitter.on(StreamEventType.TASK_PROGRESS, (event: any) => {
      const progress = Math.round(event.progress);
      const bar = this.createProgressBar(progress);
      process.stdout.write(`\r  ${bar} ${progress}% - ${event.message}`);
    });

    streamEmitter.on(StreamEventType.TASK_COMPLETE, (event: any) => {
      const duration = (event.duration / 1000).toFixed(1);
      const emoji = event.success ? '✅' : '❌';
      console.log(`\r  ${emoji} Completed in ${duration}s`);
    });

    streamEmitter.on(StreamEventType.TASK_ERROR, (event: any) => {
      console.log(`\r  ❌ Error: ${event.error}`);
    });

    // File change events
    streamEmitter.on(StreamEventType.FILE_CHANGE, (event: any) => {
      const actionMap: Record<string, string> = {
        create: '📝',
        modify: '✏️',
        delete: '🗑️',
      };
      const actionEmoji = actionMap[event.action] || '📄';
      console.log(`    ${actionEmoji} ${event.path}`);
    });

    // Test events
    streamEmitter.on(StreamEventType.TEST_RUN, (event: any) => {
      const { passed, failed, total } = event;
      console.log(`    🧪 Tests: ${passed}/${total} passed, ${failed} failed`);
    });
  }

  private createProgressBar(progress: number): string {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * Enable streaming output
   */
  static enable() {
    return new StreamingCLI();
  }
}

// Auto-enable in CLI mode
if (require.main === module || process.env.ENABLE_STREAMING === 'true') {
  StreamingCLI.enable();
  logger.info('Streaming CLI enabled');
}
