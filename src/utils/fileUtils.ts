/**
 * 文件工具函数
 * 
 * @description 提供文件系统操作、压缩计算、文件分析等工具函数
 * @module utils/fileUtils
 */

import { promises as fs } from 'fs';
import path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';
import { FileSystemError } from '../errors';

/**
 * 检查文件是否存在
 * 
 * @param filePath - 文件路径
 * @returns 文件是否存在
 * 
 * @example
 * ```typescript
 * if (await fileExists('./package.json')) {
 *   console.log('文件存在');
 * }
 * ```
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
 * 
 * @template T - JSON数据的类型
 * @param filePath - JSON文件路径
 * @returns 解析后的JSON对象
 * @throws {FileSystemError} 当文件不存在或解析失败时
 * 
 * @example
 * ```typescript
 * interface Config {
 *   name: string;
 *   version: string;
 * }
 * const config = await readJsonFile<Config>('./package.json');
 * console.log(config.name);
 * ```
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new FileSystemError(
      `无法读取JSON文件: ${filePath}`,
      { filePath },
      error as Error
    );
  }
}

/**
 * 写入JSON文件
 * 
 * @param filePath - 目标文件路径
 * @param data - 要写入的数据
 * @param pretty - 是否格式化输出，默认true
 * @throws {FileSystemError} 当写入失败时
 * 
 * @example
 * ```typescript
 * await writeJsonFile('./config.json', { name: 'test', version: '1.0.0' });
 * ```
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new FileSystemError(
      `无法写入JSON文件: ${filePath}`,
      { filePath },
      error as Error
    );
  }
}

/**
 * 获取文件大小（字节）
 * 
 * @param filePath - 文件路径
 * @returns 文件大小（字节）
 * @throws {FileSystemError} 当文件不存在或无法访问时
 * 
 * @example
 * ```typescript
 * const size = await getFileSize('./dist/bundle.js');
 * console.log(`文件大小: ${size} 字节`);
 * ```
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    throw new FileSystemError(
      `无法获取文件大小: ${filePath}`,
      { filePath },
      error as Error
    );
  }
}

/**
 * 计算内容的Gzip压缩后大小
 * 
 * @param content - 要压缩的内容（字符串或Buffer）
 * @returns Gzip压缩后的大小（字节）
 * 
 * @example
 * ```typescript
 * const code = 'function test() { return "hello"; }';
 * const gzipSize = getGzipSize(code);
 * console.log(`Gzip大小: ${gzipSize} 字节`);
 * ```
 */
export function getGzipSize(content: string | Buffer): number {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return gzipSync(buffer).length;
}

/**
 * 计算内容的Brotli压缩后大小
 * 
 * @param content - 要压缩的内容（字符串或Buffer）
 * @returns Brotli压缩后的大小（字节）
 * 
 * @example
 * ```typescript
 * const code = 'function test() { return "hello"; }';
 * const brotliSize = getBrotliSize(code);
 * console.log(`Brotli大小: ${brotliSize} 字节`);
 * ```
 */
export function getBrotliSize(content: string | Buffer): number {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return brotliCompressSync(buffer).length;
}

/**
 * 获取文件扩展名（小写）
 * 
 * @param filePath - 文件路径
 * @returns 文件扩展名（包含.，如 .js）
 * 
 * @example
 * ```typescript
 * getFileExtension('index.ts'); // '.ts'
 * getFileExtension('App.VUE');  // '.vue'
 * ```
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * 判断文件的资源类型
 * 
 * @param filePath - 文件路径
 * @returns 资源类型
 * 
 * @example
 * ```typescript
 * getAssetType('app.js');      // 'js'
 * getAssetType('style.css');   // 'css'
 * getAssetType('logo.png');    // 'images'
 * getAssetType('font.woff2');  // 'fonts'
 * ```
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
 * 格式化字节大小为人类可读格式
 * 
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认2位
 * @returns 格式化后的字符串
 * 
 * @example
 * ```typescript
 * formatBytes(1024);           // '1 KB'
 * formatBytes(1536);           // '1.5 KB'
 * formatBytes(1048576);        // '1 MB'
 * formatBytes(0);              // '0 Bytes'
 * formatBytes(1536, 0);        // '2 KB'
 * ```
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
 * 
 * @param dirPath - 目录路径
 * @param extensions - 可选的文件扩展名过滤列表
 * @param exclude - 要排除的目录名称列表
 * @returns 文件路径数组
 * @throws {FileSystemError} 当目录不存在或无法访问时
 * 
 * @example
 * ```typescript
 * // 获取所有文件
 * const allFiles = await getAllFiles('./src');
 * 
 * // 只获取.ts和.tsx文件
 * const tsFiles = await getAllFiles('./src', ['.ts', '.tsx']);
 * 
 * // 自定义排除目录
 * const files = await getAllFiles('./src', undefined, ['node_modules', 'test']);
 * ```
 */
export async function getAllFiles(
  dirPath: string,
  extensions?: string[],
  exclude: string[] = ['node_modules', '.git', 'dist', 'build', 'coverage']
): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentPath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // 跳过排除的目录
          if (!exclude.includes(entry.name)) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          if (!extensions || extensions.includes(getFileExtension(fullPath))) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 静默处理权限错误
      if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
        throw new FileSystemError(
          `无法读取目录: ${currentPath}`,
          { currentPath },
          error as Error
        );
      }
    }
  }

  await traverse(dirPath);
  return files;
}

/**
 * 并发获取多个目录的所有文件
 * 
 * @param dirPaths - 目录路径数组
 * @param extensions - 可选的文件扩展名过滤列表
 * @returns 文件路径数组
 * 
 * @example
 * ```typescript
 * const files = await getAllFilesConcurrent(
 *   ['./src', './lib', './test'],
 *   ['.ts', '.tsx']
 * );
 * ```
 */
export async function getAllFilesConcurrent(
  dirPaths: string[],
  extensions?: string[]
): Promise<string[]> {
  const results = await Promise.all(
    dirPaths.map(dirPath => getAllFiles(dirPath, extensions))
  );
  return results.flat();
}

/**
 * 读取文件内容
 * 
 * @param filePath - 文件路径
 * @param encoding - 文件编码，默认utf-8
 * @returns 文件内容
 * @throws {FileSystemError} 当文件不存在或无法读取时
 * 
 * @example
 * ```typescript
 * const content = await readFile('./README.md');
 * console.log(content);
 * ```
 */
export async function readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (error) {
    throw new FileSystemError(
      `无法读取文件: ${filePath}`,
      { filePath },
      error as Error
    );
  }
}

/**
 * 并发读取多个文件
 * 
 * @param filePaths - 文件路径数组
 * @returns 文件内容数组
 * 
 * @example
 * ```typescript
 * const contents = await readFilesConcurrent([
 *   './file1.txt',
 *   './file2.txt',
 *   './file3.txt'
 * ]);
 * ```
 */
export async function readFilesConcurrent(filePaths: string[]): Promise<string[]> {
  return Promise.all(filePaths.map(filePath => readFile(filePath)));
}

/**
 * 写入文件
 * 
 * @param filePath - 文件路径
 * @param content - 文件内容
 * @param encoding - 文件编码，默认utf-8
 * @throws {FileSystemError} 当写入失败时
 * 
 * @example
 * ```typescript
 * await writeFile('./output.txt', 'Hello World');
 * ```
 */
export async function writeFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, encoding);
  } catch (error) {
    throw new FileSystemError(
      `无法写入文件: ${filePath}`,
      { filePath },
      error as Error
    );
  }
}

/**
 * 确保目录存在，不存在则创建
 * 
 * @param dirPath - 目录路径
 * @throws {FileSystemError} 当创建失败时
 * 
 * @example
 * ```typescript
 * await ensureDir('./output/reports');
 * ```
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new FileSystemError(
      `无法创建目录: ${dirPath}`,
      { dirPath },
      error as Error
    );
  }
}

/**
 * 计算文件的代码行数统计
 * 
 * @param filePath - 文件路径
 * @returns 行数统计对象
 * @throws {FileSystemError} 当文件无法读取时
 * 
 * @description 统计代码行、注释行、空白行
 * - 支持单行注释（//、#）
 * - 支持多行注释（/* ... *\/）
 * 
 * @example
 * ```typescript
 * const stats = await countLines('./src/index.ts');
 * console.log(`代码行: ${stats.code}`);
 * console.log(`注释行: ${stats.comment}`);
 * console.log(`空白行: ${stats.blank}`);
 * console.log(`总行数: ${stats.total}`);
 * ```
 */
export async function countLines(filePath: string): Promise<{
  total: number;
  code: number;
  comment: number;
  blank: number;
}> {
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

    // 检测多行注释开始
    if (trimmed.startsWith('/*')) {
      inMultiLineComment = true;
    }

    // 在多行注释中
    if (inMultiLineComment) {
      comment++;
      if (trimmed.includes('*/')) {
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

/**
 * 批量处理文件并发操作
 * 
 * @template T - 处理结果类型
 * @param files - 文件路径数组
 * @param processor - 处理函数
 * @param concurrency - 并发数量，默认10
 * @returns 处理结果数组
 * 
 * @example
 * ```typescript
 * const results = await processBatch(
 *   files,
 *   async (file) => countLines(file),
 *   5 // 最多5个并发
 * );
 * ```
 */
export async function processBatch<T>(
  files: string[],
  processor: (file: string) => Promise<T>,
  concurrency: number = 10
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...files];

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const file = queue.shift();
      if (file) {
        try {
          const result = await processor(file);
          results.push(result);
        } catch (error) {
          console.warn(`处理文件失败: ${file}`, error);
        }
      }
    }
  }

  // 创建并发worker
  const workers = Array(Math.min(concurrency, files.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  return results;
}

