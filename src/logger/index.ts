/**
 * 日志系统
 * 
 * @description 提供结构化日志记录功能
 * @module logger
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ensureDir } from '../utils/fileUtils';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: LogLevel;
  /** 消息 */
  message: string;
  /** 元数据 */
  meta?: Record<string, any>;
  /** 错误对象 */
  error?: Error;
}

/**
 * 日志器选项
 */
export interface LoggerOptions {
  /** 最低日志级别 */
  level?: LogLevel;
  /** 是否输出到控制台 */
  console?: boolean;
  /** 是否输出到文件 */
  file?: boolean;
  /** 日志文件路径 */
  filePath?: string;
  /** 是否使用彩色输出 */
  colors?: boolean;
}

/**
 * 日志器类
 * 
 * @description 提供结构化的日志记录功能
 * 
 * @example
 * ```typescript
 * const logger = new Logger({
 *   level: LogLevel.INFO,
 *   console: true,
 *   file: true,
 *   filePath: './logs/analyzer.log'
 * });
 * 
 * logger.info('开始分析', { projectPath: './dist' });
 * logger.warn('发现警告', { count: 5 });
 * logger.error('分析失败', { error: new Error('解析错误') });
 * ```
 */
export class Logger {
  private level: LogLevel;
  private toConsole: boolean;
  private toFile: boolean;
  private filePath?: string;
  private colors: boolean;
  private buffer: LogEntry[] = [];

  /** 颜色代码 */
  private readonly COLORS = {
    DEBUG: '\x1b[36m', // 青色
    INFO: '\x1b[32m',  // 绿色
    WARN: '\x1b[33m',  // 黄色
    ERROR: '\x1b[31m', // 红色
    RESET: '\x1b[0m',
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.toConsole = options.console !== false;
    this.toFile = options.file ?? false;
    this.filePath = options.filePath;
    this.colors = options.colors !== false;
  }

  /**
   * 记录DEBUG级别日志
   * 
   * @param message - 日志消息
   * @param meta - 元数据
   * 
   * @example
   * ```typescript
   * logger.debug('调试信息', { variable: value });
   * ```
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * 记录INFO级别日志
   * 
   * @param message - 日志消息
   * @param meta - 元数据
   * 
   * @example
   * ```typescript
   * logger.info('分析开始', { path: './dist' });
   * ```
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * 记录WARN级别日志
   * 
   * @param message - 日志消息
   * @param meta - 元数据
   * 
   * @example
   * ```typescript
   * logger.warn('性能警告', { size: 1024 * 1024 * 5 });
   * ```
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 记录ERROR级别日志
   * 
   * @param message - 日志消息
   * @param metaOrError - 元数据或错误对象
   * 
   * @example
   * ```typescript
   * logger.error('分析失败', new Error('解析错误'));
   * logger.error('处理失败', { file: './test.js', error: err });
   * ```
   */
  error(message: string, metaOrError?: Record<string, any> | Error): void {
    let meta: Record<string, any> | undefined;
    let error: Error | undefined;

    if (metaOrError instanceof Error) {
      error = metaOrError;
    } else {
      meta = metaOrError;
      error = meta?.error as Error;
    }

    this.log(LogLevel.ERROR, message, meta, error);
  }

  /**
   * 设置日志级别
   * 
   * @param level - 日志级别
   * 
   * @example
   * ```typescript
   * logger.setLevel(LogLevel.DEBUG);
   * ```
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取日志缓冲区
   * 
   * @returns 日志条目数组
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * 清空日志缓冲区
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * 刷新日志到文件
   * 
   * @example
   * ```typescript
   * await logger.flush();
   * ```
   */
  async flush(): Promise<void> {
    if (!this.toFile || !this.filePath || this.buffer.length === 0) {
      return;
    }

    try {
      await ensureDir(path.dirname(this.filePath));

      const lines = this.buffer.map(entry => this.formatForFile(entry));
      await fs.appendFile(this.filePath, lines.join('\n') + '\n', 'utf-8');

      this.buffer = [];
    } catch (error) {
      console.error('刷新日志失败:', error);
    }
  }

  /**
   * 记录日志
   * 
   * @param level - 日志级别
   * @param message - 消息
   * @param meta - 元数据
   * @param error - 错误对象
   * @private
   */
  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    error?: Error
  ): void {
    // 检查日志级别
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      meta,
      error,
    };

    // 输出到控制台
    if (this.toConsole) {
      this.logToConsole(entry);
    }

    // 添加到缓冲区
    if (this.toFile) {
      this.buffer.push(entry);

      // 当缓冲区达到一定大小时自动刷新
      if (this.buffer.length >= 100) {
        this.flush().catch(() => { });
      }
    }
  }

  /**
   * 输出日志到控制台
   * 
   * @param entry - 日志条目
   * @private
   */
  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const color = this.colors ? this.COLORS[levelName as keyof typeof this.COLORS] : '';
    const reset = this.colors ? this.COLORS.RESET : '';

    let output = `${color}[${timestamp}] ${levelName}${reset}: ${entry.message}`;

    if (entry.meta && Object.keys(entry.meta).length > 0) {
      output += `\n  ${JSON.stringify(entry.meta, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  错误: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  ${entry.error.stack}`;
      }
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  /**
   * 格式化日志为文件格式
   * 
   * @param entry - 日志条目
   * @returns 格式化的字符串
   * @private
   */
  private formatForFile(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();

    const parts = [
      `[${timestamp}]`,
      levelName,
      entry.message,
    ];

    if (entry.meta) {
      parts.push(JSON.stringify(entry.meta));
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(entry.error.stack);
      }
    }

    return parts.join(' | ');
  }
}

/**
 * 默认日志器实例
 */
export const defaultLogger = new Logger({
  level: LogLevel.INFO,
  console: true,
  file: false,
  colors: true,
});

/**
 * 创建子日志器
 * 
 * @param prefix - 日志前缀
 * @param options - 日志器选项
 * @returns 日志器实例
 * 
 * @example
 * ```typescript
 * const bundleLogger = createLogger('Bundle');
 * bundleLogger.info('分析Bundle'); // 输出: [Bundle] 分析Bundle
 * ```
 */
export function createLogger(prefix: string, options?: LoggerOptions): Logger {
  const logger = new Logger(options);

  // 包装方法添加前缀
  const originalDebug = logger.debug.bind(logger);
  const originalInfo = logger.info.bind(logger);
  const originalWarn = logger.warn.bind(logger);
  const originalError = logger.error.bind(logger);

  logger.debug = (msg, meta) => originalDebug(`[${prefix}] ${msg}`, meta);
  logger.info = (msg, meta) => originalInfo(`[${prefix}] ${msg}`, meta);
  logger.warn = (msg, meta) => originalWarn(`[${prefix}] ${msg}`, meta);
  logger.error = (msg, metaOrError) => originalError(`[${prefix}] ${msg}`, metaOrError);

  return logger;
}


