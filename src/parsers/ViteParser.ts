/**
 * Vite Manifest 解析器
 */

import type { Parser, ParsedData, ModuleInfo, ChunkInfo } from '../types';
import { fileExists, readJsonFile, getFileSize } from '../utils/fileUtils';
import path from 'path';

interface ViteManifest {
  [key: string]: ViteManifestChunk;
}

interface ViteManifestChunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

export class ViteParser implements Parser {
  /**
   * 解析Vite manifest.json文件
   */
  async parse(projectPath: string): Promise<ParsedData> {
    const manifestPath = await this.findManifestFile(projectPath);

    if (!manifestPath) {
      throw new Error('未找到 Vite manifest.json 文件');
    }

    const manifest: ViteManifest = await readJsonFile(manifestPath);
    const distPath = path.dirname(manifestPath);

    const modules: ModuleInfo[] = [];
    const chunks: ChunkInfo[] = [];
    const dependencies: Record<string, string[]> = {};

    for (const [key, chunk] of Object.entries(manifest)) {
      const filePath = path.join(distPath, chunk.file);
      let size = 0;

      try {
        size = await getFileSize(filePath);
      } catch {
        console.warn(`无法获取文件大小: ${filePath}`);
      }

      const deps = [
        ...(chunk.imports || []),
        ...(chunk.dynamicImports || []),
      ];

      // 添加为chunk
      chunks.push({
        id: chunk.file,
        name: chunk.src || chunk.file,
        size,
        initial: chunk.isEntry || false,
        modules: [key],
      });

      // 添加为模块
      modules.push({
        id: chunk.file,
        name: chunk.src || key,
        size,
        chunks: [chunk.file],
        dependencies: deps,
        dependents: [],
        path: chunk.src || chunk.file,
      });

      dependencies[key] = deps;

      // 添加CSS资源
      if (chunk.css) {
        for (const cssFile of chunk.css) {
          const cssPath = path.join(distPath, cssFile);
          let cssSize = 0;

          try {
            cssSize = await getFileSize(cssPath);
          } catch {
            console.warn(`无法获取CSS文件大小: ${cssPath}`);
          }

          modules.push({
            id: cssFile,
            name: cssFile,
            size: cssSize,
            chunks: [chunk.file],
            dependencies: [],
            dependents: [key],
            path: cssFile,
          });
        }
      }
    }

    // 处理被依赖关系
    this.processDependents(modules);

    return {
      modules,
      chunks,
      dependencies,
      buildInfo: {},
    };
  }

  /**
   * 检查是否支持该路径
   */
  supports(projectPath: string): boolean {
    // 检查是否存在vite配置文件
    const configFiles = [
      'vite.config.js',
      'vite.config.ts',
      'vite.config.mjs',
    ];

    return configFiles.some(file => {
      try {
        return require('fs').existsSync(path.join(projectPath, file));
      } catch {
        return false;
      }
    });
  }

  /**
   * 查找manifest文件
   */
  private async findManifestFile(projectPath: string): Promise<string | null> {
    const possiblePaths = [
      path.join(projectPath, '.vite', 'manifest.json'),
      path.join(projectPath, 'dist', '.vite', 'manifest.json'),
      path.join(projectPath, 'dist', 'manifest.json'),
      path.join(projectPath, 'build', 'manifest.json'),
    ];

    for (const filePath of possiblePaths) {
      if (await fileExists(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * 处理模块被依赖关系
   */
  private processDependents(modules: ModuleInfo[]): void {
    const moduleMap = new Map(modules.map(m => [m.name, m]));

    for (const module of modules) {
      for (const depName of module.dependencies) {
        const depModule = moduleMap.get(depName);
        if (depModule && !depModule.dependents.includes(module.name)) {
          depModule.dependents.push(module.name);
        }
      }
    }
  }
}

