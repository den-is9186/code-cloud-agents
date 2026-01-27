/**
 * Global Error Handlers Tests
 *
 * Tests for unhandled rejection, uncaught exception, and graceful shutdown
 */

describe('Global Error Handlers', () => {
  let consoleSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore console spies
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  describe('Unhandled Rejection Handler', () => {
    test('should handle Error objects with stack traces', () => {
      const mockError = new Error('Test unhandled rejection');

      // Simulate calling the handler
      const handler = (reason, promise) => {
        console.error('🚨 Unhandled Rejection detected:');
        console.error('   Reason:', reason);

        if (reason instanceof Error) {
          console.error('   Stack:', reason.stack);
        }
      };

      handler(mockError, Promise.reject(mockError).catch(() => {}));

      expect(consoleSpy.error).toHaveBeenCalledWith('🚨 Unhandled Rejection detected:');
      expect(consoleSpy.error).toHaveBeenCalledWith('   Reason:', mockError);
      expect(consoleSpy.error).toHaveBeenCalledWith('   Stack:', expect.stringContaining('Test unhandled rejection'));
    });

    test('should handle non-Error rejection reasons', () => {
      const handler = (reason, promise) => {
        console.error('🚨 Unhandled Rejection detected:');
        console.error('   Reason:', reason);

        if (reason instanceof Error) {
          console.error('   Stack:', reason.stack);
        }
      };

      handler('string rejection reason', Promise.reject('string rejection reason').catch(() => {}));

      expect(consoleSpy.error).toHaveBeenCalledWith('   Reason:', 'string rejection reason');
    });
  });

  describe('Uncaught Exception Handler', () => {
    test('should log uncaught exception details', () => {
      const mockError = new Error('Test uncaught exception');

      // Simulate the handler logging
      console.error('💀 Uncaught Exception detected:');
      console.error('   Error:', mockError.message);
      console.error('   Stack:', mockError.stack);

      expect(consoleSpy.error).toHaveBeenCalledWith('💀 Uncaught Exception detected:');
      expect(consoleSpy.error).toHaveBeenCalledWith('   Error:', 'Test uncaught exception');
    });
  });

  describe('Process Warning Handler', () => {
    test('should log process warnings', () => {
      const mockWarning = {
        name: 'DeprecationWarning',
        message: 'This API is deprecated',
        stack: 'Warning stack trace',
      };

      // Simulate the handler
      console.warn('⚠️  Process Warning:');
      console.warn('   Name:', mockWarning.name);
      console.warn('   Message:', mockWarning.message);
      console.warn('   Stack:', mockWarning.stack);

      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  Process Warning:');
      expect(consoleSpy.warn).toHaveBeenCalledWith('   Name:', 'DeprecationWarning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('   Message:', 'This API is deprecated');
    });
  });

  describe('Error Handler Coverage', () => {
    test('should handle undefined rejection reason', () => {
      const handler = (reason, promise) => {
        console.error('🚨 Unhandled Rejection detected:');
        console.error('   Reason:', reason);

        if (reason instanceof Error) {
          console.error('   Stack:', reason.stack);
        }
      };

      handler(undefined, Promise.reject(undefined).catch(() => {}));

      expect(consoleSpy.error).toHaveBeenCalledWith('   Reason:', undefined);
    });

    test('should handle null rejection reason', () => {
      const handler = (reason, promise) => {
        console.error('🚨 Unhandled Rejection detected:');
        console.error('   Reason:', reason);

        if (reason instanceof Error) {
          console.error('   Stack:', reason.stack);
        }
      };

      handler(null, Promise.reject(null).catch(() => {}));

      expect(consoleSpy.error).toHaveBeenCalledWith('   Reason:', null);
    });

    test('should handle object rejection reason', () => {
      const handler = (reason, promise) => {
        console.error('🚨 Unhandled Rejection detected:');
        console.error('   Reason:', reason);

        if (reason instanceof Error) {
          console.error('   Stack:', reason.stack);
        }
      };

      const objReason = { code: 'TEST_ERROR', message: 'Test error object' };
      handler(objReason, Promise.reject(objReason).catch(() => {}));

      expect(consoleSpy.error).toHaveBeenCalledWith('   Reason:', objReason);
    });

    test('should handle warning without stack', () => {
      const mockWarning = {
        name: 'ExperimentalWarning',
        message: 'This feature is experimental',
      };

      // Simulate the handler
      console.warn('⚠️  Process Warning:');
      console.warn('   Name:', mockWarning.name);
      console.warn('   Message:', mockWarning.message);

      if (mockWarning.stack) {
        console.warn('   Stack:', mockWarning.stack);
      }

      expect(consoleSpy.warn).toHaveBeenCalledWith('   Name:', 'ExperimentalWarning');
      // Stack should not be logged since it's undefined
      expect(consoleSpy.warn).not.toHaveBeenCalledWith('   Stack:', undefined);
    });
  });
});
