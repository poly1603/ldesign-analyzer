/**
 * 配置系统
 * 
 * @description 提供配置文件加载、验证和管理
 * @module config
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyzerConfig } from '../types';
import { fileExists } from '../utils/fileUtils';
import { ConfigError } from '../errors';

/**
 * 配置文件名列表
 */
const CONFIG_FILES = [
  'analyzer.config.ts',
  'analyzer.config.js',
  'analyzer.config.mjs',
  'analyzer.config.cjs',
  '.analyzerrc',
  '.analyzerrc.json',
  '.analyzerrc.js',
];

/**
 * 完整的配置对象
 */
export interface FullConfig extends AnalyzerConfig {
  /** 缓存配置 */
  cache?: {
    enabled?: boolean;
    dir?: string;
    ttl?: number;
  };
  /** 性能配置 */
  performance?: {
    concurrency?: number;
    maxFileSize?: number;
  };
  /** 排除模式 */
  exclude?: string[];
  /** 包含模式 */
  include?: string[];
}

/**
 * 配置管理器
 * 
 * @description 加载和管理分析器配置
 * 
 * @example
 * ```typescript
 * const configManager = new ConfigManager();
 * const config = await configManager.load();
 * console.log('使用配置:', config);
 * ```
 */
export class ConfigManager {
  private config: FullConfig | null = null;

  /**
   * 加载配置文件
   * 
   * @param cwd - 工作目录，默认为process.cwd()
   * @returns 加载的配置对象
   * @throws {ConfigError} 当配置无效时
   * 
   * @example
   * ```typescript
   * const config = await configManager.load('./my-project');
   * ```
   */
  async load(cwd: string = process.cwd()): Promise<FullConfig> {
    // 如果已经加载过，直接返回
    if (this.config) {
      return this.config;
    }

    // 尝试查找配置文件
    const configPath = await this.findConfigFile(cwd);

    if (configPath) {
      this.config = await this.loadConfigFile(configPath);
    } else {
      // 使用默认配置
      this.config = this.getDefaultConfig();
    }

    // 验证配置
    this.validateConfig(this.config);

    return this.config;
  }

  /**
   * 合并配置
   * 
   * @param baseConfig - 基础配置
   * @param overrides - 覆盖配置
   * @returns 合并后的配置
   * 
   * @example
   * ```typescript
   * const merged = configManager.merge(defaultConfig, {
   *   bundler: 'vite',
   *   analyze: { bundle: false }
   * });
   * ```
   */
  merge(baseConfig: FullConfig, overrides: Partial<FullConfig>): FullConfig {
    return {
      ...baseConfig,
      ...overrides,
      analyze: {
        ...baseConfig.analyze,
        ...overrides.analyze,
      },
      cache: {
        ...baseConfig.cache,
        ...overrides.cache,
      },
      performance: {
        ...baseConfig.performance,
        ...overrides.performance,
      },
    };
  }

  /**
   * 获取当前配置
   * 
   * @returns 当前配置对象
   */
  getConfig(): FullConfig | null {
    return this.config;
  }

  /**
   * 重置配置
   */
  reset(): void {
    this.config = null;
  }

  /**
   * 查找配置文件
   * 
   * @param cwd - 工作目录
   * @returns 配置文件路径，如果未找到返回null
   * @private
   */
  private async findConfigFile(cwd: string): Promise<string | null> {
    for (const filename of CONFIG_FILES) {
      const filepath = path.join(cwd, filename);
      if (await fileExists(filepath)) {
        return filepath;
      }
    }

    // 尝试在package.json中查找analyzer字段
    const packageJsonPath = path.join(cwd, 'package.json');
    if (await fileExists(packageJsonPath)) {
      try {
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg.analyzer) {
          return packageJsonPath;
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    return null;
  }

  /**
   * 加载配置文件
   * 
   * @param filepath - 配置文件路径
   * @returns 配置对象
   * @throws {ConfigError} 当加载失败时
   * @private
   */
  private async loadConfigFile(filepath: string): Promise<FullConfig> {
    try {
      const ext = path.extname(filepath);

      // JSON文件
      if (ext === '.json' || filepath.endsWith('.analyzerrc')) {
        const content = await fs.readFile(filepath, 'utf-8');
        return JSON.parse(content);
      }

      // package.json
      if (filepath.endsWith('package.json')) {
        const content = await fs.readFile(filepath, 'utf-8');
        const pkg = JSON.parse(content);
        return pkg.analyzer || this.getDefaultConfig();
      }

      // JavaScript/TypeScript文件
      if (['.js', '.mjs', '.cjs', '.ts'].includes(ext)) {
        // 动态导入
        const module = await import(filepath);
        return module.default || module;
      }

      throw new ConfigError(`不支持的配置文件格式: ${ext}`, { filepath });
    } catch (error) {
      throw new ConfigError(
        `加载配置文件失败: ${filepath}`,
        { filepath },
      );
    }
  }

  /**
   * 验证配置
   * 
   * @param config - 配置对象
   * @throws {ConfigError} 当配置无效时
   * @private
   */
  private validateConfig(config: FullConfig): void {
    // 验证path
    if (!config.path) {
      throw new ConfigError('配置缺少必需的path字段');
    }

    // 验证bundler
    if (config.bundler && !['webpack', 'rollup', 'vite', 'auto'].includes(config.bundler)) {
      throw new ConfigError(
        `无效的bundler值: ${config.bundler}`,
        { bundler: config.bundler, allowed: ['webpack', 'rollup', 'vite', 'auto'] }
      );
    }

    // 验证output
    if (config.output) {
      const validFormats = ['cli', 'html', 'json'];
      for (const format of config.output) {
        if (!validFormats.includes(format)) {
          throw new ConfigError(
            `无效的output格式: ${format}`,
            { format, allowed: validFormats }
          );
        }
      }
    }
  }

  /**
   * 获取默认配置
   * 
   * @returns 默认配置对象
   * @private
   */
  private getDefaultConfig(): FullConfig {
    return {
      path: process.cwd(),
      bundler: 'auto',
      output: ['cli'],
      analyze: {
        bundle: true,
        dependency: true,
        code: true,
        quality: false,
        performance: false,
        security: false,
      },
      cache: {
        enabled: true,
        dir: '.analyzer-cache',
        ttl: 3600000, // 1小时
      },
      performance: {
        concurrency: 10,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      },
      exclude: [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        '.next',
        '.nuxt',
      ],
    };
  }
}

/**
 * 默认配置管理器实例
 */
export const defaultConfigManager = new ConfigManager();

/**
 * 加载配置的快捷函数
 * 
 * @param cwd - 工作目录
 * @returns 配置对象
 * 
 * @example
 * ```typescript
 * const config = await loadConfig();
 * ```
 */
export async function loadConfig(cwd?: string): Promise<FullConfig> {
  return defaultConfigManager.load(cwd);
}


