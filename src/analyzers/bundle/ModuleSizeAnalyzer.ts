/**
 * 模块大小分析器
 */

import type { Analyzer, ModuleInfo } from '../../types';
import { calculatePercentage } from '../../utils/metricsUtils';

export interface ModuleSizeResult {
  totalModules: number;
  totalSize: number;
  sizeDistribution: {
    tiny: number;    // < 1KB
    small: number;   // 1KB - 10KB
    medium: number;  // 10KB - 100KB
    large: number;   // 100KB - 1MB
    huge: number;    // > 1MB
  };
  topModules: Array<{
    name: string;
    size: number;
    percentage: number;
    chunks: string[];
  }>;
}

export class ModuleSizeAnalyzer implements Analyzer {
  getName(): string {
    return 'ModuleSizeAnalyzer';
  }

  async analyze(data: { modules: ModuleInfo[] }): Promise<ModuleSizeResult> {
    const { modules } = data;

    if (!modules || modules.length === 0) {
      return {
        totalModules: 0,
        totalSize: 0,
        sizeDistribution: { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 },
        topModules: [],
      };
    }

    const totalSize = modules.reduce((sum, m) => sum + m.size, 0);

    // 大小分布
    const sizeDistribution = {
      tiny: 0,
      small: 0,
      medium: 0,
      large: 0,
      huge: 0,
    };

    const KB = 1024;
    const MB = KB * 1024;

    for (const module of modules) {
      if (module.size < KB) {
        sizeDistribution.tiny++;
      } else if (module.size < 10 * KB) {
        sizeDistribution.small++;
      } else if (module.size < 100 * KB) {
        sizeDistribution.medium++;
      } else if (module.size < MB) {
        sizeDistribution.large++;
      } else {
        sizeDistribution.huge++;
      }
    }

    // Top 20模块
    const topModules = [...modules]
      .sort((a, b) => b.size - a.size)
      .slice(0, 20)
      .map(m => ({
        name: m.name,
        size: m.size,
        percentage: calculatePercentage(m.size, totalSize),
        chunks: m.chunks,
      }));

    return {
      totalModules: modules.length,
      totalSize,
      sizeDistribution,
      topModules,
    };
  }
}

