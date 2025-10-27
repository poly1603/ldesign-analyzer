/**
 * 监控模式
 * 
 * @description 监控文件变化，自动重新分析
 * @module watch
 */

import { watch, FSWatcher } from 'fs';
import path from 'path';
import type { AnalyzerConfig, AnalysisResult } from '../types';
import { Analyzer } from '../core';
import { getAllFiles } from '../utils/fileUtils';

/**
 * 监控选项
 */
export interface WatchOptions {
  /** 监控的文件模式 */
  patterns?: string[];
  /** 排除的文件模式 */
  exclude?: string[];
  /** 防抖延迟（毫秒） */
  debounce?: number;
  /** 变化回调 */
  onChange?: (result: AnalysisResult) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 监控管理器
 * 
 * @description 监控项目文件变化，自动重新分析
 * 
 * @example
 * ```typescript
 * const watcher = new WatchManager({
 *   path: './dist',
 *   bundler: 'webpack'
 * }, {
 *   debounce: 1000,
 *   onChange: async (result) => {
 *     console.log('文件已更新，重新分析完成');
 *     console.log('Bundle大小:', result.bundle?.totalSize);
 *   }
 * });
 * 
 * // 开始监控
 * await watcher.start();
 * 
 * // 停止监控
 * watcher.stop();
 * ```
 */
export class WatchManager {
  private config: AnalyzerConfig;
  private options: WatchOptions;
  private analyzer: Analyzer;
  private watcher?: FSWatcher;
  private debounceTimer?: NodeJS.Timeout;
  private isAnalyzing: boolean = false;

  constructor(config: AnalyzerConfig, options: WatchOptions = {}) {
    this.config = config;
    this.options = {
      debounce: 1000,
      patterns: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.vue'],
      exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      ...options,
    };
    this.analyzer = new Analyzer();
  }

  /**
   * 开始监控
   * 
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * await watcher.start();
   * console.log('监控已启动');
   * ```
   */
  async start(): Promise<void> {
    console.log('🔍 启动文件监控...');
    console.log(`监控路径: ${this.config.path}`);

    // 首次分析
    await this.performAnalysis('初始分析');

    // 设置文件监控
    this.watcher = watch(
      this.config.path,
      { recursive: true },
      (eventType, filename) => {
        if (filename && this.shouldWatch(filename)) {
          this.handleFileChange(eventType, filename);
        }
      }
    );

    console.log('✅ 监控已启动');
    console.log('按 Ctrl+C 停止监控\n');
  }

  /**
   * 停止监控
   * 
   * @example
   * ```typescript
   * watcher.stop();
   * ```
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      console.log('\n🛑 监控已停止');
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * 处理文件变化
   * 
   * @param eventType - 事件类型
   * @param filename - 文件名
   * @private
   */
  private handleFileChange(eventType: string, filename: string): void {
    console.log(`📝 文件${eventType === 'rename' ? '修改' : '变化'}: ${filename}`);

    // 清除之前的定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 设置防抖
    this.debounceTimer = setTimeout(() => {
      this.performAnalysis(`文件变化: ${filename}`).catch(error => {
        if (this.options.onError) {
          this.options.onError(error);
        } else {
          console.error('❌ 分析失败:', error.message);
        }
      });
    }, this.options.debounce);
  }

  /**
   * 执行分析
   * 
   * @param reason - 分析原因
   * @private
   */
  private async performAnalysis(reason: string): Promise<void> {
    if (this.isAnalyzing) {
      console.log('⏳ 正在分析中，跳过本次触发');
      return;
    }

    this.isAnalyzing = true;

    try {
      console.log(`\n🔄 ${reason}`);
      const startTime = Date.now();

      const result = await this.analyzer.analyze(this.config);

      const elapsed = Date.now() - startTime;
      console.log(`✅ 分析完成 (耗时: ${elapsed}ms)`);

      // 输出简要信息
      if (result.bundle) {
        console.log(`  Bundle大小: ${this.formatBytes(result.bundle.totalSize)}`);
        console.log(`  模块数量: ${result.bundle.modules.length}`);
      }

      if (result.dependency) {
        if (result.dependency.circular.length > 0) {
          console.log(`  ⚠️ 循环依赖: ${result.dependency.circular.length}`);
        }
        if (result.dependency.duplicates.length > 0) {
          console.log(`  ⚠️ 重复依赖: ${result.dependency.duplicates.length}`);
        }
      }

      // 调用回调
      if (this.options.onChange) {
        await this.options.onChange(result);
      }
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 判断是否应该监控此文件
   * 
   * @param filename - 文件名
   * @returns 是否监控
   * @private
   */
  private shouldWatch(filename: string): boolean {
    // 检查排除模式
    if (this.options.exclude) {
      for (const pattern of this.options.exclude) {
        if (this.matchPattern(filename, pattern)) {
          return false;
        }
      }
    }

    // 检查包含模式
    if (this.options.patterns && this.options.patterns.length > 0) {
      return this.options.patterns.some(pattern =>
        this.matchPattern(filename, pattern)
      );
    }

    return true;
  }

  /**
   * 简单的模式匹配
   * 
   * @param filename - 文件名
   * @param pattern - 模式
   * @returns 是否匹配
   * @private
   */
  private matchPattern(filename: string, pattern: string): boolean {
    // 移除 **/ 前缀
    const cleanPattern = pattern.replace(/^\*\*\//, '');

    // 简单实现：检查扩展名或路径包含
    if (cleanPattern.startsWith('*.')) {
      const ext = cleanPattern.substring(1);
      return filename.endsWith(ext);
    }

    return filename.includes(cleanPattern.replace(/\*/g, ''));
  }

  /**
   * 格式化字节大小
   * 
   * @param bytes - 字节数
   * @returns 格式化的字符串
   * @private
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

/**
 * 创建监控器的快捷函数
 * 
 * @param config - 分析配置
 * @param options - 监控选项
 * @returns 监控管理器实例
 * 
 * @example
 * ```typescript
 * const watcher = createWatcher(
 *   { path: './dist', bundler: 'webpack' },
 *   { 
 *     debounce: 1000,
 *     onChange: (result) => console.log('更新完成') 
 *   }
 * );
 * 
 * await watcher.start();
 * ```
 */
export function createWatcher(
  config: AnalyzerConfig,
  options?: WatchOptions
): WatchManager {
  return new WatchManager(config, options);
}


