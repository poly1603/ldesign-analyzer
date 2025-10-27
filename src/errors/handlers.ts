/**
 * 错误处理器
 * 
 * @description 提供统一的错误处理和恢复机制
 * @module errors/handlers
 */

import {
  AnalyzerError,
  ParseError,
  AnalysisError,
  FileSystemError,
  ValidationError,
} from './index';

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否在控制台输出错误 */
  logToConsole?: boolean;
  /** 是否抛出错误（如果为false，则返回默认值） */
  throw?: boolean;
  /** 错误发生时的回调 */
  onError?: (error: Error) => void;
  /** 是否包含堆栈跟踪 */
  includeStack?: boolean;
}

/**
 * 错误恢复策略
 */
export interface RecoveryStrategy<T> {
  /** 是否可以恢复 */
  canRecover: (error: Error) => boolean;
  /** 恢复函数 */
  recover: (error: Error) => T | Promise<T>;
  /** 恢复描述 */
  description: string;
}

/**
 * 全局错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private recoveryStrategies: Map<string, RecoveryStrategy<any>> = new Map();
  private errorLog: Array<{ timestamp: number; error: Error }> = [];

  private constructor() { }

  /**
   * 获取错误处理器单例
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 注册恢复策略
   * 
   * @param name 策略名称
   * @param strategy 恢复策略
   * @example
   * ```typescript
   * errorHandler.registerRecoveryStrategy('parse-fallback', {
   *   canRecover: (error) => error instanceof ParseError,
   *   recover: async (error) => ({ modules: [], chunks: [] }),
   *   description: '解析失败时返回空数据'
   * });
   * ```
   */
  public registerRecoveryStrategy<T>(
    name: string,
    strategy: RecoveryStrategy<T>
  ): void {
    this.recoveryStrategies.set(name, strategy);
  }

  /**
   * 处理错误并尝试恢复
   * 
   * @param error 错误对象
   * @param options 处理选项
   * @returns 恢复的值或undefined
   * @throws 如果无法恢复且options.throw为true
   */
  public async handle<T>(
    error: Error,
    options: ErrorHandlerOptions = {}
  ): Promise<T | undefined> {
    const {
      logToConsole = true,
      throw: shouldThrow = true,
      onError,
      includeStack = false,
    } = options;

    // 记录错误
    this.errorLog.push({
      timestamp: Date.now(),
      error,
    });

    // 调用回调
    if (onError) {
      try {
        onError(error);
      } catch (callbackError) {
        console.error('错误回调执行失败:', callbackError);
      }
    }

    // 输出到控制台
    if (logToConsole) {
      this.logError(error, includeStack);
    }

    // 尝试恢复
    for (const [name, strategy] of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          console.log(`🔄 尝试恢复策略: ${strategy.description}`);
          const recovered = await strategy.recover(error);
          console.log('✅ 恢复成功');
          return recovered;
        } catch (recoveryError) {
          console.error(`❌ 恢复失败:`, recoveryError);
        }
      }
    }

    // 无法恢复，根据选项决定是否抛出
    if (shouldThrow) {
      throw error;
    }

    return undefined;
  }

  /**
   * 输出格式化的错误信息
   * 
   * @param error 错误对象
   * @param includeStack 是否包含堆栈跟踪
   */
  private logError(error: Error, includeStack: boolean): void {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 错误信息');
    console.error('='.repeat(60));

    if (error instanceof AnalyzerError) {
      console.error(error.getFormattedMessage());
    } else {
      console.error(`[ERROR] ${error.message}`);
    }

    if (includeStack && error.stack) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }

    console.error('='.repeat(60) + '\n');
  }

  /**
   * 获取错误日志
   * 
   * @param limit 返回的最大数量
   * @returns 错误日志数组
   */
  public getErrorLog(limit?: number): Array<{ timestamp: number; error: Error }> {
    if (limit) {
      return this.errorLog.slice(-limit);
    }
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 获取错误统计信息
   */
  public getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    recent: number; // 最近一小时的错误数
  } {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<string, number>,
      recent: 0,
    };

    const oneHourAgo = Date.now() - 3600000;

    for (const { timestamp, error } of this.errorLog) {
      const errorType = error.constructor.name;
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;

      if (timestamp >= oneHourAgo) {
        stats.recent++;
      }
    }

    return stats;
  }
}

/**
 * 包装函数，自动处理错误
 * 
 * @param fn 要执行的函数
 * @param options 错误处理选项
 * @returns 包装后的函数
 * @example
 * ```typescript
 * const safeAnalyze = withErrorHandling(
 *   async () => analyzer.analyze(config),
 *   { logToConsole: true, throw: false }
 * );
 * const result = await safeAnalyze();
 * ```
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => T | Promise<T>,
  options: ErrorHandlerOptions = {}
): (...args: Args) => Promise<T | undefined> {
  return async (...args: Args): Promise<T | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      const handler = ErrorHandler.getInstance();
      return handler.handle<T>(error as Error, options);
    }
  };
}

/**
 * 安全执行函数，捕获错误并返回结果或默认值
 * 
 * @param fn 要执行的函数
 * @param defaultValue 出错时的默认值
 * @param logError 是否记录错误
 * @returns 函数结果或默认值
 * @example
 * ```typescript
 * const result = await safeExecute(
 *   () => readJsonFile('./config.json'),
 *   {},
 *   true
 * );
 * ```
 */
export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  defaultValue: T,
  logError: boolean = true
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (logError) {
      console.warn('⚠️  操作失败，使用默认值:', (error as Error).message);
    }
    return defaultValue;
  }
}

/**
 * 重试函数执行
 * 
 * @param fn 要执行的函数
 * @param maxRetries 最大重试次数
 * @param delay 重试间隔(ms)
 * @param onRetry 重试时的回调
 * @returns 函数结果
 * @throws 如果所有重试都失败
 * @example
 * ```typescript
 * const data = await retryOnError(
 *   () => fetchVulnerabilityData(),
 *   3,
 *   1000,
 *   (attempt) => console.log(`重试第${attempt}次...`)
 * );
 * ```
 */
export async function retryOnError<T>(
  fn: () => T | Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * 批量执行，跳过错误的项
 * 
 * @param items 要处理的项数组
 * @param fn 处理函数
 * @param onError 错误回调
 * @returns 成功处理的结果数组
 * @example
 * ```typescript
 * const results = await batchExecuteWithErrors(
 *   files,
 *   (file) => analyzeFile(file),
 *   (file, error) => console.error(`文件 ${file} 处理失败`)
 * );
 * ```
 */
export async function batchExecuteWithErrors<T, R>(
  items: T[],
  fn: (item: T) => R | Promise<R>,
  onError?: (item: T, error: Error) => void
): Promise<R[]> {
  const results: R[] = [];

  for (const item of items) {
    try {
      const result = await fn(item);
      results.push(result);
    } catch (error) {
      if (onError) {
        onError(item, error as Error);
      }
    }
  }

  return results;
}


