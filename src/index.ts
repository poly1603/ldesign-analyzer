/**
 * @ldesign/analyzer - 主入口
 * 
 * @description LDesign分析工具 - 提供Bundle、依赖、代码质量等多维度分析
 * @module @ldesign/analyzer
 * 
 * @example
 * ```typescript
 * import { Analyzer } from '@ldesign/analyzer';
 * 
 * const analyzer = new Analyzer();
 * const result = await analyzer.analyze({
 *   path: './dist',
 *   bundler: 'webpack'
 * });
 * 
 * await analyzer.report(result, ['cli', 'html']);
 * ```
 */

// 导出核心类
export { Analyzer, type ProgressCallback } from './core';

// 导出类型
export type * from './types';

// 导出解析器
export * from './parsers';

// 导出分析器
export * from './analyzers/bundle';
export * from './analyzers/dependency';
export * from './analyzers/code';

// 导出可视化器
export * from './visualizers';

// 导出报告器
export * from './reporters';

// 导出工具函数
export * from './utils/fileUtils';
export * from './utils/graphUtils';
export * from './utils/metricsUtils';

// 导出常量
export * from './constants';

// 导出错误类
export * from './errors';
export * from './errors/handlers';

// 导出缓存
export { CacheManager, defaultCache, type CacheOptions } from './cache';

// 导出进度
export {
  ProgressManager,
  withProgress,
  withProgressDecorator,
  type ProgressInfo,
  type ProgressCallback as ProgressCallbackType,
} from './progress';

// 导出对比分析
export {
  Comparator,
  defaultComparator,
  type CompareResult,
  type BundleDiff,
  type DependencyDiff,
  type CodeDiff,
} from './compare';

// 导出监控模式
export {
  WatchManager,
  createWatcher,
  type WatchOptions,
} from './watch';

// 导出插件系统
export {
  PluginManager,
  PluginHook,
  createPlugin,
  createBudgetPlugin,
  createCustomAnalyzerPlugin,
  createNotificationPlugin,
  type Plugin,
  type PluginContext,
  type PluginHookFunction,
} from './plugins';
