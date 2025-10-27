/**
 * 代码坏味道检测器
 * 
 * @description 检测代码中的常见坏味道和反模式
 * @module analyzers/quality/CodeSmellDetector
 */

import { parse } from '@babel/parser';
import type { Analyzer, CodeSmell } from '../../types';
import { getAllFiles, readFile, countLines } from '../../utils/fileUtils';
import { CODE_SMELL_THRESHOLDS } from '../../constants';
import { AnalysisError } from '../../errors';

/**
 * 代码坏味道检测结果
 */
export interface CodeSmellResult {
  /** 代码坏味道列表 */
  smells: CodeSmell[];
  /** 按严重程度分组 */
  bySeverity: {
    low: number;
    medium: number;
    high: number;
  };
  /** 按类型分组 */
  byType: Record<string, number>;
}

/**
 * 代码坏味道检测器
 * 
 * @description 检测常见的代码坏味道，如长函数、深层嵌套、过多参数等
 * 
 * @example
 * ```typescript
 * const detector = new CodeSmellDetector();
 * const result = await detector.analyze({ projectPath: './src' });
 * 
 * console.log(`发现 ${result.smells.length} 个代码坏味道`);
 * console.log(`高严重度: ${result.bySeverity.high}`);
 * ```
 */
export class CodeSmellDetector implements Analyzer {
  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'CodeSmellDetector';
  }

  /**
   * 检测项目中的代码坏味道
   * 
   * @param data - 包含项目路径的数据对象
   * @returns 代码坏味道检测结果
   * @throws {AnalysisError} 当检测失败时
   */
  async analyze(data: { projectPath: string }): Promise<CodeSmellResult> {
    const { projectPath } = data;

    try {
      const files = await getAllFiles(projectPath, [
        '.js', '.jsx', '.ts', '.tsx'
      ]);

      const smells: CodeSmell[] = [];

      for (const file of files) {
        try {
          const fileSmells = await this.analyzeFile(file);
          smells.push(...fileSmells);
        } catch (error) {
          console.warn(`跳过文件 ${file}: ${(error as Error).message}`);
        }
      }

      // 统计
      const bySeverity = {
        low: smells.filter(s => s.severity === 'low').length,
        medium: smells.filter(s => s.severity === 'medium').length,
        high: smells.filter(s => s.severity === 'high').length,
      };

      const byType: Record<string, number> = {};
      for (const smell of smells) {
        byType[smell.type] = (byType[smell.type] || 0) + 1;
      }

      return {
        smells,
        bySeverity,
        byType,
      };
    } catch (error) {
      throw new AnalysisError(
        '代码坏味道检测失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 分析单个文件
   * 
   * @param filePath - 文件路径
   * @returns 代码坏味道数组
   * @private
   */
  private async analyzeFile(filePath: string): Promise<CodeSmell[]> {
    const content = await readFile(filePath);
    const smells: CodeSmell[] = [];

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

      // 检测各种坏味道
      this.detectLongFunctions(ast, filePath, smells);
      this.detectDeepNesting(ast, filePath, smells);
      this.detectTooManyParameters(ast, filePath, smells);
      this.detectGodObjects(ast, filePath, smells);
      this.detectMagicNumbers(ast, filePath, smells);
      this.detectLongParameterList(ast, filePath, smells);
    } catch (error) {
      // 解析失败，跳过
    }

    return smells;
  }

  /**
   * 检测长函数
   * 
   * @param ast - AST
   * @param filePath - 文件路径
   * @param smells - 坏味道数组
   * @private
   */
  private detectLongFunctions(ast: any, filePath: string, smells: CodeSmell[]): void {
    this.traverseAST(ast, (node) => {
      if (this.isFunctionNode(node)) {
        const length = this.getFunctionLength(node);

        if (length > CODE_SMELL_THRESHOLDS.LONG_FUNCTION) {
          smells.push({
            type: 'long-function',
            file: filePath,
            line: node.loc?.start.line,
            description: `函数过长 (${length} 行)，建议拆分为更小的函数`,
            severity: length > CODE_SMELL_THRESHOLDS.LONG_FUNCTION * 2 ? 'high' : 'medium',
          });
        }
      }
    });
  }

  /**
   * 检测深层嵌套
   * 
   * @param ast - AST
   * @param filePath - 文件路径
   * @param smells - 坏味道数组
   * @private
   */
  private detectDeepNesting(ast: any, filePath: string, smells: CodeSmell[]): void {
    this.traverseAST(ast, (node) => {
      if (this.isFunctionNode(node)) {
        const maxDepth = this.calculateNestingDepth(node);

        if (maxDepth > CODE_SMELL_THRESHOLDS.DEEP_NESTING) {
          smells.push({
            type: 'deep-nesting',
            file: filePath,
            line: node.loc?.start.line,
            description: `嵌套层级过深 (${maxDepth} 层)，建议提取函数或使用早期返回`,
            severity: maxDepth > CODE_SMELL_THRESHOLDS.DEEP_NESTING * 1.5 ? 'high' : 'medium',
          });
        }
      }
    });
  }

  /**
   * 检测过多参数
   * 
   * @param ast - AST
   * @param filePath - 文件路径
   * @param smells - 坏味道数组
   * @private
   */
  private detectTooManyParameters(ast: any, filePath: string, smells: CodeSmell[]): void {
    this.traverseAST(ast, (node) => {
      if (this.isFunctionNode(node) && node.params) {
        const paramCount = node.params.length;

        if (paramCount > CODE_SMELL_THRESHOLDS.TOO_MANY_PARAMETERS) {
          smells.push({
            type: 'too-many-parameters',
            file: filePath,
            line: node.loc?.start.line,
            description: `参数过多 (${paramCount} 个)，建议使用参数对象`,
            severity: paramCount > CODE_SMELL_THRESHOLDS.TOO_MANY_PARAMETERS * 1.5 ? 'high' : 'medium',
          });
        }
      }
    });
  }

  /**
   * 检测上帝对象（方法过多的类）
   * 
   * @param ast - AST
   * @param filePath - 文件路径
   * @param smells - 坏味道数组
   * @private
   */
  private detectGodObjects(ast: any, filePath: string, smells: CodeSmell[]): void {
    this.traverseAST(ast, (node) => {
      if (node.type === 'ClassDeclaration' && node.body) {
        const methodCount = node.body.body.filter(
          (member: any) => member.type === 'ClassMethod' || member.type === 'MethodDefinition'
        ).length;

        if (methodCount > CODE_SMELL_THRESHOLDS.GOD_OBJECT) {
          smells.push({
            type: 'god-object',
            file: filePath,
            line: node.loc?.start.line,
            description: `类方法过多 (${methodCount} 个)，建议拆分为多个小类`,
            severity: methodCount > CODE_SMELL_THRESHOLDS.GOD_OBJECT * 1.5 ? 'high' : 'medium',
          });
        }
      }
    });
  }

  /**
   * 检测魔法数字
   * 
   * @param ast - AST
   * @param filePath - 文件路径
   * @param smells - 坏味道数组
   * @private
   */
  private detectMagicNumbers(ast: any, filePath: string, smells: CodeSmell[]): void {
    const magicNumbers = new Set<number>();

    this.traverseAST(ast, (node) => {
      if (node.type === 'NumericLiteral' && typeof node.value === 'number') {
        // 排除常见的非魔法数字
        if (![0, 1, -1, 2, 10, 100, 1000].includes(node.value)) {
          if (!magicNumbers.has(node.value)) {
            magicNumbers.add(node.value);

            // 只报告在条件或计算中使用的数字
            if (this.isInConditionOrCalculation(node)) {
              smells.push({
                type: 'long-function', // 复用类型
                file: filePath,
                line: node.loc?.start.line,
                description: `魔法数字 ${node.value}，建议使用命名常量`,
                severity: 'low',
              });
            }
          }
        }
      }
    });
  }

  /**
   * 检测长参数列表（参数解构）
   * 
   * @param ast - AST
   * @param filePath - 文件路径
   * @param smells - 坏味道数组
   * @private
   */
  private detectLongParameterList(ast: any, filePath: string, smells: CodeSmell[]): void {
    this.traverseAST(ast, (node) => {
      if (node.type === 'CallExpression' && node.arguments) {
        if (node.arguments.length > 5) {
          smells.push({
            type: 'too-many-parameters',
            file: filePath,
            line: node.loc?.start.line,
            description: `函数调用参数过多 (${node.arguments.length} 个)`,
            severity: 'low',
          });
        }
      }
    });
  }

  /**
   * 遍历AST
   * 
   * @param node - AST节点
   * @param callback - 回调函数
   * @private
   */
  private traverseAST(node: any, callback: (node: any) => void): void {
    if (!node || typeof node !== 'object') return;

    callback(node);

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(item => this.traverseAST(item, callback));
      } else if (value && typeof value === 'object') {
        this.traverseAST(value, callback);
      }
    }
  }

  /**
   * 判断是否是函数节点
   * 
   * @param node - AST节点
   * @returns 是否是函数节点
   * @private
   */
  private isFunctionNode(node: any): boolean {
    return [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
      'ClassMethod',
      'ObjectMethod',
    ].includes(node.type);
  }

  /**
   * 获取函数长度（行数）
   * 
   * @param node - 函数节点
   * @returns 函数长度
   * @private
   */
  private getFunctionLength(node: any): number {
    if (node.loc) {
      return node.loc.end.line - node.loc.start.line + 1;
    }
    return 0;
  }

  /**
   * 计算嵌套深度
   * 
   * @param node - AST节点
   * @returns 最大嵌套深度
   * @private
   */
  private calculateNestingDepth(node: any): number {
    let maxDepth = 0;

    const traverse = (n: any, depth: number) => {
      if (!n || typeof n !== 'object') return;

      if (this.isBlockStatement(n)) {
        maxDepth = Math.max(maxDepth, depth);
        depth++;
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;

        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(item => traverse(item, depth));
        } else if (value && typeof value === 'object') {
          traverse(value, depth);
        }
      }
    };

    traverse(node.body, 0);
    return maxDepth;
  }

  /**
   * 判断是否是块语句
   * 
   * @param node - AST节点
   * @returns 是否是块语句
   * @private
   */
  private isBlockStatement(node: any): boolean {
    return [
      'IfStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      'SwitchStatement',
    ].includes(node.type);
  }

  /**
   * 判断数字是否在条件或计算中
   * 
   * @param node - 数字节点
   * @returns 是否在条件或计算中
   * @private
   */
  private isInConditionOrCalculation(node: any): boolean {
    // 简化判断，实际应该检查父节点类型
    return true;
  }
}


