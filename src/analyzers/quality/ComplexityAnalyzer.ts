/**
 * 代码复杂度分析器
 * 
 * @description 分析代码的圈复杂度(Cyclomatic Complexity)
 * @module analyzers/quality/ComplexityAnalyzer
 */

import { parse } from '@babel/parser';
import type { Analyzer, ComplexFunction } from '../../types';
import { getAllFiles, readFile } from '../../utils/fileUtils';
import { AnalysisError } from '../../errors';

/**
 * 复杂度分析结果
 */
export interface ComplexityResult {
  /** 平均复杂度 */
  averageComplexity: number;
  /** 最大复杂度 */
  maxComplexity: number;
  /** 复杂函数列表 */
  complexFunctions: ComplexFunction[];
  /** 总函数数量 */
  totalFunctions: number;
}

/**
 * 代码复杂度分析器
 * 
 * @description 使用Babel解析器分析代码的圈复杂度
 * 
 * @example
 * ```typescript
 * const analyzer = new ComplexityAnalyzer();
 * const result = await analyzer.analyze({ projectPath: './src' });
 * console.log(`平均复杂度: ${result.averageComplexity}`);
 * ```
 */
export class ComplexityAnalyzer implements Analyzer {
  /** 复杂度阈值 */
  private readonly COMPLEXITY_THRESHOLD = 10;

  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'ComplexityAnalyzer';
  }

  /**
   * 分析项目代码复杂度
   * 
   * @param data - 包含项目路径的数据对象
   * @returns 复杂度分析结果
   * @throws {AnalysisError} 当分析失败时
   */
  async analyze(data: { projectPath: string }): Promise<ComplexityResult> {
    const { projectPath } = data;

    try {
      // 获取所有代码文件
      const files = await getAllFiles(projectPath, ['.js', '.jsx', '.ts', '.tsx']);

      const complexFunctions: ComplexFunction[] = [];
      let totalComplexity = 0;
      let totalFunctions = 0;

      // 分析每个文件
      for (const file of files) {
        try {
          const fileFunctions = await this.analyzeFile(file);
          complexFunctions.push(...fileFunctions);

          for (const func of fileFunctions) {
            totalComplexity += func.complexity;
            totalFunctions++;
          }
        } catch (error) {
          // 单个文件分析失败时继续处理其他文件
          console.warn(`跳过文件 ${file}: ${(error as Error).message}`);
        }
      }

      // 过滤出复杂度超过阈值的函数
      const complexFunctionsFiltered = complexFunctions
        .filter(f => f.complexity > this.COMPLEXITY_THRESHOLD)
        .sort((a, b) => b.complexity - a.complexity);

      const maxComplexity = complexFunctions.length > 0
        ? Math.max(...complexFunctions.map(f => f.complexity))
        : 0;

      const averageComplexity = totalFunctions > 0
        ? Math.round((totalComplexity / totalFunctions) * 10) / 10
        : 0;

      return {
        averageComplexity,
        maxComplexity,
        complexFunctions: complexFunctionsFiltered,
        totalFunctions,
      };
    } catch (error) {
      throw new AnalysisError(
        '代码复杂度分析失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 分析单个文件的复杂度
   * 
   * @param filePath - 文件路径
   * @returns 文件中的复杂函数列表
   * @private
   */
  private async analyzeFile(filePath: string): Promise<ComplexFunction[]> {
    const content = await readFile(filePath);
    const functions: ComplexFunction[] = [];

    try {
      // 使用Babel解析代码
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      });

      // 遍历AST计算复杂度
      this.traverseAST(ast, filePath, functions);
    } catch (error) {
      // 解析失败时静默跳过
      // console.warn(`无法解析文件 ${filePath}:`, error);
    }

    return functions;
  }

  /**
   * 遍历AST并计算函数复杂度
   * 
   * @param node - AST节点
   * @param filePath - 文件路径
   * @param functions - 函数列表（累积结果）
   * @private
   */
  private traverseAST(node: any, filePath: string, functions: ComplexFunction[]): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // 检查是否是函数节点
    if (this.isFunctionNode(node)) {
      const complexity = this.calculateComplexity(node);
      const name = this.getFunctionName(node);
      const line = node.loc?.start.line || 0;

      functions.push({
        name,
        file: filePath,
        line,
        complexity,
      });
    }

    // 递归遍历子节点
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'tokens') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(item => this.traverseAST(item, filePath, functions));
      } else if (value && typeof value === 'object') {
        this.traverseAST(value, filePath, functions);
      }
    }
  }

  /**
   * 判断节点是否是函数
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
   * 获取函数名称
   * 
   * @param node - 函数节点
   * @returns 函数名称
   * @private
   */
  private getFunctionName(node: any): string {
    if (node.id && node.id.name) {
      return node.id.name;
    }
    if (node.key && node.key.name) {
      return node.key.name;
    }
    return '<anonymous>';
  }

  /**
   * 计算函数的圈复杂度
   * 
   * @description 基于以下规则计算：
   * - 基础复杂度: 1
   * - 每个if/else if: +1
   * - 每个case: +1
   * - 每个&&/||: +1
   * - 每个循环(for/while/do): +1
   * - 每个catch: +1
   * - 每个三元运算符: +1
   * 
   * @param node - 函数节点
   * @returns 复杂度值
   * @private
   */
  private calculateComplexity(node: any): number {
    let complexity = 1; // 基础复杂度

    const traverse = (n: any) => {
      if (!n || typeof n !== 'object') {
        return;
      }

      // 条件语句
      if (n.type === 'IfStatement') {
        complexity++;
      }

      // switch case
      if (n.type === 'SwitchCase' && n.test !== null) {
        complexity++;
      }

      // 循环
      if (['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement'].includes(n.type)) {
        complexity++;
      }

      // 逻辑运算符
      if (n.type === 'LogicalExpression' && (n.operator === '&&' || n.operator === '||')) {
        complexity++;
      }

      // 三元运算符
      if (n.type === 'ConditionalExpression') {
        complexity++;
      }

      // catch块
      if (n.type === 'CatchClause') {
        complexity++;
      }

      // 可选链
      if (n.type === 'OptionalMemberExpression' || n.type === 'OptionalCallExpression') {
        complexity++;
      }

      // 递归遍历
      for (const key in n) {
        if (key === 'loc' || key === 'range') {
          continue;
        }
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(item => traverse(item));
        } else if (value && typeof value === 'object') {
          traverse(value);
        }
      }
    };

    // 遍历函数体
    if (node.body) {
      traverse(node.body);
    }

    return complexity;
  }
}


