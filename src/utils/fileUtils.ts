/**
 * 文件工具函数
 */

import { promises as fs } from 'fs';
import path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取JSON文件
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 写入JSON文件
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取文件大小
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * 计算Gzip压缩后大小
 */
export function getGzipSize(content: string | Buffer): number {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return gzipSync(buffer).length;
}

/**
 * 计算Brotli压缩后大小
 */
export function getBrotliSize(content: string | Buffer): number {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return brotliCompressSync(buffer).length;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * 判断文件类型
 */
export function getAssetType(filePath: string): 'js' | 'css' | 'images' | 'fonts' | 'other' {
  const ext = getFileExtension(filePath);

  if (['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(ext)) {
    return 'js';
  }
  if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) {
    return 'css';
  }
  if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
    return 'images';
  }
  if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
    return 'fonts';
  }
  return 'other';
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 递归获取目录下所有文件
 */
export async function getAllFiles(dirPath: string, extensions?: string[]): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // 跳过node_modules等目录
        if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          await traverse(fullPath);
        }
      } else if (entry.isFile()) {
        if (!extensions || extensions.includes(getFileExtension(fullPath))) {
          files.push(fullPath);
        }
      }
    }
  }

  await traverse(dirPath);
  return files;
}

/**
 * 读取文件内容
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * 写入文件
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * 计算文件行数
 */
export async function countLines(filePath: string): Promise<{ total: number; code: number; comment: number; blank: number }> {
  const content = await readFile(filePath);
  const lines = content.split('\n');

  let code = 0;
  let comment = 0;
  let blank = 0;
  let inMultiLineComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      blank++;
      continue;
    }

    // 检测多行注释
    if (trimmed.startsWith('/*')) {
      inMultiLineComment = true;
    }

    if (inMultiLineComment) {
      comment++;
      if (trimmed.endsWith('*/')) {
        inMultiLineComment = false;
      }
      continue;
    }

    // 检测单行注释
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      comment++;
      continue;
    }

    code++;
  }

  return {
    total: lines.length,
    code,
    comment,
    blank
  };
}

