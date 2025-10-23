/**
 * 资源类型分析器
 */

import type { Analyzer, ModuleInfo, AssetTypeDistribution, AssetTypeInfo } from '../../types';
import { getAssetType } from '../../utils/fileUtils';
import { calculatePercentage } from '../../utils/metricsUtils';

export class AssetTypeAnalyzer implements Analyzer {
  getName(): string {
    return 'AssetTypeAnalyzer';
  }

  async analyze(data: { modules: ModuleInfo[] }): Promise<AssetTypeDistribution> {
    const { modules } = data;

    if (!modules || modules.length === 0) {
      return this.getEmptyDistribution();
    }

    const totalSize = modules.reduce((sum, m) => sum + m.size, 0);

    // 按类型分组统计
    const typeStats: Record<string, { count: number; size: number }> = {
      js: { count: 0, size: 0 },
      css: { count: 0, size: 0 },
      images: { count: 0, size: 0 },
      fonts: { count: 0, size: 0 },
      other: { count: 0, size: 0 },
    };

    for (const module of modules) {
      const type = getAssetType(module.path || module.name);
      typeStats[type].count++;
      typeStats[type].size += module.size;
    }

    // 转换为AssetTypeDistribution格式
    const distribution: AssetTypeDistribution = {
      js: this.createAssetTypeInfo(typeStats.js, totalSize),
      css: this.createAssetTypeInfo(typeStats.css, totalSize),
      images: this.createAssetTypeInfo(typeStats.images, totalSize),
      fonts: this.createAssetTypeInfo(typeStats.fonts, totalSize),
      other: this.createAssetTypeInfo(typeStats.other, totalSize),
    };

    return distribution;
  }

  private createAssetTypeInfo(
    stats: { count: number; size: number },
    totalSize: number
  ): AssetTypeInfo {
    return {
      count: stats.count,
      size: stats.size,
      percentage: calculatePercentage(stats.size, totalSize),
    };
  }

  private getEmptyDistribution(): AssetTypeDistribution {
    const empty: AssetTypeInfo = { count: 0, size: 0, percentage: 0 };
    return {
      js: { ...empty },
      css: { ...empty },
      images: { ...empty },
      fonts: { ...empty },
      other: { ...empty },
    };
  }
}

