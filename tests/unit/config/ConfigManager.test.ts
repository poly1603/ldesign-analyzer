/**
 * ConfigManager单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { ConfigManager } from '../../../src/config';
import { ConfigError } from '../../../src/errors';

describe('ConfigManager', () => {
  const testDir = path.join(__dirname, '__test_config__');
  let configManager: ConfigManager;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    configManager = new ConfigManager();
    configManager.reset(); // 重置配置
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('load', () => {
    it('should load JSON config file', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      const configData = {
        path: './dist',
        bundler: 'webpack',
        output: ['cli', 'html'],
      };

      await fs.writeFile(configPath, JSON.stringify(configData));

      const config = await configManager.load(testDir);

      expect(config.path).toBe('./dist');
      expect(config.bundler).toBe('webpack');
      expect(config.output).toEqual(['cli', 'html']);
    });

    it('should use default config if no config file found', async () => {
      const config = await configManager.load(testDir);

      expect(config).toBeDefined();
      expect(config.bundler).toBe('auto');
      expect(config.analyze).toBeDefined();
    });

    it('should validate config', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      const invalidConfig = {
        // 缺少必需的path字段
        bundler: 'webpack',
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));

      await expect(configManager.load(testDir)).rejects.toThrow(ConfigError);
    });

    it('should reject invalid bundler type', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      const invalidConfig = {
        path: './dist',
        bundler: 'invalid-bundler',
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));

      await expect(configManager.load(testDir)).rejects.toThrow(ConfigError);
    });

    it('should load from package.json analyzer field', async () => {
      const packageJsonPath = path.join(testDir, 'package.json');
      const packageJson = {
        name: 'test-package',
        analyzer: {
          path: './dist',
          bundler: 'vite',
        },
      };

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const config = await configManager.load(testDir);

      expect(config.path).toBe('./dist');
      expect(config.bundler).toBe('vite');
    });

    it('should cache loaded config', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      await fs.writeFile(configPath, JSON.stringify({ path: './dist' }));

      const config1 = await configManager.load(testDir);
      const config2 = await configManager.load(testDir);

      expect(config1).toBe(config2); // 应该是同一个对象
    });
  });

  describe('merge', () => {
    it('should merge configs correctly', () => {
      const base = {
        path: './dist',
        bundler: 'webpack' as const,
        analyze: {
          bundle: true,
          dependency: true,
        },
        cache: {
          enabled: true,
        },
      };

      const overrides = {
        bundler: 'vite' as const,
        analyze: {
          bundle: false,
        },
      };

      const merged = configManager.merge(base, overrides);

      expect(merged.bundler).toBe('vite');
      expect(merged.analyze?.bundle).toBe(false);
      expect(merged.analyze?.dependency).toBe(true); // 保留
      expect(merged.cache?.enabled).toBe(true); // 保留
    });

    it('should deep merge nested objects', () => {
      const base = {
        path: './dist',
        cache: {
          enabled: true,
          dir: '.cache',
          ttl: 1000,
        },
      };

      const overrides = {
        cache: {
          enabled: false,
        },
      };

      const merged = configManager.merge(base, overrides);

      expect(merged.cache?.enabled).toBe(false);
      expect(merged.cache?.dir).toBe('.cache'); // 保留
      expect(merged.cache?.ttl).toBe(1000); // 保留
    });
  });

  describe('getConfig', () => {
    it('should return null before loading', () => {
      const config = configManager.getConfig();
      expect(config).toBeNull();
    });

    it('should return loaded config', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      await fs.writeFile(configPath, JSON.stringify({ path: './dist' }));

      await configManager.load(testDir);
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config?.path).toBe('./dist');
    });
  });

  describe('reset', () => {
    it('should reset config', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      await fs.writeFile(configPath, JSON.stringify({ path: './dist' }));

      await configManager.load(testDir);
      expect(configManager.getConfig()).toBeDefined();

      configManager.reset();
      expect(configManager.getConfig()).toBeNull();
    });
  });

  describe('validation', () => {
    it('should accept valid bundler types', async () => {
      const validBundlers = ['webpack', 'rollup', 'vite', 'auto'];

      for (const bundler of validBundlers) {
        const configPath = path.join(testDir, '.analyzerrc');
        const config = { path: './dist', bundler };
        await fs.writeFile(configPath, JSON.stringify(config));

        configManager.reset();
        const loaded = await configManager.load(testDir);
        expect(loaded.bundler).toBe(bundler);
      }
    });

    it('should accept valid output formats', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      const config = {
        path: './dist',
        output: ['cli', 'html', 'json'],
      };

      await fs.writeFile(configPath, JSON.stringify(config));

      const loaded = await configManager.load(testDir);
      expect(loaded.output).toEqual(['cli', 'html', 'json']);
    });

    it('should reject invalid output format', async () => {
      const configPath = path.join(testDir, '.analyzerrc');
      const config = {
        path: './dist',
        output: ['invalid-format'],
      };

      await fs.writeFile(configPath, JSON.stringify(config));

      await expect(configManager.load(testDir)).rejects.toThrow(ConfigError);
    });
  });

  describe('default config', () => {
    it('should have sensible defaults', async () => {
      const config = await configManager.load(testDir);

      expect(config.bundler).toBe('auto');
      expect(config.output).toEqual(['cli']);
      expect(config.analyze?.bundle).toBe(true);
      expect(config.analyze?.dependency).toBe(true);
      expect(config.analyze?.code).toBe(true);
      expect(config.cache?.enabled).toBe(true);
      expect(config.performance?.concurrency).toBe(10);
      expect(config.exclude).toContain('node_modules');
    });
  });

  describe('config file priority', () => {
    it('should prioritize .analyzerrc over package.json', async () => {
      // 创建两个配置文件
      const analyzerrcPath = path.join(testDir, '.analyzerrc');
      const packageJsonPath = path.join(testDir, 'package.json');

      await fs.writeFile(analyzerrcPath, JSON.stringify({
        path: './from-analyzerrc',
      }));

      await fs.writeFile(packageJsonPath, JSON.stringify({
        name: 'test',
        analyzer: {
          path: './from-package-json',
        },
      }));

      const config = await configManager.load(testDir);

      expect(config.path).toBe('./from-analyzerrc');
    });
  });
});


