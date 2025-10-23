/**
 * Webpack Stats 解析器
 */

import type { Parser, ParsedData, ModuleInfo, ChunkInfo } from '../types';
import { fileExists, readJsonFile } from '../utils/fileUtils';
import path from 'path';

interface WebpackStats {
  version?: string;
  time?: number;
  builtAt?: number;
  hash?: string;
  chunks?: WebpackChunk[];
  modules?: WebpackModule[];
  assets?: WebpackAsset[];
  entrypoints?: Record<string, WebpackEntrypoint>;
}

interface WebpackChunk {
  id: string | number;
  names?: string[];
  initial?: boolean;
  entry?: boolean;
  modules?: WebpackModule[];
  files?: string[];
  parents?: (string | number)[];
  children?: (string | number)[];
  size?: number;
}

interface WebpackModule {
  id?: string | number;
  identifier?: string;
  name?: string;
  size?: number;
  chunks?: (string | number)[];
  depth?: number;
  reasons?: WebpackModuleReason[];
  issuer?: string;
  modules?: WebpackModule[];
}

interface WebpackModuleReason {
  moduleId?: string | number;
  moduleName?: string;
  type?: string;
}

interface WebpackAsset {
  name: string;
  size: number;
  chunks?: (string | number)[];
  chunkNames?: string[];
}

interface WebpackEntrypoint {
  chunks: (string | number)[];
  assets: { name: string; size: number }[];
}

export class WebpackParser implements Parser {
  /**
   * 解析Webpack stats.json文件
   */
  async parse(projectPath: string): Promise<ParsedData> {
    const statsPath = await this.findStatsFile(projectPath);

    if (!statsPath) {
      throw new Error('未找到 webpack-stats.json 文件');
    }

    const stats: WebpackStats = await readJsonFile(statsPath);

    return {
      modules: this.parseModules(stats),
      chunks: this.parseChunks(stats),
      dependencies: this.parseDependencies(stats),
      buildInfo: {
        time: stats.time,
        version: stats.version,
      },
    };
  }

  /**
   * 检查是否支持该路径
   */
  supports(projectPath: string): boolean {
    return true; // Webpack是最常用的，作为兜底
  }

  /**
   * 查找stats文件
   */
  private async findStatsFile(projectPath: string): Promise<string | null> {
    const possiblePaths = [
      path.join(projectPath, 'webpack-stats.json'),
      path.join(projectPath, 'stats.json'),
      path.join(projectPath, 'dist', 'stats.json'),
      path.join(projectPath, 'build', 'stats.json'),
    ];

    for (const filePath of possiblePaths) {
      if (await fileExists(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * 解析模块信息
   */
  private parseModules(stats: WebpackStats): ModuleInfo[] {
    const modules: ModuleInfo[] = [];

    if (!stats.modules) return modules;

    for (const module of stats.modules) {
      // 跳过没有名称的模块
      if (!module.name && !module.identifier) continue;

      const moduleInfo: ModuleInfo = {
        id: String(module.id || module.identifier || ''),
        name: module.name || module.identifier || '',
        size: module.size || 0,
        chunks: (module.chunks || []).map(c => String(c)),
        dependencies: this.extractDependencies(module),
        dependents: [], // 后续处理
        path: module.name,
      };

      modules.push(moduleInfo);

      // 递归处理子模块
      if (module.modules) {
        for (const subModule of module.modules) {
          if (subModule.name) {
            modules.push({
              id: String(subModule.id || subModule.identifier || ''),
              name: subModule.name,
              size: subModule.size || 0,
              chunks: (subModule.chunks || []).map(c => String(c)),
              dependencies: this.extractDependencies(subModule),
              dependents: [],
              path: subModule.name,
            });
          }
        }
      }
    }

    // 处理被依赖关系
    this.processDependents(modules);

    return modules;
  }

  /**
   * 提取模块的依赖
   */
  private extractDependencies(module: WebpackModule): string[] {
    if (!module.reasons) return [];

    return module.reasons
      .filter(reason => reason.moduleName)
      .map(reason => reason.moduleName!)
      .filter((name, index, self) => self.indexOf(name) === index); // 去重
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

  /**
   * 解析Chunk信息
   */
  private parseChunks(stats: WebpackStats): ChunkInfo[] {
    if (!stats.chunks) return [];

    return stats.chunks.map(chunk => ({
      id: String(chunk.id),
      name: chunk.names?.join(',') || String(chunk.id),
      size: chunk.size || 0,
      initial: chunk.initial || chunk.entry || false,
      modules: (chunk.modules || [])
        .map(m => m.name || m.identifier || '')
        .filter(Boolean),
      parents: chunk.parents?.map(p => String(p)),
      children: chunk.children?.map(c => String(c)),
    }));
  }

  /**
   * 解析依赖关系
   */
  private parseDependencies(stats: WebpackStats): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {};

    if (!stats.modules) return dependencies;

    for (const module of stats.modules) {
      if (module.name) {
        dependencies[module.name] = this.extractDependencies(module);
      }
    }

    return dependencies;
  }
}

