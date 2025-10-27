/**
 * 死代码检测器
 * 
 * @description 检测项目中未使用的导出和死代码
 * @module analyzers/quality/DeadCodeDetector
 */

import { parse } from '@babel/parser';
import type { Analyzer, DeadCode } from '../../types';
import { getAllFiles, readFile } from '../../utils/fileUtils';
import { AnalysisError } from '../../errors';

/**
 * 死代码检测结果
 */
export interface DeadCodeResult {
  /** 死代码列表 */
  deadCode: DeadCode[];
  /** 未使用的导出数量 */
  unusedExports: number;
  /** 未导入的文件数量 */
  orphanedFiles: number;
}

/**
 * 导出信息
 */
interface ExportInfo {
  file: string;
  name: string;
  type: 'named' | 'default';
  line: number;
}

/**
 * 导入信息
 */
interface ImportInfo {
  file: string;
  from: string;
  imports: string[];
}

/**
 * 死代码检测器
 * 
 * @description 分析项目中的导出和导入，找出未使用的代码
 * 
 * @example
 * ```typescript
 * const detector = new DeadCodeDetector();
 * const result = await detector.analyze({ 
 *   projectPath: './src',
 *   entryPoints: ['./src/index.ts']
 * });
 * 
 * console.log(`发现 ${result.unusedExports} 个未使用的导出`);
 * ```
 */
export class DeadCodeDetector implements Analyzer {
  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'DeadCodeDetector';
  }

  /**
   * 检测项目中的死代码
   * 
   * @param data - 包含项目路径和入口点的数据对象
   * @returns 死代码检测结果
   * @throws {AnalysisError} 当检测失败时
   */
  async analyze(data: {
    projectPath: string;
    entryPoints?: string[];
  }): Promise<DeadCodeResult> {
    const { projectPath, entryPoints = [] } = data;

    try {
      // 获取所有源文件
      const files = await getAllFiles(projectPath, [
        '.js', '.jsx', '.ts', '.tsx'
      ]);

      // 提取所有导出
      const exports = new Map<string, ExportInfo[]>();
      for (const file of files) {
        try {
          const fileExports = await this.extractExports(file);
          if (fileExports.length > 0) {
            exports.set(file, fileExports);
          }
        } catch (error) {
          console.warn(`跳过文件 ${file}: ${(error as Error).message}`);
        }
      }

      // 提取所有导入
      const imports: ImportInfo[] = [];
      for (const file of files) {
        try {
          const fileImports = await this.extractImports(file);
          imports.push(...fileImports);
        } catch (error) {
          console.warn(`跳过文件 ${file}: ${(error as Error).message}`);
        }
      }

      // 查找未使用的导出
      const deadCode = this.findDeadCode(exports, imports, entryPoints);

      // 查找孤立文件（没有被任何文件导入）
      const orphanedFiles = this.findOrphanedFiles(files, imports, entryPoints);

      return {
        deadCode,
        unusedExports: deadCode.length,
        orphanedFiles: orphanedFiles.length,
      };
    } catch (error) {
      throw new AnalysisError(
        '死代码检测失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 从文件中提取导出
   * 
   * @param filePath - 文件路径
   * @returns 导出信息数组
   * @private
   */
  private async extractExports(filePath: string): Promise<ExportInfo[]> {
    const content = await readFile(filePath);
    const exports: ExportInfo[] = [];

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
        ],
      });

      // 遍历AST查找导出
      for (const node of ast.program.body) {
        // export default
        if (node.type === 'ExportDefaultDeclaration') {
          exports.push({
            file: filePath,
            name: 'default',
            type: 'default',
            line: node.loc?.start.line || 0,
          });
        }

        // export { name }
        if (node.type === 'ExportNamedDeclaration') {
          if (node.specifiers) {
            for (const specifier of node.specifiers) {
              if (specifier.type === 'ExportSpecifier') {
                exports.push({
                  file: filePath,
                  name: specifier.exported.name || specifier.exported.value,
                  type: 'named',
                  line: node.loc?.start.line || 0,
                });
              }
            }
          }

          // export const name = ...
          if (node.declaration) {
            const declaration = node.declaration;
            if (declaration.type === 'VariableDeclaration') {
              for (const declarator of declaration.declarations) {
                if (declarator.id.type === 'Identifier') {
                  exports.push({
                    file: filePath,
                    name: declarator.id.name,
                    type: 'named',
                    line: node.loc?.start.line || 0,
                  });
                }
              }
            } else if (
              declaration.type === 'FunctionDeclaration' ||
              declaration.type === 'ClassDeclaration'
            ) {
              if (declaration.id) {
                exports.push({
                  file: filePath,
                  name: declaration.id.name,
                  type: 'named',
                  line: node.loc?.start.line || 0,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      // 解析失败，返回空数组
    }

    return exports;
  }

  /**
   * 从文件中提取导入
   * 
   * @param filePath - 文件路径
   * @returns 导入信息数组
   * @private
   */
  private async extractImports(filePath: string): Promise<ImportInfo[]> {
    const content = await readFile(filePath);
    const imports: ImportInfo[] = [];

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
        ],
      });

      for (const node of ast.program.body) {
        if (node.type === 'ImportDeclaration') {
          const from = node.source.value;
          const importedNames: string[] = [];

          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier') {
              importedNames.push('default');
            } else if (specifier.type === 'ImportSpecifier') {
              importedNames.push(
                specifier.imported.name || specifier.imported.value
              );
            } else if (specifier.type === 'ImportNamespaceSpecifier') {
              importedNames.push('*');
            }
          }

          imports.push({
            file: filePath,
            from,
            imports: importedNames,
          });
        }
      }
    } catch (error) {
      // 解析失败，返回空数组
    }

    return imports;
  }

  /**
   * 查找死代码
   * 
   * @param exports - 导出映射
   * @param imports - 导入数组
   * @param entryPoints - 入口点
   * @returns 死代码列表
   * @private
   */
  private findDeadCode(
    exports: Map<string, ExportInfo[]>,
    imports: ImportInfo[],
    entryPoints: string[]
  ): DeadCode[] {
    const deadCode: DeadCode[] = [];
    const usedExports = new Set<string>();

    // 标记所有导入的导出为已使用
    for (const importInfo of imports) {
      for (const importName of importInfo.imports) {
        const key = `${importInfo.from}:${importName}`;
        usedExports.add(key);
      }
    }

    // 标记入口点的所有导出为已使用
    for (const entryPoint of entryPoints) {
      const entryExports = exports.get(entryPoint);
      if (entryExports) {
        for (const exp of entryExports) {
          const key = `${exp.file}:${exp.name}`;
          usedExports.add(key);
        }
      }
    }

    // 查找未使用的导出
    for (const [file, fileExports] of exports) {
      const unusedInFile: string[] = [];

      for (const exp of fileExports) {
        const key = `${file}:${exp.name}`;
        const relativeKey = `./${file}:${exp.name}`;

        if (!usedExports.has(key) && !usedExports.has(relativeKey)) {
          unusedInFile.push(exp.name);
        }
      }

      if (unusedInFile.length > 0) {
        deadCode.push({
          file,
          exports: unusedInFile,
          reason: '这些导出未被任何文件导入',
        });
      }
    }

    return deadCode;
  }

  /**
   * 查找孤立文件
   * 
   * @param files - 所有文件
   * @param imports - 导入信息
   * @param entryPoints - 入口点
   * @returns 孤立文件列表
   * @private
   */
  private findOrphanedFiles(
    files: string[],
    imports: ImportInfo[],
    entryPoints: string[]
  ): string[] {
    const importedFiles = new Set<string>();

    // 收集所有被导入的文件
    for (const importInfo of imports) {
      importedFiles.add(importInfo.from);
    }

    // 标记入口点
    for (const entry of entryPoints) {
      importedFiles.add(entry);
    }

    // 查找未被导入的文件
    const orphaned: string[] = [];
    for (const file of files) {
      if (!importedFiles.has(file) && !entryPoints.includes(file)) {
        orphaned.push(file);
      }
    }

    return orphaned;
  }
}


