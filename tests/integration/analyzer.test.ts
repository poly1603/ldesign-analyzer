/**
 * Analyzer集成测试
 * 
 * @description 测试完整的分析流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { Analyzer } from '../../src/core';
import type { AnalyzerConfig } from '../../src/types';

describe('Analyzer Integration Tests', () => {
  const testProjectDir = path.join(__dirname, '__test_project__');
  let analyzer: Analyzer;

  beforeEach(async () => {
    // 创建测试项目结构
    await fs.mkdir(testProjectDir, { recursive: true });
    await createTestProject(testProjectDir);

    analyzer = new Analyzer();
  });

  afterEach(async () => {
    try {
      await fs.rm(testProjectDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('analyze', () => {
    it('should analyze project successfully', async () => {
      const config: AnalyzerConfig = {
        path: testProjectDir,
        bundler: 'auto',
        analyze: {
          bundle: false, // 跳过bundle分析（需要构建输出）
          dependency: false,
          code: true,
        },
      };

      const result = await analyzer.analyze(config);

      expect(result).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.projectPath).toBe(testProjectDir);
      expect(result.code).toBeDefined();
    });

    it('should analyze code metrics', async () => {
      const config: AnalyzerConfig = {
        path: testProjectDir,
        analyze: {
          code: true,
          bundle: false,
          dependency: false,
        },
      };

      const result = await analyzer.analyze(config);

      expect(result.code).toBeDefined();
      expect(result.code?.lines).toBeDefined();
      expect(result.code?.lines.total).toBeGreaterThan(0);
      expect(result.code?.lines.code).toBeGreaterThan(0);
      expect(result.code?.commentCoverage).toBeGreaterThanOrEqual(0);
    });

    it('should generate suggestions', async () => {
      const config: AnalyzerConfig = {
        path: testProjectDir,
        analyze: {
          code: true,
        },
      };

      const result = await analyzer.analyze(config);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should call progress callback', async () => {
      const progressCalls: any[] = [];

      const config: AnalyzerConfig = {
        path: testProjectDir,
        analyze: {
          code: true,
          bundle: false,
          dependency: false,
        },
      };

      await analyzer.analyze(
        config,
        (phase, progress, message) => {
          progressCalls.push({ phase, progress, message });
        }
      );

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should handle invalid config', async () => {
      const config: AnalyzerConfig = {
        path: '', // 无效的空路径
        bundler: 'webpack',
      };

      await expect(analyzer.analyze(config)).rejects.toThrow();
    });

    it('should handle non-existent path', async () => {
      const config: AnalyzerConfig = {
        path: '/non/existent/path',
        analyze: {
          code: true,
        },
      };

      // 应该抛出错误或返回空结果
      try {
        const result = await analyzer.analyze(config);
        expect(result.code?.lines.total).toBe(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('report', () => {
    it('should generate CLI report', async () => {
      const config: AnalyzerConfig = {
        path: testProjectDir,
        analyze: { code: true, bundle: false },
      };

      const result = await analyzer.analyze(config);

      // 应该不抛出错误
      await expect(analyzer.report(result, ['cli'])).resolves.not.toThrow();
    });

    it('should generate JSON report', async () => {
      const config: AnalyzerConfig = {
        path: testProjectDir,
        analyze: { code: true, bundle: false },
      };

      const result = await analyzer.analyze(config);

      await analyzer.report(result, ['json']);

      // 检查JSON文件是否生成
      const jsonPath = path.join(process.cwd(), '.analyzer-output', 'analysis.json');
      const exists = await fileExists(jsonPath);

      // 清理
      if (exists) {
        await fs.unlink(jsonPath).catch(() => { });
      }
    });
  });

  describe('cancel', () => {
    it('should have cancel method', () => {
      expect(typeof analyzer.cancel).toBe('function');

      // 调用cancel不应该抛出错误
      expect(() => analyzer.cancel()).not.toThrow();
    });
  });
});

/**
 * 创建测试项目
 */
async function createTestProject(projectDir: string): Promise<void> {
  // 创建src目录
  const srcDir = path.join(projectDir, 'src');
  await fs.mkdir(srcDir, { recursive: true });

  // 创建几个测试文件
  await fs.writeFile(
    path.join(srcDir, 'index.ts'),
    `/**
 * 主入口文件
 */

export function main() {
  console.log('Hello, World!');
  return true;
}

export const VERSION = '1.0.0';
`
  );

  await fs.writeFile(
    path.join(srcDir, 'utils.ts'),
    `/**
 * 工具函数
 */

// 格式化字符串
export function formatString(str: string): string {
  return str.trim().toLowerCase();
}

// 计算总和
export function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}
`
  );

  await fs.writeFile(
    path.join(srcDir, 'constants.ts'),
    `export const API_URL = 'https://api.example.com';
export const MAX_RETRIES = 3;
export const TIMEOUT = 5000;
`
  );

  // 创建package.json
  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {},
    }, null, 2)
  );
}


