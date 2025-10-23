/**
 * 文件大小分布统计器
 */

import type { Analyzer, FileSizeDistribution } from '../../types';
import { getAllFiles, getFileSize } from '../../utils/fileUtils';
import { getFileSizeCategory } from '../../utils/metricsUtils';
import { SUPPORTED_EXTENSIONS } from '../../constants';

export class FileSizeDistributor implements Analyzer {
  getName(): string {
    return 'FileSizeDistributor';
  }

  async analyze(data: { projectPath: string }): Promise<FileSizeDistribution> {
    const { projectPath } = data;

    const codeExtensions = [...SUPPORTED_EXTENSIONS.CODE, ...SUPPORTED_EXTENSIONS.STYLE];
    const files = await getAllFiles(projectPath, codeExtensions);

    const distribution: FileSizeDistribution = {
      small: 0,
      medium: 0,
      large: 0,
      huge: 0,
    };

    for (const file of files) {
      try {
        const size = await getFileSize(file);
        const category = getFileSizeCategory(size);
        distribution[category]++;
      } catch (error) {
        console.warn(`无法获取文件大小: ${file}`);
      }
    }

    return distribution;
  }
}

