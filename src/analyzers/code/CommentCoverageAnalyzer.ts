/**
 * 注释覆盖率分析器
 */

import type { Analyzer } from '../../types';
import { getAllFiles, countLines } from '../../utils/fileUtils';
import { SUPPORTED_EXTENSIONS } from '../../constants';
import { calculatePercentage } from '../../utils/metricsUtils';

export class CommentCoverageAnalyzer implements Analyzer {
  getName(): string {
    return 'CommentCoverageAnalyzer';
  }

  async analyze(data: { projectPath: string }): Promise<number> {
    const { projectPath } = data;

    const codeExtensions = SUPPORTED_EXTENSIONS.CODE;
    const files = await getAllFiles(projectPath, codeExtensions);

    let totalCode = 0;
    let totalComment = 0;

    for (const file of files) {
      try {
        const lines = await countLines(file);
        totalCode += lines.code;
        totalComment += lines.comment;
      } catch (error) {
        console.warn(`无法统计文件注释: ${file}`);
      }
    }

    // 注释覆盖率 = 注释行数 / (代码行数 + 注释行数)
    if (totalCode + totalComment === 0) {
      return 0;
    }

    return calculatePercentage(totalComment, totalCode + totalComment);
  }
}

