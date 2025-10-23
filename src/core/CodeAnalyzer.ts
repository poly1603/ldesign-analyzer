/**
 * 代码分析核心引擎
 */

import type { CodeMetrics } from '../types';
import {
  LinesCounter,
  FileSizeDistributor,
  LanguageDetector,
  CommentCoverageAnalyzer,
} from '../analyzers/code';

export class CodeAnalyzer {
  async analyze(projectPath: string): Promise<CodeMetrics> {
    const linesCounter = new LinesCounter();
    const lines = await linesCounter.analyze({ projectPath });

    const fileSizeDistributor = new FileSizeDistributor();
    const fileSize = await fileSizeDistributor.analyze({ projectPath });

    const languageDetector = new LanguageDetector();
    const languages = await languageDetector.analyze({ projectPath });

    const commentAnalyzer = new CommentCoverageAnalyzer();
    const commentCoverage = await commentAnalyzer.analyze({ projectPath });

    return {
      lines,
      fileSize,
      languages,
      commentCoverage,
    };
  }
}

