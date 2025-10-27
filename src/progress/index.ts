/**
 * 进度显示系统
 * 
 * @description 提供分析过程的进度显示和进度条
 * @module progress
 */

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * 进度信息
 */
export interface ProgressInfo {
  /** 当前阶段 */
  phase: string;
  /** 进度百分比 (0-100) */
  percent: number;
  /** 当前项 */
  current: number;
  /** 总项数 */
  total: number;
  /** 消息 */
  message: string;
  /** 开始时间 */
  startTime: number;
  /** 预计剩余时间（毫秒） */
  estimatedRemaining?: number;
}

/**
 * 进度管理器
 * 
 * @description 管理和报告分析过程的进度
 * 
 * @example
 * ```typescript
 * const progress = new ProgressManager();
 * 
 * progress.start('分析文件', 100);
 * 
 * for (let i = 0; i < 100; i++) {
 *   await analyzeFile(files[i]);
 *   progress.increment(`正在分析: ${files[i]}`);
 * }
 * 
 * progress.complete();
 * ```
 */
export class ProgressManager {
  private phase: string = '';
  private current: number = 0;
  private total: number = 0;
  private startTime: number = 0;
  private callback?: ProgressCallback;
  private silent: boolean;

  constructor(callback?: ProgressCallback, silent: boolean = false) {
    this.callback = callback;
    this.silent = silent;
  }

  /**
   * 开始新阶段
   * 
   * @param phase - 阶段名称
   * @param total - 总项数
   * @param message - 初始消息
   * 
   * @example
   * ```typescript
   * progress.start('解析文件', 50, '开始解析...');
   * ```
   */
  start(phase: string, total: number, message: string = ''): void {
    this.phase = phase;
    this.current = 0;
    this.total = total;
    this.startTime = Date.now();

    this.report(message || `开始 ${phase}...`);

    if (!this.silent) {
      console.log(`\n🚀 ${phase} (共 ${total} 项)`);
    }
  }

  /**
   * 更新进度
   * 
   * @param current - 当前进度
   * @param message - 进度消息
   * 
   * @example
   * ```typescript
   * progress.update(25, '已处理25个文件');
   * ```
   */
  update(current: number, message: string = ''): void {
    this.current = current;
    this.report(message);

    if (!this.silent) {
      this.printProgress(message);
    }
  }

  /**
   * 增加进度
   * 
   * @param message - 进度消息
   * @param amount - 增加量，默认1
   * 
   * @example
   * ```typescript
   * progress.increment('处理完成一个文件');
   * ```
   */
  increment(message: string = '', amount: number = 1): void {
    this.current = Math.min(this.current + amount, this.total);
    this.report(message);

    if (!this.silent) {
      this.printProgress(message);
    }
  }

  /**
   * 完成当前阶段
   * 
   * @param message - 完成消息
   * 
   * @example
   * ```typescript
   * progress.complete('分析完成');
   * ```
   */
  complete(message: string = ''): void {
    this.current = this.total;
    this.report(message || `${this.phase} 完成`);

    if (!this.silent) {
      const elapsed = this.formatDuration(Date.now() - this.startTime);
      console.log(`\n✅ ${this.phase} 完成 (耗时: ${elapsed})\n`);
    }
  }

  /**
   * 报告错误
   * 
   * @param error - 错误消息
   * 
   * @example
   * ```typescript
   * progress.error('分析失败：文件不存在');
   * ```
   */
  error(error: string): void {
    if (!this.silent) {
      console.error(`\n❌ 错误: ${error}\n`);
    }
  }

  /**
   * 获取当前进度信息
   * 
   * @returns 进度信息
   */
  getInfo(): ProgressInfo {
    const percent = this.total > 0 ? (this.current / this.total) * 100 : 0;
    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = this.current > 0 ? (elapsed / this.current) * this.total : 0;
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

    return {
      phase: this.phase,
      percent,
      current: this.current,
      total: this.total,
      message: '',
      startTime: this.startTime,
      estimatedRemaining,
    };
  }

  /**
   * 报告进度给回调函数
   * 
   * @param message - 消息
   * @private
   */
  private report(message: string): void {
    if (this.callback) {
      const info = this.getInfo();
      info.message = message;
      this.callback(info);
    }
  }

  /**
   * 打印进度条
   * 
   * @param message - 消息
   * @private
   */
  private printProgress(message: string): void {
    const percent = this.total > 0 ? (this.current / this.total) * 100 : 0;
    const barLength = 40;
    const filledLength = Math.round((barLength * this.current) / this.total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = this.current > 0 ? (elapsed / this.current) * this.total : 0;
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);
    const remaining = this.formatDuration(estimatedRemaining);

    // 使用\r回到行首，覆盖之前的输出
    process.stdout.write(
      `\r[${bar}] ${percent.toFixed(1)}% (${this.current}/${this.total}) 剩余: ${remaining} ${message.substring(0, 40)}`
    );
  }

  /**
   * 格式化持续时间
   * 
   * @param ms - 毫秒数
   * @returns 格式化的时间字符串
   * @private
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * 创建带进度显示的批处理函数
 * 
 * @template T - 输入项类型
 * @template R - 结果类型
 * @param items - 要处理的项数组
 * @param processor - 处理函数
 * @param options - 选项
 * @returns 处理结果数组
 * 
 * @example
 * ```typescript
 * const results = await withProgress(
 *   files,
 *   async (file) => analyzeFile(file),
 *   {
 *     phase: '分析文件',
 *     concurrency: 5,
 *     silent: false
 *   }
 * );
 * ```
 */
export async function withProgress<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    phase?: string;
    concurrency?: number;
    silent?: boolean;
    onProgress?: ProgressCallback;
  } = {}
): Promise<R[]> {
  const {
    phase = '处理中',
    concurrency = 10,
    silent = false,
    onProgress,
  } = options;

  const progress = new ProgressManager(onProgress, silent);
  progress.start(phase, items.length);

  const results: R[] = [];
  const queue = items.map((item, index) => ({ item, index }));
  let completed = 0;

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const { item, index } = queue.shift()!;
      try {
        const result = await processor(item, index);
        results[index] = result;
        completed++;
        progress.update(completed, `已完成 ${completed}/${items.length}`);
      } catch (error) {
        progress.error(`处理失败: ${error}`);
        completed++;
      }
    }
  }

  // 创建并发worker
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  progress.complete();

  return results;
}

/**
 * 进度装饰器
 * 
 * @description 为异步函数添加进度显示
 * 
 * @example
 * ```typescript
 * class Analyzer {
 *   @withProgressDecorator('分析Bundle')
 *   async analyzeBundle() {
 *     // ... 分析逻辑
 *   }
 * }
 * ```
 */
export function withProgressDecorator(phase: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const progress = new ProgressManager();
      progress.start(phase, 1);

      try {
        const result = await originalMethod.apply(this, args);
        progress.complete();
        return result;
      } catch (error) {
        progress.error((error as Error).message);
        throw error;
      }
    };

    return descriptor;
  };
}


