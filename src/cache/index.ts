/**
 * 缓存系统
 * 
 * @description 提供分析结果缓存，避免重复分析未修改的文件
 * @module cache
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileExists, readJsonFile, writeJsonFile, ensureDir } from '../utils/fileUtils';
import type { AnalysisResult } from '../types';

/**
 * 缓存条目
 */
interface CacheEntry<T = any> {
  /** 数据 */
  data: T;
  /** 文件哈希值 */
  hash: string;
  /** 创建时间 */
  timestamp: number;
  /** 过期时间（毫秒） */
  ttl?: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 缓存目录 */
  cacheDir?: string;
  /** 默认TTL（毫秒），0表示永不过期 */
  defaultTTL?: number;
  /** 是否启用缓存 */
  enabled?: boolean;
}

/**
 * 缓存管理器
 * 
 * @description 管理分析结果的缓存，支持基于文件哈希的缓存失效
 * 
 * @example
 * ```typescript
 * const cache = new CacheManager({
 *   cacheDir: './.analyzer-cache',
 *   defaultTTL: 3600000 // 1小时
 * });
 * 
 * // 保存缓存
 * await cache.set('bundle-analysis', result, filePath);
 * 
 * // 读取缓存
 * const cached = await cache.get('bundle-analysis', filePath);
 * if (cached) {
 *   console.log('使用缓存结果');
 * }
 * ```
 */
export class CacheManager {
  private cacheDir: string;
  private defaultTTL: number;
  private enabled: boolean;
  private memoryCache: Map<string, CacheEntry> = new Map();

  constructor(options: CacheOptions = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.analyzer-cache');
    this.defaultTTL = options.defaultTTL || 0; // 默认永不过期
    this.enabled = options.enabled !== false;
  }

  /**
   * 获取缓存
   * 
   * @template T - 缓存数据类型
   * @param key - 缓存键
   * @param filePath - 关联的文件路径（用于检查文件是否修改）
   * @returns 缓存的数据，如果不存在或已过期则返回null
   * 
   * @example
   * ```typescript
   * const result = await cache.get<AnalysisResult>('analysis', './dist');
   * if (result) {
   *   console.log('使用缓存');
   * } else {
   *   console.log('缓存未命中');
   * }
   * ```
   */
  async get<T = any>(key: string, filePath?: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // 先检查内存缓存
      const memEntry = this.memoryCache.get(key);
      if (memEntry && this.isValid(memEntry)) {
        // 如果提供了文件路径，检查文件是否修改
        if (filePath) {
          const currentHash = await this.getFileHash(filePath);
          if (currentHash !== memEntry.hash) {
            this.memoryCache.delete(key);
            return null;
          }
        }
        return memEntry.data as T;
      }

      // 检查磁盘缓存
      const cachePath = this.getCachePath(key);
      if (!(await fileExists(cachePath))) {
        return null;
      }

      const entry: CacheEntry<T> = await readJsonFile(cachePath);

      // 检查是否过期
      if (!this.isValid(entry)) {
        await this.delete(key);
        return null;
      }

      // 检查文件是否修改
      if (filePath) {
        const currentHash = await this.getFileHash(filePath);
        if (currentHash !== entry.hash) {
          await this.delete(key);
          return null;
        }
      }

      // 加载到内存缓存
      this.memoryCache.set(key, entry);

      return entry.data;
    } catch (error) {
      console.warn(`读取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 设置缓存
   * 
   * @template T - 缓存数据类型
   * @param key - 缓存键
   * @param data - 要缓存的数据
   * @param filePath - 关联的文件路径
   * @param ttl - 过期时间（毫秒），不提供则使用默认TTL
   * 
   * @example
   * ```typescript
   * await cache.set('bundle-result', result, './dist', 3600000);
   * ```
   */
  async set<T = any>(
    key: string,
    data: T,
    filePath?: string,
    ttl?: number
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const hash = filePath ? await this.getFileHash(filePath) : '';
      const entry: CacheEntry<T> = {
        data,
        hash,
        timestamp: Date.now(),
        ttl: ttl !== undefined ? ttl : this.defaultTTL,
      };

      // 保存到内存
      this.memoryCache.set(key, entry);

      // 保存到磁盘
      await ensureDir(this.cacheDir);
      const cachePath = this.getCachePath(key);
      await writeJsonFile(cachePath, entry);
    } catch (error) {
      console.warn(`写入缓存失败: ${key}`, error);
    }
  }

  /**
   * 删除缓存
   * 
   * @param key - 缓存键
   * 
   * @example
   * ```typescript
   * await cache.delete('old-analysis');
   * ```
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    try {
      const cachePath = this.getCachePath(key);
      if (await fileExists(cachePath)) {
        await fs.unlink(cachePath);
      }
    } catch (error) {
      console.warn(`删除缓存失败: ${key}`, error);
    }
  }

  /**
   * 清空所有缓存
   * 
   * @example
   * ```typescript
   * await cache.clear();
   * console.log('缓存已清空');
   * ```
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      if (await fileExists(this.cacheDir)) {
        const files = await fs.readdir(this.cacheDir);
        await Promise.all(
          files.map(file =>
            fs.unlink(path.join(this.cacheDir, file)).catch(() => { })
          )
        );
      }
    } catch (error) {
      console.warn('清空缓存失败', error);
    }
  }

  /**
   * 清理过期缓存
   * 
   * @example
   * ```typescript
   * await cache.cleanup();
   * ```
   */
  async cleanup(): Promise<void> {
    try {
      if (!(await fileExists(this.cacheDir))) {
        return;
      }

      const files = await fs.readdir(this.cacheDir);
      let cleaned = 0;

      for (const file of files) {
        try {
          const cachePath = path.join(this.cacheDir, file);
          const entry: CacheEntry = await readJsonFile(cachePath);

          if (!this.isValid(entry)) {
            await fs.unlink(cachePath);
            cleaned++;
          }
        } catch (error) {
          // 忽略单个文件的错误
        }
      }

      console.log(`清理了 ${cleaned} 个过期缓存`);
    } catch (error) {
      console.warn('清理缓存失败', error);
    }
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计
   * 
   * @example
   * ```typescript
   * const stats = await cache.getStats();
   * console.log(`缓存命中率: ${stats.hitRate}%`);
   * ```
   */
  async getStats(): Promise<{
    totalEntries: number;
    memoryEntries: number;
    diskEntries: number;
    totalSize: number;
  }> {
    const stats = {
      totalEntries: 0,
      memoryEntries: this.memoryCache.size,
      diskEntries: 0,
      totalSize: 0,
    };

    try {
      if (await fileExists(this.cacheDir)) {
        const files = await fs.readdir(this.cacheDir);
        stats.diskEntries = files.length;

        for (const file of files) {
          try {
            const filePath = path.join(this.cacheDir, file);
            const stat = await fs.stat(filePath);
            stats.totalSize += stat.size;
          } catch (error) {
            // 忽略单个文件的错误
          }
        }
      }

      stats.totalEntries = Math.max(stats.memoryEntries, stats.diskEntries);
    } catch (error) {
      console.warn('获取缓存统计失败', error);
    }

    return stats;
  }

  /**
   * 检查缓存条目是否有效
   * 
   * @param entry - 缓存条目
   * @returns 是否有效
   * @private
   */
  private isValid(entry: CacheEntry): boolean {
    if (!entry.ttl || entry.ttl === 0) {
      return true; // 永不过期
    }

    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  /**
   * 获取文件的哈希值
   * 
   * @param filePath - 文件路径
   * @returns 文件哈希值
   * @private
   */
  private async getFileHash(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      // 使用文件修改时间和大小生成简单哈希
      const hashInput = `${stats.mtime.getTime()}-${stats.size}`;
      return createHash('md5').update(hashInput).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * 获取缓存文件路径
   * 
   * @param key - 缓存键
   * @returns 缓存文件路径
   * @private
   */
  private getCachePath(key: string): string {
    const safeKey = key.replace(/[^a-z0-9-_]/gi, '-');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }
}

/**
 * 默认缓存管理器实例
 */
export const defaultCache = new CacheManager();


