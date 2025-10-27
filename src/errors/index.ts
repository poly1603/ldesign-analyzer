/**
 * 自定义错误类体系
 * 
 * @description 提供统一的错误处理机制，包含详细的错误信息和解决方案
 * @module errors
 */

/**
 * 分析器基础错误类
 * 
 * @description 所有分析器错误的基类，提供错误代码和解决方案
 * @example
 * ```typescript
 * throw new AnalyzerError('分析失败', 'ANALYSIS_FAILED', {
 *   suggestion: '请检查输入数据格式'
 * });
 * ```
 */
export class AnalyzerError extends Error {
  /** 错误代码 */
  public readonly code: string;

  /** 原始错误对象 */
  public readonly cause?: Error;

  /** 错误上下文信息 */
  public readonly context?: Record<string, any>;

  /** 解决方案建议 */
  public readonly suggestion?: string;

  constructor(
    message: string,
    code: string = 'ANALYZER_ERROR',
    options: {
      cause?: Error;
      context?: Record<string, any>;
      suggestion?: string;
    } = {}
  ) {
    super(message);
    this.name = 'AnalyzerError';
    this.code = code;
    this.cause = options.cause;
    this.context = options.context;
    this.suggestion = options.suggestion;

    // 保持正确的堆栈跟踪 (V8引擎)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 获取格式化的错误信息
   */
  public getFormattedMessage(): string {
    let formatted = `[${this.code}] ${this.message}`;

    if (this.context) {
      formatted += `\n上下文: ${JSON.stringify(this.context, null, 2)}`;
    }

    if (this.suggestion) {
      formatted += `\n建议: ${this.suggestion}`;
    }

    if (this.cause) {
      formatted += `\n原因: ${this.cause.message}`;
    }

    return formatted;
  }
}

/**
 * 解析错误类
 * 
 * @description 当解析构建输出文件失败时抛出
 * @example
 * ```typescript
 * throw new ParseError(
 *   '无法解析webpack stats.json文件',
 *   { path: './dist/stats.json' }
 * );
 * ```
 */
export class ParseError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 'PARSE_ERROR', {
      context,
      cause,
      suggestion: '请确认文件格式正确，或尝试重新构建项目'
    });
    this.name = 'ParseError';
  }
}

/**
 * 分析错误类
 * 
 * @description 当分析过程中出现错误时抛出
 * @example
 * ```typescript
 * throw new AnalysisError(
 *   'Bundle分析失败：模块数据不完整',
 *   { moduleCount: 0 }
 * );
 * ```
 */
export class AnalysisError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 'ANALYSIS_ERROR', {
      context,
      cause,
      suggestion: '请检查输入数据完整性，或尝试禁用部分分析选项'
    });
    this.name = 'AnalysisError';
  }
}

/**
 * 配置错误类
 * 
 * @description 当配置不正确或缺失时抛出
 * @example
 * ```typescript
 * throw new ConfigError(
 *   '无效的bundler类型',
 *   { bundler: 'unknown' }
 * );
 * ```
 */
export class ConfigError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'CONFIG_ERROR', {
      context,
      suggestion: '请检查配置文件格式，参考文档: https://github.com/ldesign/analyzer#configuration'
    });
    this.name = 'ConfigError';
  }
}

/**
 * 文件系统错误类
 * 
 * @description 当文件操作失败时抛出
 * @example
 * ```typescript
 * throw new FileSystemError(
 *   '无法读取文件',
 *   { path: './package.json' }
 * );
 * ```
 */
export class FileSystemError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 'FILE_SYSTEM_ERROR', {
      context,
      cause,
      suggestion: '请检查文件路径是否正确，以及是否有足够的读写权限'
    });
    this.name = 'FileSystemError';
  }
}

/**
 * 验证错误类
 * 
 * @description 当数据验证失败时抛出
 * @example
 * ```typescript
 * throw new ValidationError(
 *   '项目路径不存在',
 *   { path: './non-existent' }
 * );
 * ```
 */
export class ValidationError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', {
      context,
      suggestion: '请检查输入参数是否符合要求'
    });
    this.name = 'ValidationError';
  }
}

/**
 * 不支持的操作错误类
 * 
 * @description 当尝试执行不支持的操作时抛出
 * @example
 * ```typescript
 * throw new UnsupportedError(
 *   '当前构建工具不支持该分析功能',
 *   { bundler: 'rollup', feature: 'moduleResolution' }
 * );
 * ```
 */
export class UnsupportedError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'UNSUPPORTED_ERROR', {
      context,
      suggestion: '请尝试使用其他构建工具或升级到最新版本'
    });
    this.name = 'UnsupportedError';
  }
}

/**
 * 网络错误类
 * 
 * @description 当网络请求失败时抛出（如安全漏洞扫描）
 * @example
 * ```typescript
 * throw new NetworkError(
 *   '无法连接到漏洞数据库',
 *   { url: 'https://registry.npmjs.org' }
 * );
 * ```
 */
export class NetworkError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 'NETWORK_ERROR', {
      context,
      cause,
      suggestion: '请检查网络连接，或稍后重试'
    });
    this.name = 'NetworkError';
  }
}

/**
 * 超时错误类
 * 
 * @description 当操作超时时抛出
 * @example
 * ```typescript
 * throw new TimeoutError(
 *   '分析超时',
 *   { timeout: 30000, elapsed: 35000 }
 * );
 * ```
 */
export class TimeoutError extends AnalyzerError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'TIMEOUT_ERROR', {
      context,
      suggestion: '请尝试增加超时时间，或减少分析范围'
    });
    this.name = 'TimeoutError';
  }
}


