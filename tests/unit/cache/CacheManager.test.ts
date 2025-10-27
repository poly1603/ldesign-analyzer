/**
 * CacheManager单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { CacheManager } from '../../../src/cache';

describe('CacheManager', () => {
  const testCacheDir = path.join(__dirname, '__test_cache__');
  let cache: CacheManager;

  beforeEach(async () => {
    cache = new CacheManager({
      cacheDir: testCacheDir,
      enabled: true,
      defaultTTL: 1000, // 1秒用于测试
    });
  });

  afterEach(async () => {
    try {
      await cache.clear();
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const data = { value: 'test data', number: 123 };

      await cache.set(key, data);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should handle different data types', async () => {
      const stringData = 'test string';
      const numberData = 42;
      const arrayData = [1, 2, 3];
      const objectData = { nested: { key: 'value' } };

      await cache.set('string', stringData);
      await cache.set('number', numberData);
      await cache.set('array', arrayData);
      await cache.set('object', objectData);

      expect(await cache.get('string')).toBe(stringData);
      expect(await cache.get('number')).toBe(numberData);
      expect(await cache.get('array')).toEqual(arrayData);
      expect(await cache.get('object')).toEqual(objectData);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire cache after TTL', async () => {
      const key = 'ttl-test';
      const data = 'test data';

      await cache.set(key, data, undefined, 100); // 100ms TTL

      // 立即获取应该成功
      let retrieved = await cache.get(key);
      expect(retrieved).toBe(data);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 过期后应该返回null
      retrieved = await cache.get(key);
      expect(retrieved).toBeNull();
    });

    it('should not expire if TTL is 0', async () => {
      const key = 'no-ttl';
      const data = 'persistent data';

      await cache.set(key, data, undefined, 0);

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 100));

      // 应该仍然存在
      const retrieved = await cache.get(key);
      expect(retrieved).toBe(data);
    });
  });

  describe('file-based caching', () => {
    it('should invalidate cache when file changes', async () => {
      const testFile = path.join(testCacheDir, 'test-file.txt');
      await fs.mkdir(testCacheDir, { recursive: true });
      await fs.writeFile(testFile, 'v1');

      const key = 'file-cache';
      const data = 'cached data v1';

      await cache.set(key, data, testFile);

      // 第一次获取应该成功
      let retrieved = await cache.get(key, testFile);
      expect(retrieved).toBe(data);

      // 修改文件
      await new Promise(resolve => setTimeout(resolve, 10)); // 确保时间戳不同
      await fs.writeFile(testFile, 'v2');

      // 缓存应该失效
      retrieved = await cache.get(key, testFile);
      expect(retrieved).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete cache entry', async () => {
      const key = 'delete-test';
      const data = 'test data';

      await cache.set(key, data);
      expect(await cache.get(key)).toBe(data);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      await cache.set('key1', 'data1');
      await cache.set('key2', 'data2');
      await cache.set('key3', 'data3');

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      await cache.set('valid', 'data1', undefined, 10000); // 10秒
      await cache.set('expired', 'data2', undefined, 10); // 10ms

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 50));

      await cache.cleanup();

      expect(await cache.get('valid')).toBe('data1');
      expect(await cache.get('expired')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cache.set('key1', 'data1');
      await cache.set('key2', 'data2');

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
      expect(stats.memoryEntries).toBeGreaterThanOrEqual(2);
    });
  });

  describe('disabled cache', () => {
    it('should not cache when disabled', async () => {
      const disabledCache = new CacheManager({
        cacheDir: testCacheDir,
        enabled: false,
      });

      await disabledCache.set('key', 'data');
      const retrieved = await disabledCache.get('key');

      expect(retrieved).toBeNull();
    });
  });

  describe('memory cache', () => {
    it('should use memory cache for faster access', async () => {
      const key = 'memory-test';
      const data = 'test data';

      // 第一次设置
      await cache.set(key, data);

      // 第二次获取应该从内存缓存读取（更快）
      const start = Date.now();
      const retrieved = await cache.get(key);
      const elapsed = Date.now() - start;

      expect(retrieved).toBe(data);
      expect(elapsed).toBeLessThan(10); // 应该很快
    });
  });
});


