/**
 * 语言分布检测器
 */

import type { Analyzer, LanguageDistribution } from '../../types';
import { getAllFiles, countLines, getFileExtension } from '../../utils/fileUtils';
import { calculatePercentage } from '../../utils/metricsUtils';
import { SUPPORTED_EXTENSIONS } from '../../constants';

export class LanguageDetector implements Analyzer {
  getName(): string {
    return 'LanguageDetector';
  }

  async analyze(data: { projectPath: string }): Promise<LanguageDistribution> {
    const { projectPath } = data;

    const codeExtensions = [...SUPPORTED_EXTENSIONS.CODE, ...SUPPORTED_EXTENSIONS.STYLE];
    const files = await getAllFiles(projectPath, codeExtensions);

    const langStats: Record<string, { files: number; lines: number }> = {};
    let totalLines = 0;

    for (const file of files) {
      try {
        const ext = getFileExtension(file);
        const lang = this.extensionToLanguage(ext);

        if (!langStats[lang]) {
          langStats[lang] = { files: 0, lines: 0 };
        }

        const lineMetrics = await countLines(file);
        langStats[lang].files++;
        langStats[lang].lines += lineMetrics.code;
        totalLines += lineMetrics.code;
      } catch (error) {
        console.warn(`无法分析文件: ${file}`);
      }
    }

    // 转换为LanguageDistribution格式
    const distribution: LanguageDistribution = {};
    for (const [lang, stats] of Object.entries(langStats)) {
      distribution[lang] = {
        files: stats.files,
        lines: stats.lines,
        percentage: calculatePercentage(stats.lines, totalLines),
      };
    }

    return distribution;
  }

  private extensionToLanguage(ext: string): string {
    const mapping: Record<string, string> = {
      '.js': 'JavaScript',
      '.mjs': 'JavaScript',
      '.cjs': 'JavaScript',
      '.jsx': 'JSX',
      '.ts': 'TypeScript',
      '.tsx': 'TSX',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.less': 'Less',
      '.styl': 'Stylus',
    };

    return mapping[ext] || 'Other';
  }
}

