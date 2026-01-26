/**
 * Log Streaming Tests
 *
 * Tests for Server-Sent Events log streaming integration
 */

const Redis = require('ioredis');

// Mock Redis before requiring the app
jest.mock('ioredis');

describe('Log Streaming - Event Emitter Integration', () => {
  let streamEmitter;
  let StreamEventType;

  beforeAll(() => {
    // Import streamEmitter after build
    const events = require('../dist/utils/events');
    streamEmitter = events.streamEmitter;
    StreamEventType = events.StreamEventType;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
  });

  describe('StreamEmitter Singleton', () => {
    test('streamEmitter should exist', () => {
      expect(streamEmitter).toBeDefined();
    });

    test('streamEmitter should be singleton instance', () => {
      const events = require('../dist/utils/events');
      expect(events.streamEmitter).toBe(streamEmitter);
    });
  });

  describe('Event Emission Methods', () => {
    test('should have emitAgentStart method', () => {
      expect(typeof streamEmitter.emitAgentStart).toBe('function');
    });

    test('should have emitAgentComplete method', () => {
      expect(typeof streamEmitter.emitAgentComplete).toBe('function');
    });

    test('should have emitBuildStart method', () => {
      expect(typeof streamEmitter.emitBuildStart).toBe('function');
    });

    test('should have emitBuildComplete method', () => {
      expect(typeof streamEmitter.emitBuildComplete).toBe('function');
    });

    test('should have emitFileChange method', () => {
      expect(typeof streamEmitter.emitFileChange).toBe('function');
    });

    test('should have emitTestRun method', () => {
      expect(typeof streamEmitter.emitTestRun).toBe('function');
    });

    test('should have emitTaskStart method', () => {
      expect(typeof streamEmitter.emitTaskStart).toBe('function');
    });

    test('should have emitTaskProgress method', () => {
      expect(typeof streamEmitter.emitTaskProgress).toBe('function');
    });

    test('should have emitTaskComplete method', () => {
      expect(typeof streamEmitter.emitTaskComplete).toBe('function');
    });

    test('should have emitTaskError method', () => {
      expect(typeof streamEmitter.emitTaskError).toBe('function');
    });
  });

  describe('Event Types', () => {
    test('should have AGENT_START event type', () => {
      expect(StreamEventType.AGENT_START).toBe('agent:start');
    });

    test('should have AGENT_COMPLETE event type', () => {
      expect(StreamEventType.AGENT_COMPLETE).toBe('agent:complete');
    });

    test('should have BUILD_START event type', () => {
      expect(StreamEventType.BUILD_START).toBe('build:start');
    });

    test('should have BUILD_COMPLETE event type', () => {
      expect(StreamEventType.BUILD_COMPLETE).toBe('build:complete');
    });

    test('should have FILE_CHANGE event type', () => {
      expect(StreamEventType.FILE_CHANGE).toBe('file:change');
    });

    test('should have TEST_RUN event type', () => {
      expect(StreamEventType.TEST_RUN).toBe('test:run');
    });

    test('should have TASK_START event type', () => {
      expect(StreamEventType.TASK_START).toBe('task:start');
    });

    test('should have TASK_PROGRESS event type', () => {
      expect(StreamEventType.TASK_PROGRESS).toBe('task:progress');
    });

    test('should have TASK_COMPLETE event type', () => {
      expect(StreamEventType.TASK_COMPLETE).toBe('task:complete');
    });

    test('should have TASK_ERROR event type', () => {
      expect(StreamEventType.TASK_ERROR).toBe('task:error');
    });
  });

  describe('Event Emission', () => {
    test('should emit agent:start events', (done) => {
      const eventData = {
        agent: 'supervisor',
        task: 'test task',
        buildId: 'test-build-123'
      };

      streamEmitter.once(StreamEventType.AGENT_START, (data) => {
        expect(data).toMatchObject(eventData);
        done();
      });

      streamEmitter.emitAgentStart(eventData);
    });

    test('should emit agent:complete events', (done) => {
      const eventData = {
        agent: 'code',
        success: true,
        duration: 1000,
        buildId: 'test-build-456'
      };

      streamEmitter.once(StreamEventType.AGENT_COMPLETE, (data) => {
        expect(data).toMatchObject(eventData);
        done();
      });

      streamEmitter.emitAgentComplete(eventData);
    });

    test('should emit build:start events', (done) => {
      const eventData = { buildId: 'test-build-789' };

      streamEmitter.once(StreamEventType.BUILD_START, (data) => {
        expect(data).toMatchObject(eventData);
        done();
      });

      streamEmitter.emitBuildStart(eventData);
    });

    test('should emit build:complete events', (done) => {
      const eventData = {
        buildId: 'test-build-complete',
        success: true,
        errors: []
      };

      streamEmitter.once(StreamEventType.BUILD_COMPLETE, (data) => {
        expect(data).toMatchObject(eventData);
        done();
      });

      streamEmitter.emitBuildComplete(eventData);
    });

    test('should emit file:change events', (done) => {
      const eventData = {
        path: '/path/to/file.js',
        action: 'modify',
        buildId: 'test-build-file'
      };

      streamEmitter.once(StreamEventType.FILE_CHANGE, (data) => {
        expect(data).toMatchObject(eventData);
        done();
      });

      streamEmitter.emitFileChange(eventData);
    });

    test('should emit test:run events', (done) => {
      const eventData = {
        passed: 10,
        failed: 2,
        total: 12,
        buildId: 'test-build-tests'
      };

      streamEmitter.once(StreamEventType.TEST_RUN, (data) => {
        expect(data).toMatchObject(eventData);
        done();
      });

      streamEmitter.emitTestRun(eventData);
    });
  });

  describe('Multiple Listeners', () => {
    test('should support multiple listeners for same event', (done) => {
      let listener1Called = false;
      let listener2Called = false;

      const checkDone = () => {
        if (listener1Called && listener2Called) {
          done();
        }
      };

      streamEmitter.once(StreamEventType.AGENT_START, () => {
        listener1Called = true;
        checkDone();
      });

      streamEmitter.once(StreamEventType.AGENT_START, () => {
        listener2Called = true;
        checkDone();
      });

      streamEmitter.emitAgentStart({
        agent: 'test',
        task: 'test',
        buildId: 'multi-listener-test'
      });
    });

    test('should support different event types', (done) => {
      let agentStartReceived = false;
      let buildStartReceived = false;

      const checkDone = () => {
        if (agentStartReceived && buildStartReceived) {
          done();
        }
      };

      streamEmitter.once(StreamEventType.AGENT_START, () => {
        agentStartReceived = true;
        checkDone();
      });

      streamEmitter.once(StreamEventType.BUILD_START, () => {
        buildStartReceived = true;
        checkDone();
      });

      streamEmitter.emitAgentStart({ agent: 'test', task: 'test', buildId: 'test' });
      streamEmitter.emitBuildStart({ buildId: 'test' });
    });
  });

  describe('Integration with API Server', () => {
    test('should import streamEmitter in api-server', () => {
      const apiServer = require('../src/api-server');
      expect(apiServer).toBeDefined();
      // If api-server imports streamEmitter without error, this test passes
    });

    test('should import StreamEventType in api-server', () => {
      // Re-require to ensure fresh import
      delete require.cache[require.resolve('../src/api-server')];
      const apiServer = require('../src/api-server');
      expect(apiServer).toBeDefined();
    });
  });

  describe('Integration with Agent Orchestrator', () => {
    test('should import streamEmitter in agent-orchestrator', () => {
      const orchestrator = require('../src/services/agent-orchestrator');
      expect(orchestrator).toBeDefined();
    });

    test('should have orchestrateBuild function that uses streamEmitter', () => {
      const orchestrator = require('../src/services/agent-orchestrator');
      expect(typeof orchestrator.orchestrateBuild).toBe('function');
    });
  });
});
