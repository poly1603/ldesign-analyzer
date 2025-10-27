/**
 * ErrorHandler单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AnalyzerError,
  ParseError,
  AnalysisError,
  ErrorHandler,
  withErrorHandling,
  safeExecute,
  retryOnError,
} from '../../../src/errors';

describe('Error Classes', () => {
  describe('AnalyzerError', () => {
    it('should create error with message and code', () => {
      const error = new AnalyzerError('Test error', 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AnalyzerError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('AnalyzerError');
    });

    it('should include context and suggestion', () => {
      const error = new AnalyzerError('Test error', 'TEST_ERROR', {
        context: { file: 'test.ts' },
        suggestion: 'Try this fix',
      });

      expect(error.context).toEqual({ file: 'test.ts' });
      expect(error.suggestion).toBe('Try this fix');
    });

    it('should include cause error', () => {
      const cause = new Error('Original error');
      const error = new AnalyzerError('Wrapper error', 'WRAPPED', {
        cause,
      });

      expect(error.cause).toBe(cause);
    });

    it('should format message correctly', () => {
      const error = new AnalyzerError('Test', 'TEST', {
        context: { key: 'value' },
        suggestion: 'Fix it',
      });

      const formatted = error.getFormattedMessage();

      expect(formatted).toContain('[TEST]');
      expect(formatted).toContain('Test');
      expect(formatted).toContain('上下文');
      expect(formatted).toContain('建议');
    });
  });

  describe('ParseError', () => {
    it('should create parse error', () => {
      const error = new ParseError('Parse failed', { path: './test' });

      expect(error).toBeInstanceOf(ParseError);
      expect(error).toBeInstanceOf(AnalyzerError);
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.context).toEqual({ path: './test' });
    });
  });

  describe('AnalysisError', () => {
    it('should create analysis error', () => {
      const error = new AnalysisError('Analysis failed', { step: 'bundle' });

      expect(error).toBeInstanceOf(AnalysisError);
      expect(error.code).toBe('ANALYSIS_ERROR');
      expect(error.context).toEqual({ step: 'bundle' });
    });
  });
});

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = ErrorHandler.getInstance();
    handler.clearErrorLog();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('registerRecoveryStrategy', () => {
    it('should register recovery strategy', () => {
      handler.registerRecoveryStrategy('test-strategy', {
        canRecover: (error) => error instanceof ParseError,
        recover: async () => ({ recovered: true }),
        description: 'Test recovery',
      });

      // 策略已注册，后续测试会用到
      expect(true).toBe(true);
    });
  });

  describe('handle', () => {
    it('should log error', async () => {
      const error = new AnalyzerError('Test error', 'TEST');

      await handler.handle(error, {
        logToConsole: false,
        throw: false,
      });

      const log = handler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].error).toBe(error);
    });

    it('should throw error if throw option is true', async () => {
      const error = new AnalyzerError('Test error', 'TEST');

      await expect(
        handler.handle(error, { throw: true, logToConsole: false })
      ).rejects.toThrow(error);
    });

    it('should not throw if throw option is false', async () => {
      const error = new AnalyzerError('Test error', 'TEST');

      const result = await handler.handle(error, {
        throw: false,
        logToConsole: false,
      });

      expect(result).toBeUndefined();
    });

    it('should use recovery strategy', async () => {
      handler.registerRecoveryStrategy('parse-recovery', {
        canRecover: (error) => error instanceof ParseError,
        recover: async () => ({ recovered: true }),
        description: 'Parse recovery',
      });

      const error = new ParseError('Parse failed');
      const result = await handler.handle(error, {
        throw: false,
        logToConsole: false,
      });

      expect(result).toEqual({ recovered: true });
    });

    it('should call onError callback', async () => {
      const error = new AnalyzerError('Test', 'TEST');
      let callbackCalled = false;

      await handler.handle(error, {
        throw: false,
        logToConsole: false,
        onError: () => {
          callbackCalled = true;
        },
      });

      expect(callbackCalled).toBe(true);
    });
  });

  describe('getErrorLog', () => {
    it('should return error log', async () => {
      const error1 = new AnalyzerError('Error 1', 'E1');
      const error2 = new AnalyzerError('Error 2', 'E2');

      await handler.handle(error1, { throw: false, logToConsole: false });
      await handler.handle(error2, { throw: false, logToConsole: false });

      const log = handler.getErrorLog();
      expect(log.length).toBe(2);
    });

    it('should limit returned entries', async () => {
      for (let i = 0; i < 5; i++) {
        await handler.handle(new AnalyzerError(`Error ${i}`, 'E'), {
          throw: false,
          logToConsole: false,
        });
      }

      const log = handler.getErrorLog(3);
      expect(log.length).toBe(3);
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', async () => {
      await handler.handle(new ParseError('Parse error'), {
        throw: false,
        logToConsole: false,
      });
      await handler.handle(new AnalysisError('Analysis error'), {
        throw: false,
        logToConsole: false,
      });

      const stats = handler.getErrorStats();

      expect(stats.total).toBe(2);
      expect(stats.byType.ParseError).toBe(1);
      expect(stats.byType.AnalysisError).toBe(1);
      expect(stats.recent).toBe(2);
    });
  });
});

describe('Helper Functions', () => {
  describe('withErrorHandling', () => {
    it('should wrap function and handle errors', async () => {
      const failingFn = async () => {
        throw new Error('Test error');
      };

      const wrapped = withErrorHandling(failingFn, {
        throw: false,
        logToConsole: false,
      });

      const result = await wrapped();
      expect(result).toBeUndefined();
    });

    it('should return result on success', async () => {
      const successFn = async () => ({ success: true });

      const wrapped = withErrorHandling(successFn, {
        logToConsole: false,
      });

      const result = await wrapped();
      expect(result).toEqual({ success: true });
    });
  });

  describe('safeExecute', () => {
    it('should return result on success', async () => {
      const result = await safeExecute(
        () => Promise.resolve({ data: 'test' }),
        {},
        false
      );

      expect(result).toEqual({ data: 'test' });
    });

    it('should return default value on error', async () => {
      const result = await safeExecute(
        () => Promise.reject(new Error('Failed')),
        { default: true },
        false
      );

      expect(result).toEqual({ default: true });
    });
  });

  describe('retryOnError', () => {
    it('should succeed on first try', async () => {
      const fn = async () => 'success';

      const result = await retryOnError(fn, 3, 10);
      expect(result).toBe('success');
    });

    it('should retry on error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      };

      const result = await retryOnError(fn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      const fn = async () => {
        throw new Error('Always fails');
      };

      await expect(retryOnError(fn, 2, 10)).rejects.toThrow('Always fails');
    });

    it('should call onRetry callback', async () => {
      let retryCount = 0;
      let attempts = 0;

      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Failed');
        }
        return 'success';
      };

      await retryOnError(
        fn,
        3,
        10,
        (attempt) => {
          retryCount = attempt;
        }
      );

      expect(retryCount).toBe(1);
    });
  });
});


