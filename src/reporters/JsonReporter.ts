/**
 * JSON报告生成器
 */

import type { Reporter, AnalysisResult } from '../types';
import { writeJsonFile } from '../utils/fileUtils';
import path from 'path';

export class JsonReporter implements Reporter {
  getFormat(): 'cli' | 'html' | 'json' {
    return 'json';
  }

  async generate(result: AnalysisResult): Promise<string> {
    const outputPath = path.join(process.cwd(), '.analyzer-output', 'analysis.json');
    await writeJsonFile(outputPath, result);
    return outputPath;
  }
}

