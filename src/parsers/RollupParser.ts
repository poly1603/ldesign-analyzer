/**
 * Rollup Bundle 解析器
 */

import type { Parser, ParsedData, ModuleInfo, ChunkInfo } from '../types';
import { fileExists, readFile, getFileSize, getAllFiles } from '../utils/fileUtils';
import path from 'path';
import { parse } from 'acorn';

export class RollupParser implements Parser {
  /**
   * 解析Rollup输出
   */
  async parse(projectPath: string): Promise<ParsedData> {
    const distPath = await this.findDistDirectory(projectPath);

    if (!distPath) {
      throw new Error('未找到 Rollup 输出目录');
    }

    // 获取所有JS文件
    const jsFiles = await getAllFiles(distPath, ['.js', '.mjs', '.cjs']);

    const modules: ModuleInfo[] = [];
    const chunks: ChunkInfo[] = [];
    const dependencies: Record<string, string[]> = {};

    for (const filePath of jsFiles) {
      const relativePath = path.relative(distPath, filePath);
      const size = await getFileSize(filePath);
      const content = await readFile(filePath);

      // 解析文件中的导入关系
      const deps = await this.extractImports(content, filePath);

      const chunkId = relativePath;

      // 添加为chunk
      chunks.push({
        id: chunkId,
        name: relativePath,
        size,
        initial: relativePath.includes('index') || relativePath.includes('main'),
        modules: [relativePath],
      });

      // 添加为模块
      modules.push({
        id: chunkId,
        name: relativePath,
        size,
        chunks: [chunkId],
        dependencies: deps,
        dependents: [],
        path: filePath,
      });

      dependencies[relativePath] = deps;
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
    // 检查是否存在rollup配置文件
    const configFiles = [
      'rollup.config.js',
      'rollup.config.mjs',
      'rollup.config.ts',
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
   * 查找dist目录
   */
  private async findDistDirectory(projectPath: string): Promise<string | null> {
    const possiblePaths = [
      path.join(projectPath, 'dist'),
      path.join(projectPath, 'build'),
      path.join(projectPath, 'lib'),
      path.join(projectPath, 'es'),
    ];

    for (const dirPath of possiblePaths) {
      if (await fileExists(dirPath)) {
        return dirPath;
      }
    }

    return null;
  }

  /**
   * 从代码中提取import语句
   */
  private async extractImports(content: string, filePath: string): Promise<string[]> {
    const imports: string[] = [];

    try {
      // 使用正则表达式提取import语句（更快速）
      const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
      const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;

      let match;

      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }

      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } catch (error) {
      console.warn(`解析文件失败: ${filePath}`, error);
    }

    return imports.filter((imp, index, self) => self.indexOf(imp) === index);
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

