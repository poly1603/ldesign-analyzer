/**
 * 重复代码检测器
 * 
 * @description 检测项目中的重复代码块
 * @module analyzers/quality/DuplicateCodeDetector
 */

import type { Analyzer, DuplicateCode } from '../../types';
import { getAllFiles, readFile } from '../../utils/fileUtils';
import { createHash } from 'crypto';
import { AnalysisError } from '../../errors';

/**
 * 重复代码检测结果
 */
export interface DuplicateCodeResult {
  /** 重复代码块列表 */
  duplicates: DuplicateCode[];
  /** 总重复行数 */
  totalDuplicateLines: number;
  /** 重复代码比例 */
  duplicatePercentage: number;
  /** 总代码行数 */
  totalLines: number;
}

/**
 * 代码块信息
 */
interface CodeBlock {
  /** 文件路径 */
  file: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 代码内容 */
  content: string;
  /** 哈希值 */
  hash: string;
}

/**
 * 重复代码检测器
 * 
 * @description 使用哈希算法检测重复代码块
 * 
 * @example
 * ```typescript
 * const detector = new DuplicateCodeDetector();
 * const result = await detector.analyze({ 
 *   projectPath: './src',
 *   minLines: 5  // 最少5行才算重复
 * });
 * 
 * console.log(`重复代码比例: ${result.duplicatePercentage}%`);
 * ```
 */
export class DuplicateCodeDetector implements Analyzer {
  /** 最小重复行数 */
  private readonly MIN_LINES = 5;

  /** 最小token数 */
  private readonly MIN_TOKENS = 50;

  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'DuplicateCodeDetector';
  }

  /**
   * 检测项目中的重复代码
   * 
   * @param data - 包含项目路径和配置的数据对象
   * @returns 重复代码检测结果
   * @throws {AnalysisError} 当检测失败时
   */
  async analyze(data: {
    projectPath: string;
    minLines?: number;
    minTokens?: number;
  }): Promise<DuplicateCodeResult> {
    const { projectPath, minLines = this.MIN_LINES, minTokens = this.MIN_TOKENS } = data;

    try {
      // 获取所有代码文件
      const files = await getAllFiles(projectPath, [
        '.js', '.jsx', '.ts', '.tsx', '.vue'
      ]);

      // 提取所有代码块
      const blocks: CodeBlock[] = [];
      let totalLines = 0;

      for (const file of files) {
        try {
          const fileBlocks = await this.extractCodeBlocks(file, minLines);
          blocks.push(...fileBlocks);

          // 统计总行数
          const content = await readFile(file);
          totalLines += content.split('\n').length;
        } catch (error) {
          console.warn(`跳过文件 ${file}: ${(error as Error).message}`);
        }
      }

      // 检测重复
      const duplicates = this.findDuplicates(blocks, minTokens);

      // 计算统计信息
      const totalDuplicateLines = duplicates.reduce(
        (sum, dup) => sum + dup.lines,
        0
      );

      const duplicatePercentage = totalLines > 0
        ? Math.round((totalDuplicateLines / totalLines) * 10000) / 100
        : 0;

      return {
        duplicates,
        totalDuplicateLines,
        duplicatePercentage,
        totalLines,
      };
    } catch (error) {
      throw new AnalysisError(
        '重复代码检测失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 从文件中提取代码块
   * 
   * @param filePath - 文件路径
   * @param minLines - 最小行数
   * @returns 代码块数组
   * @private
   */
  private async extractCodeBlocks(
    filePath: string,
    minLines: number
  ): Promise<CodeBlock[]> {
    const content = await readFile(filePath);
    const lines = content.split('\n');
    const blocks: CodeBlock[] = [];

    // 使用滑动窗口提取代码块
    for (let i = 0; i <= lines.length - minLines; i++) {
      const blockLines = lines.slice(i, i + minLines);

      // 过滤掉空行和注释行
      const codeLines = blockLines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0
          && !trimmed.startsWith('//')
          && !trimmed.startsWith('/*')
          && !trimmed.startsWith('*')
          && !trimmed.startsWith('#');
      });

      // 至少要有minLines行有效代码
      if (codeLines.length >= minLines) {
        const blockContent = blockLines.join('\n');
        const normalized = this.normalizeCode(blockContent);

        blocks.push({
          file: filePath,
          startLine: i + 1,
          endLine: i + minLines,
          content: blockContent,
          hash: this.hashCode(normalized),
        });
      }
    }

    return blocks;
  }

  /**
   * 查找重复的代码块
   * 
   * @param blocks - 代码块数组
   * @param minTokens - 最小token数
   * @returns 重复代码列表
   * @private
   */
  private findDuplicates(
    blocks: CodeBlock[],
    minTokens: number
  ): DuplicateCode[] {
    const duplicates: DuplicateCode[] = [];
    const hashMap = new Map<string, CodeBlock[]>();

    // 按哈希分组
    for (const block of blocks) {
      const existing = hashMap.get(block.hash) || [];
      existing.push(block);
      hashMap.set(block.hash, existing);
    }

    // 找出重复的组
    for (const [hash, group] of hashMap) {
      if (group.length > 1) {
        // 计算token数
        const tokens = this.countTokens(group[0].content);

        if (tokens >= minTokens) {
          // 去重文件列表
          const files = [...new Set(group.map(b => b.file))];

          duplicates.push({
            files,
            lines: group[0].endLine - group[0].startLine + 1,
            tokens,
            percentage: 0, // 稍后计算
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * 标准化代码（移除空白、格式差异）
   * 
   * @param code - 原始代码
   * @returns 标准化后的代码
   * @private
   */
  private normalizeCode(code: string): string {
    return code
      // 移除多余空白
      .replace(/\s+/g, ' ')
      // 移除注释
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      // 统一引号
      .replace(/"/g, "'")
      // 移除分号
      .replace(/;/g, '')
      .trim();
  }

  /**
   * 计算代码的哈希值
   * 
   * @param code - 代码内容
   * @returns 哈希字符串
   * @private
   */
  private hashCode(code: string): string {
    return createHash('md5').update(code).digest('hex');
  }

  /**
   * 计算token数量（简化实现）
   * 
   * @param code - 代码内容
   * @returns token数量
   * @private
   */
  private countTokens(code: string): number {
    // 简单地按空白符分割计算token数
    return code.split(/\s+/).filter(t => t.length > 0).length;
  }
}


