/**
 * Bundle大小分析器
 */

import type { Analyzer, ModuleInfo } from '../../types';
import { getGzipSize, getBrotliSize, readFile } from '../../utils/fileUtils';

export interface BundleSizeResult {
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  averageModuleSize: number;
  largestModules: Array<{ name: string; size: number; percentage: number }>;
}

export class BundleSizeAnalyzer implements Analyzer {
  getName(): string {
    return 'BundleSizeAnalyzer';
  }

  async analyze(data: { modules: ModuleInfo[] }): Promise<BundleSizeResult> {
    const { modules } = data;

    if (!modules || modules.length === 0) {
      return {
        totalSize: 0,
        gzipSize: 0,
        brotliSize: 0,
        averageModuleSize: 0,
        largestModules: [],
      };
    }

    // 计算总大小
    const totalSize = modules.reduce((sum, m) => sum + m.size, 0);

    // 计算gzip和brotli大小（模拟）
    // 实际项目中应该读取实际文件内容
    const gzipSize = Math.round(totalSize * 0.3); // 假设gzip压缩率30%
    const brotliSize = Math.round(totalSize * 0.25); // 假设brotli压缩率25%

    // 平均模块大小
    const averageModuleSize = Math.round(totalSize / modules.length);

    // 找出最大的10个模块
    const sortedModules = [...modules].sort((a, b) => b.size - a.size);
    const largestModules = sortedModules.slice(0, 10).map(m => ({
      name: m.name,
      size: m.size,
      percentage: Math.round((m.size / totalSize) * 10000) / 100,
    }));

    return {
      totalSize,
      gzipSize,
      brotliSize,
      averageModuleSize,
      largestModules,
    };
  }
}

