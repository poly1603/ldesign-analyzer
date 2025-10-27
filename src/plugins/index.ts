/**
 * 插件系统
 * 
 * @description 提供可扩展的插件机制，允许自定义分析逻辑
 * @module plugins
 */

import type { AnalysisResult, AnalyzerConfig } from '../types';

/**
 * 插件钩子
 */
export enum PluginHook {
  /** 分析前 */
  BeforeAnalyze = 'before:analyze',
  /** 分析后 */
  AfterAnalyze = 'after:analyze',
  /** Bundle分析前 */
  BeforeBundleAnalyze = 'before:bundle',
  /** Bundle分析后 */
  AfterBundleAnalyze = 'after:bundle',
  /** 依赖分析前 */
  BeforeDependencyAnalyze = 'before:dependency',
  /** 依赖分析后 */
  AfterDependencyAnalyze = 'after:dependency',
  /** 代码分析前 */
  BeforeCodeAnalyze = 'before:code',
  /** 代码分析后 */
  AfterCodeAnalyze = 'after:code',
  /** 报告生成前 */
  BeforeReport = 'before:report',
  /** 报告生成后 */
  AfterReport = 'after:report',
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 配置 */
  config: AnalyzerConfig;
  /** 当前结果（可能部分完成） */
  result?: Partial<AnalysisResult>;
  /** 插件共享数据 */
  shared: Map<string, any>;
}

/**
 * 插件接口
 */
export interface Plugin {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version?: string;
  /** 插件描述 */
  description?: string;
  /** 注册钩子 */
  hooks?: Partial<Record<PluginHook, PluginHookFunction>>;
}

/**
 * 插件钩子函数类型
 */
export type PluginHookFunction = (
  context: PluginContext
) => void | Promise<void>;

/**
 * 插件管理器
 * 
 * @description 管理和执行插件
 * 
 * @example
 * ```typescript
 * const pluginManager = new PluginManager();
 * 
 * // 注册插件
 * pluginManager.register({
 *   name: 'my-plugin',
 *   hooks: {
 *     [PluginHook.AfterAnalyze]: async (context) => {
 *       console.log('分析完成!', context.result);
 *     }
 *   }
 * });
 * 
 * // 执行钩子
 * await pluginManager.executeHook(
 *   PluginHook.AfterAnalyze,
 *   context
 * );
 * ```
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;

  constructor(config: AnalyzerConfig) {
    this.context = {
      config,
      shared: new Map(),
    };
  }

  /**
   * 注册插件
   * 
   * @param plugin - 插件对象
   * @throws {Error} 当插件名称重复时
   * 
   * @example
   * ```typescript
   * pluginManager.register({
   *   name: 'bundle-size-limit',
   *   version: '1.0.0',
   *   hooks: {
   *     [PluginHook.AfterBundleAnalyze]: async (ctx) => {
   *       if (ctx.result?.bundle?.totalSize > 5 * 1024 * 1024) {
   *         throw new Error('Bundle超过5MB限制');
   *       }
   *     }
   *   }
   * });
   * ```
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`插件 ${plugin.name} 已经注册`);
    }

    this.plugins.set(plugin.name, plugin);
    console.log(`✅ 插件已注册: ${plugin.name}${plugin.version ? ` v${plugin.version}` : ''}`);
  }

  /**
   * 注销插件
   * 
   * @param name - 插件名称
   * 
   * @example
   * ```typescript
   * pluginManager.unregister('my-plugin');
   * ```
   */
  unregister(name: string): void {
    if (this.plugins.delete(name)) {
      console.log(`✅ 插件已注销: ${name}`);
    }
  }

  /**
   * 获取已注册的插件
   * 
   * @returns 插件数组
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 执行钩子
   * 
   * @param hook - 钩子类型
   * @param result - 当前结果（可选）
   * 
   * @example
   * ```typescript
   * await pluginManager.executeHook(
   *   PluginHook.BeforeAnalyze
   * );
   * ```
   */
  async executeHook(hook: PluginHook, result?: Partial<AnalysisResult>): Promise<void> {
    this.context.result = result;

    for (const [name, plugin] of this.plugins) {
      if (plugin.hooks && plugin.hooks[hook]) {
        try {
          await plugin.hooks[hook]!(this.context);
        } catch (error) {
          console.error(`❌ 插件 ${name} 执行钩子 ${hook} 失败:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * 更新上下文
   * 
   * @param updates - 上下文更新
   */
  updateContext(updates: Partial<PluginContext>): void {
    Object.assign(this.context, updates);
  }

  /**
   * 获取插件共享数据
   * 
   * @param key - 数据键
   * @returns 共享数据
   */
  getShared<T = any>(key: string): T | undefined {
    return this.context.shared.get(key);
  }

  /**
   * 设置插件共享数据
   * 
   * @param key - 数据键
   * @param value - 数据值
   */
  setShared<T = any>(key: string, value: T): void {
    this.context.shared.set(key, value);
  }

  /**
   * 清空共享数据
   */
  clearShared(): void {
    this.context.shared.clear();
  }

  /**
   * 获取插件数量
   * 
   * @returns 插件数量
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * 检查插件是否已注册
   * 
   * @param name - 插件名称
   * @returns 是否已注册
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
}

/**
 * 创建简单插件的辅助函数
 * 
 * @param name - 插件名称
 * @param hook - 钩子类型
 * @param fn - 钩子函数
 * @returns 插件对象
 * 
 * @example
 * ```typescript
 * const plugin = createPlugin(
 *   'size-checker',
 *   PluginHook.AfterBundleAnalyze,
 *   async (ctx) => {
 *     console.log('Bundle大小:', ctx.result?.bundle?.totalSize);
 *   }
 * );
 * 
 * pluginManager.register(plugin);
 * ```
 */
export function createPlugin(
  name: string,
  hook: PluginHook,
  fn: PluginHookFunction
): Plugin {
  return {
    name,
    hooks: {
      [hook]: fn,
    },
  };
}

/**
 * 创建性能预算插件
 * 
 * @param budgets - 性能预算配置
 * @returns 插件对象
 * 
 * @example
 * ```typescript
 * const budgetPlugin = createBudgetPlugin({
 *   maxBundleSize: 5 * 1024 * 1024, // 5MB
 *   maxModuleCount: 500,
 *   maxCircularDependencies: 0
 * });
 * 
 * pluginManager.register(budgetPlugin);
 * ```
 */
export function createBudgetPlugin(budgets: {
  maxBundleSize?: number;
  maxGzipSize?: number;
  maxModuleCount?: number;
  maxCircularDependencies?: number;
  maxDuplicates?: number;
}): Plugin {
  return {
    name: 'performance-budget',
    version: '1.0.0',
    description: '性能预算检查插件',
    hooks: {
      [PluginHook.AfterAnalyze]: async (context) => {
        const result = context.result;
        const errors: string[] = [];

        // 检查Bundle大小
        if (budgets.maxBundleSize && result?.bundle) {
          if (result.bundle.totalSize > budgets.maxBundleSize) {
            errors.push(
              `Bundle大小 ${result.bundle.totalSize} 超过预算 ${budgets.maxBundleSize}`
            );
          }
        }

        // 检查Gzip大小
        if (budgets.maxGzipSize && result?.bundle) {
          if (result.bundle.gzipSize > budgets.maxGzipSize) {
            errors.push(
              `Gzip大小 ${result.bundle.gzipSize} 超过预算 ${budgets.maxGzipSize}`
            );
          }
        }

        // 检查模块数量
        if (budgets.maxModuleCount && result?.bundle) {
          if (result.bundle.modules.length > budgets.maxModuleCount) {
            errors.push(
              `模块数量 ${result.bundle.modules.length} 超过预算 ${budgets.maxModuleCount}`
            );
          }
        }

        // 检查循环依赖
        if (budgets.maxCircularDependencies !== undefined && result?.dependency) {
          if (result.dependency.circular.length > budgets.maxCircularDependencies) {
            errors.push(
              `循环依赖 ${result.dependency.circular.length} 超过预算 ${budgets.maxCircularDependencies}`
            );
          }
        }

        // 检查重复依赖
        if (budgets.maxDuplicates !== undefined && result?.dependency) {
          if (result.dependency.duplicates.length > budgets.maxDuplicates) {
            errors.push(
              `重复依赖 ${result.dependency.duplicates.length} 超过预算 ${budgets.maxDuplicates}`
            );
          }
        }

        if (errors.length > 0) {
          throw new Error(
            `性能预算检查失败:\n${errors.map(e => `  - ${e}`).join('\n')}`
          );
        }
      },
    },
  };
}

/**
 * 创建自定义分析插件
 * 
 * @param name - 插件名称
 * @param analyzer - 自定义分析函数
 * @returns 插件对象
 * 
 * @example
 * ```typescript
 * const customPlugin = createCustomAnalyzerPlugin(
 *   'custom-check',
 *   async (ctx) => {
 *     // 自定义分析逻辑
 *     const customData = await performCustomAnalysis(ctx.config.path);
 *     ctx.shared.set('custom-data', customData);
 *   }
 * );
 * ```
 */
export function createCustomAnalyzerPlugin(
  name: string,
  analyzer: PluginHookFunction
): Plugin {
  return {
    name,
    description: '自定义分析插件',
    hooks: {
      [PluginHook.AfterAnalyze]: analyzer,
    },
  };
}

/**
 * 创建通知插件
 * 
 * @param notifier - 通知函数
 * @returns 插件对象
 * 
 * @example
 * ```typescript
 * const notifyPlugin = createNotificationPlugin(async (result) => {
 *   await sendSlackMessage(`分析完成: Bundle大小 ${result.bundle?.totalSize}`);
 * });
 * ```
 */
export function createNotificationPlugin(
  notifier: (result: AnalysisResult) => void | Promise<void>
): Plugin {
  return {
    name: 'notification',
    description: '通知插件',
    hooks: {
      [PluginHook.AfterAnalyze]: async (context) => {
        if (context.result) {
          await notifier(context.result as AnalysisResult);
        }
      },
    },
  };
}


