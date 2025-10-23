/**
 * 代码行数统计器
 */

import type { Analyzer, LinesMetrics } from '../../types';
import { getAllFiles, countLines } from '../../utils/fileUtils';
import { SUPPORTED_EXTENSIONS } from '../../constants';

export class LinesCounter implements Analyzer {
  getName(): string {
    return 'LinesCounter';
  }

  async analyze(data: { projectPath: string }): Promise<LinesMetrics> {
    const { projectPath } = data;

    const codeExtensions = [...SUPPORTED_EXTENSIONS.CODE, ...SUPPORTED_EXTENSIONS.STYLE];
    const files = await getAllFiles(projectPath, codeExtensions);

    let total = 0;
    let code = 0;
    let comment = 0;
    let blank = 0;

    for (const file of files) {
      try {
        const lines = await countLines(file);
        total += lines.total;
        code += lines.code;
        comment += lines.comment;
        blank += lines.blank;
      } catch (error) {
        console.warn(`无法统计文件行数: ${file}`);
      }
    }

    return { total, code, comment, blank };
  }
}

