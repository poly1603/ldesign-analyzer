/**
 * ComplexityAnalyzer单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { ComplexityAnalyzer } from '../../../src/analyzers/quality/ComplexityAnalyzer';

describe('ComplexityAnalyzer', () => {
  const testDir = path.join(__dirname, '__test_complexity__');
  let analyzer: ComplexityAnalyzer;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    analyzer = new ComplexityAnalyzer();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('analyze', () => {
    it('should analyze simple function', async () => {
      const testFile = path.join(testDir, 'simple.ts');
      await fs.writeFile(
        testFile,
        `function simple() {
  return true;
}`
      );

      const result = await analyzer.analyze({ projectPath: testDir });

      expect(result.totalFunctions).toBeGreaterThan(0);
      expect(result.averageComplexity).toBeGreaterThanOrEqual(1);
    });

    it('should identify complex functions', async () => {
      const testFile = path.join(testDir, 'complex.ts');
      await fs.writeFile(
        testFile,
        `function complex(x: number, y: number) {
  if (x > 0) {
    if (y > 0) {
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          console.log(i);
        }
      }
    } else {
      while (y < 10) {
        y++;
      }
    }
  } else {
    switch (x) {
      case 1:
        return 'one';
      case 2:
        return 'two';
      default:
        return 'other';
    }
  }
  return x && y || false;
}`
      );

      const result = await analyzer.analyze({ projectPath: testDir });

      expect(result.complexFunctions.length).toBeGreaterThan(0);
      expect(result.maxComplexity).toBeGreaterThan(10);
    });

    it('should handle arrow functions', async () => {
      const testFile = path.join(testDir, 'arrow.ts');
      await fs.writeFile(
        testFile,
        `const add = (a: number, b: number) => a + b;
const check = (x: number) => x > 0 ? 'positive' : 'negative';`
      );

      const result = await analyzer.analyze({ projectPath: testDir });

      expect(result.totalFunctions).toBeGreaterThanOrEqual(2);
    });

    it('should handle class methods', async () => {
      const testFile = path.join(testDir, 'class.ts');
      await fs.writeFile(
        testFile,
        `class MyClass {
  method1() {
    return 1;
  }
  
  method2(x: number) {
    if (x > 0) {
      return x * 2;
    }
    return 0;
  }
}`
      );

      const result = await analyzer.analyze({ projectPath: testDir });

      expect(result.totalFunctions).toBeGreaterThanOrEqual(2);
    });

    it('should calculate average complexity correctly', async () => {
      const testFile = path.join(testDir, 'multiple.ts');
      await fs.writeFile(
        testFile,
        `function simple1() { return 1; }
function simple2() { return 2; }
function withIf(x: number) {
  if (x > 0) {
    return x;
  }
  return 0;
}`
      );

      const result = await analyzer.analyze({ projectPath: testDir });

      expect(result.averageComplexity).toBeGreaterThan(0);
      expect(result.averageComplexity).toBeLessThan(10);
    });

    it('should handle empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await analyzer.analyze({ projectPath: emptyDir });

      expect(result.totalFunctions).toBe(0);
      expect(result.averageComplexity).toBe(0);
      expect(result.maxComplexity).toBe(0);
      expect(result.complexFunctions).toEqual([]);
    });
  });

  describe('getName', () => {
    it('should return analyzer name', () => {
      expect(analyzer.getName()).toBe('ComplexityAnalyzer');
    });
  });
});

