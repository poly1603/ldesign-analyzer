/**
 * fileUtils单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  fileExists,
  readJsonFile,
  writeJsonFile,
  getFileSize,
  getGzipSize,
  getBrotliSize,
  getFileExtension,
  getAssetType,
  formatBytes,
  countLines,
} from '../../../src/utils/fileUtils';

describe('fileUtils', () => {
  const testDir = path.join(__dirname, '__test_temp__');

  beforeEach(async () => {
    // 创建测试目录
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'test');

      const exists = await fileExists(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const testFile = path.join(testDir, 'non-existent.txt');

      const exists = await fileExists(testFile);
      expect(exists).toBe(false);
    });
  });

  describe('readJsonFile & writeJsonFile', () => {
    it('should write and read JSON file correctly', async () => {
      const testFile = path.join(testDir, 'test.json');
      const testData = { name: 'test', value: 123, nested: { key: 'value' } };

      await writeJsonFile(testFile, testData);
      const readData = await readJsonFile(testFile);

      expect(readData).toEqual(testData);
    });

    it('should create directory if not exists', async () => {
      const testFile = path.join(testDir, 'subdir', 'test.json');
      const testData = { test: true };

      await writeJsonFile(testFile, testData);
      const readData = await readJsonFile(testFile);

      expect(readData).toEqual(testData);
    });

    it('should format JSON with pretty option', async () => {
      const testFile = path.join(testDir, 'pretty.json');
      const testData = { a: 1, b: 2 };

      await writeJsonFile(testFile, testData, true);
      const content = await fs.readFile(testFile, 'utf-8');

      // 检查是否有换行和缩进
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('getFileSize', () => {
    it('should return correct file size', async () => {
      const testFile = path.join(testDir, 'size-test.txt');
      const content = 'Hello, World!'; // 13 bytes
      await fs.writeFile(testFile, content);

      const size = await getFileSize(testFile);
      expect(size).toBe(13);
    });

    it('should throw error for non-existing file', async () => {
      const testFile = path.join(testDir, 'non-existent.txt');

      await expect(getFileSize(testFile)).rejects.toThrow();
    });
  });

  describe('getGzipSize & getBrotliSize', () => {
    it('should calculate gzip size', () => {
      const content = 'Hello, World!'.repeat(100);
      const gzipSize = getGzipSize(content);

      // Gzip压缩后应该小于原始大小
      expect(gzipSize).toBeLessThan(content.length);
      expect(gzipSize).toBeGreaterThan(0);
    });

    it('should calculate brotli size', () => {
      const content = 'Hello, World!'.repeat(100);
      const brotliSize = getBrotliSize(content);

      // Brotli压缩后应该小于原始大小
      expect(brotliSize).toBeLessThan(content.length);
      expect(brotliSize).toBeGreaterThan(0);
    });

    it('should work with Buffer', () => {
      const buffer = Buffer.from('Test content'.repeat(50));
      const gzipSize = getGzipSize(buffer);
      const brotliSize = getBrotliSize(buffer);

      expect(gzipSize).toBeGreaterThan(0);
      expect(brotliSize).toBeGreaterThan(0);
    });
  });

  describe('getFileExtension', () => {
    it('should return lowercase extension', () => {
      expect(getFileExtension('test.JS')).toBe('.js');
      expect(getFileExtension('file.TXT')).toBe('.txt');
      expect(getFileExtension('app.VUE')).toBe('.vue');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('file.test.ts')).toBe('.ts');
    });
  });

  describe('getAssetType', () => {
    it('should identify JavaScript files', () => {
      expect(getAssetType('app.js')).toBe('js');
      expect(getAssetType('component.jsx')).toBe('js');
      expect(getAssetType('module.ts')).toBe('js');
      expect(getAssetType('App.tsx')).toBe('js');
    });

    it('should identify CSS files', () => {
      expect(getAssetType('style.css')).toBe('css');
      expect(getAssetType('vars.scss')).toBe('css');
      expect(getAssetType('theme.less')).toBe('css');
    });

    it('should identify image files', () => {
      expect(getAssetType('logo.png')).toBe('images');
      expect(getAssetType('photo.jpg')).toBe('images');
      expect(getAssetType('icon.svg')).toBe('images');
    });

    it('should identify font files', () => {
      expect(getAssetType('font.woff')).toBe('fonts');
      expect(getAssetType('font.woff2')).toBe('fonts');
      expect(getAssetType('font.ttf')).toBe('fonts');
    });

    it('should return other for unknown types', () => {
      expect(getAssetType('file.pdf')).toBe('other');
      expect(getAssetType('data.xml')).toBe('other');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should respect decimals parameter', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });
  });

  describe('countLines', () => {
    it('should count code lines correctly', async () => {
      const testFile = path.join(testDir, 'code.ts');
      const content = `// Comment line
function test() {
  console.log('hello');
  
  return true;
}

// Another comment`;

      await fs.writeFile(testFile, content);
      const result = await countLines(testFile);

      expect(result.total).toBe(8);
      expect(result.code).toBeGreaterThan(0);
      expect(result.comment).toBe(2);
      expect(result.blank).toBeGreaterThan(0);
    });

    it('should handle multi-line comments', async () => {
      const testFile = path.join(testDir, 'multiline.ts');
      const content = `/*
 * Multi-line comment
 * Line 2
 */
const x = 1;`;

      await fs.writeFile(testFile, content);
      const result = await countLines(testFile);

      expect(result.comment).toBe(4);
      expect(result.code).toBe(1);
    });

    it('should count blank lines', async () => {
      const testFile = path.join(testDir, 'blank.ts');
      const content = `const a = 1;


const b = 2;`;

      await fs.writeFile(testFile, content);
      const result = await countLines(testFile);

      expect(result.blank).toBe(2);
      expect(result.code).toBe(2);
    });
  });
});


