/**
 * 对比分析系统
 * 
 * @description 对比两个版本的分析结果，生成差异报告
 * @module compare
 */

import type { AnalysisResult } from '../types';
import { formatBytes } from '../utils/fileUtils';

/**
 * 对比结果
 */
export interface CompareResult {
  /** 对比时间戳 */
  timestamp: number;
  /** 基准版本 */
  baseline: {
    timestamp: number;
    path: string;
  };
  /** 当前版本 */
  current: {
    timestamp: number;
    path: string;
  };
  /** Bundle差异 */
  bundleDiff?: BundleDiff;
  /** 依赖差异 */
  dependencyDiff?: DependencyDiff;
  /** 代码差异 */
  codeDiff?: CodeDiff;
  /** 总体评分变化 */
  scoreChange: number;
  /** 建议 */
  recommendations: string[];
}

/**
 * Bundle差异
 */
export interface BundleDiff {
  /** 总大小变化 */
  totalSizeChange: {
    before: number;
    after: number;
    diff: number;
    percentage: number;
  };
  /** Gzip大小变化 */
  gzipSizeChange: {
    before: number;
    after: number;
    diff: number;
    percentage: number;
  };
  /** 模块数量变化 */
  moduleCountChange: {
    before: number;
    after: number;
    diff: number;
    percentage: number;
  };
  /** 新增模块 */
  addedModules: string[];
  /** 删除模块 */
  removedModules: string[];
  /** 大小变化最大的模块 */
  topChangedModules: Array<{
    name: string;
    sizeBefore: number;
    sizeAfter: number;
    change: number;
  }>;
}

/**
 * 依赖差异
 */
export interface DependencyDiff {
  /** 循环依赖变化 */
  circularChange: {
    before: number;
    after: number;
    diff: number;
  };
  /** 重复依赖变化 */
  duplicatesChange: {
    before: number;
    after: number;
    diff: number;
  };
  /** 新增依赖 */
  addedDependencies: string[];
  /** 删除依赖 */
  removedDependencies: string[];
}

/**
 * 代码差异
 */
export interface CodeDiff {
  /** 代码行数变化 */
  linesChange: {
    before: number;
    after: number;
    diff: number;
    percentage: number;
  };
  /** 注释覆盖率变化 */
  commentCoverageChange: {
    before: number;
    after: number;
    diff: number;
  };
  /** 复杂度变化 */
  complexityChange?: {
    before: number;
    after: number;
    diff: number;
  };
}

/**
 * 对比分析器
 * 
 * @description 对比两个分析结果，生成详细的差异报告
 * 
 * @example
 * ```typescript
 * const comparator = new Comparator();
 * const diff = comparator.compare(baselineResult, currentResult);
 * 
 * console.log(`Bundle大小变化: ${diff.bundleDiff?.totalSizeChange.percentage}%`);
 * console.log(`总体评分变化: ${diff.scoreChange}`);
 * ```
 */
export class Comparator {
  /**
   * 对比两个分析结果
   * 
   * @param baseline - 基准版本结果
   * @param current - 当前版本结果
   * @returns 对比结果
   */
  compare(baseline: AnalysisResult, current: AnalysisResult): CompareResult {
    const result: CompareResult = {
      timestamp: Date.now(),
      baseline: {
        timestamp: baseline.timestamp,
        path: baseline.projectPath,
      },
      current: {
        timestamp: current.timestamp,
        path: current.projectPath,
      },
      scoreChange: 0,
      recommendations: [],
    };

    // Bundle对比
    if (baseline.bundle && current.bundle) {
      result.bundleDiff = this.compareBundles(baseline.bundle, current.bundle);
    }

    // 依赖对比
    if (baseline.dependency && current.dependency) {
      result.dependencyDiff = this.compareDependencies(
        baseline.dependency,
        current.dependency
      );
    }

    // 代码对比
    if (baseline.code && current.code) {
      result.codeDiff = this.compareCode(baseline.code, current.code);
    }

    // 计算总体评分变化
    result.scoreChange = this.calculateScoreChange(baseline, current);

    // 生成建议
    result.recommendations = this.generateRecommendations(result);

    return result;
  }

  /**
   * 对比Bundle
   * 
   * @param baseline - 基准Bundle
   * @param current - 当前Bundle
   * @returns Bundle差异
   * @private
   */
  private compareBundles(baseline: any, current: any): BundleDiff {
    // 总大小变化
    const totalSizeDiff = current.totalSize - baseline.totalSize;
    const totalSizePercentage = this.calculatePercentage(
      totalSizeDiff,
      baseline.totalSize
    );

    // Gzip大小变化
    const gzipSizeDiff = current.gzipSize - baseline.gzipSize;
    const gzipSizePercentage = this.calculatePercentage(
      gzipSizeDiff,
      baseline.gzipSize
    );

    // 模块数量变化
    const moduleCountDiff = current.modules.length - baseline.modules.length;
    const moduleCountPercentage = this.calculatePercentage(
      moduleCountDiff,
      baseline.modules.length
    );

    // 模块变化
    const baselineModuleNames = new Set(baseline.modules.map((m: any) => m.name));
    const currentModuleNames = new Set(current.modules.map((m: any) => m.name));

    const addedModules = [...currentModuleNames].filter(
      name => !baselineModuleNames.has(name)
    );
    const removedModules = [...baselineModuleNames].filter(
      name => !currentModuleNames.has(name)
    );

    // 大小变化最大的模块
    const moduleMap = new Map(baseline.modules.map((m: any) => [m.name, m.size]));
    const changedModules = current.modules
      .map((m: any) => ({
        name: m.name,
        sizeBefore: moduleMap.get(m.name) || 0,
        sizeAfter: m.size,
        change: m.size - (moduleMap.get(m.name) || 0),
      }))
      .filter(m => m.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);

    return {
      totalSizeChange: {
        before: baseline.totalSize,
        after: current.totalSize,
        diff: totalSizeDiff,
        percentage: totalSizePercentage,
      },
      gzipSizeChange: {
        before: baseline.gzipSize,
        after: current.gzipSize,
        diff: gzipSizeDiff,
        percentage: gzipSizePercentage,
      },
      moduleCountChange: {
        before: baseline.modules.length,
        after: current.modules.length,
        diff: moduleCountDiff,
        percentage: moduleCountPercentage,
      },
      addedModules,
      removedModules,
      topChangedModules: changedModules,
    };
  }

  /**
   * 对比依赖
   * 
   * @param baseline - 基准依赖
   * @param current - 当前依赖
   * @returns 依赖差异
   * @private
   */
  private compareDependencies(baseline: any, current: any): DependencyDiff {
    const circularDiff = current.circular.length - baseline.circular.length;
    const duplicatesDiff = current.duplicates.length - baseline.duplicates.length;

    // 节点变化
    const baselineNodes = new Set(baseline.nodes.map((n: any) => n.name));
    const currentNodes = new Set(current.nodes.map((n: any) => n.name));

    const addedDependencies = [...currentNodes].filter(
      name => !baselineNodes.has(name)
    );
    const removedDependencies = [...baselineNodes].filter(
      name => !currentNodes.has(name)
    );

    return {
      circularChange: {
        before: baseline.circular.length,
        after: current.circular.length,
        diff: circularDiff,
      },
      duplicatesChange: {
        before: baseline.duplicates.length,
        after: current.duplicates.length,
        diff: duplicatesDiff,
      },
      addedDependencies,
      removedDependencies,
    };
  }

  /**
   * 对比代码
   * 
   * @param baseline - 基准代码
   * @param current - 当前代码
   * @returns 代码差异
   * @private
   */
  private compareCode(baseline: any, current: any): CodeDiff {
    const linesDiff = current.lines.code - baseline.lines.code;
    const linesPercentage = this.calculatePercentage(
      linesDiff,
      baseline.lines.code
    );

    const commentCoverageDiff = current.commentCoverage - baseline.commentCoverage;

    const result: CodeDiff = {
      linesChange: {
        before: baseline.lines.code,
        after: current.lines.code,
        diff: linesDiff,
        percentage: linesPercentage,
      },
      commentCoverageChange: {
        before: baseline.commentCoverage,
        after: current.commentCoverage,
        diff: commentCoverageDiff,
      },
    };

    // 复杂度变化（如果有）
    if (baseline.quality?.averageComplexity && current.quality?.averageComplexity) {
      result.complexityChange = {
        before: baseline.quality.averageComplexity,
        after: current.quality.averageComplexity,
        diff: current.quality.averageComplexity - baseline.quality.averageComplexity,
      };
    }

    return result;
  }

  /**
   * 计算总体评分变化
   * 
   * @param baseline - 基准结果
   * @param current - 当前结果
   * @returns 评分变化 (-100 到 100)
   * @private
   */
  private calculateScoreChange(
    baseline: AnalysisResult,
    current: AnalysisResult
  ): number {
    let score = 0;

    // Bundle大小变化 (权重: 40)
    if (baseline.bundle && current.bundle) {
      const sizeChange = this.calculatePercentage(
        current.bundle.totalSize - baseline.bundle.totalSize,
        baseline.bundle.totalSize
      );
      score -= sizeChange * 0.4;
    }

    // 循环依赖变化 (权重: 20)
    if (baseline.dependency && current.dependency) {
      const circularChange = current.dependency.circular.length - baseline.dependency.circular.length;
      score -= circularChange * 5;
    }

    // 注释覆盖率变化 (权重: 20)
    if (baseline.code && current.code) {
      const commentChange = current.code.commentCoverage - baseline.code.commentCoverage;
      score += commentChange * 2;
    }

    // 复杂度变化 (权重: 20)
    if (baseline.code?.quality && current.code?.quality) {
      const complexityChange =
        current.code.quality.averageComplexity - baseline.code.quality.averageComplexity;
      score -= complexityChange * 2;
    }

    return Math.round(Math.max(-100, Math.min(100, score)));
  }

  /**
   * 生成建议
   * 
   * @param result - 对比结果
   * @returns 建议列表
   * @private
   */
  private generateRecommendations(result: CompareResult): string[] {
    const recommendations: string[] = [];

    // Bundle建议
    if (result.bundleDiff) {
      const { totalSizeChange } = result.bundleDiff;
      if (totalSizeChange.percentage > 10) {
        recommendations.push(
          `⚠️ Bundle大小增加了 ${totalSizeChange.percentage.toFixed(1)}% (${formatBytes(totalSizeChange.diff)})，建议检查新增的依赖`
        );
      } else if (totalSizeChange.percentage < -10) {
        recommendations.push(
          `✅ Bundle大小减少了 ${Math.abs(totalSizeChange.percentage).toFixed(1)}% (${formatBytes(Math.abs(totalSizeChange.diff))})，优化效果显著！`
        );
      }

      if (result.bundleDiff.addedModules.length > 10) {
        recommendations.push(
          `📦 新增了 ${result.bundleDiff.addedModules.length} 个模块，请确认这些依赖是必需的`
        );
      }
    }

    // 依赖建议
    if (result.dependencyDiff) {
      const { circularChange, duplicatesChange } = result.dependencyDiff;

      if (circularChange.diff > 0) {
        recommendations.push(
          `⚠️ 新增了 ${circularChange.diff} 个循环依赖，建议立即修复`
        );
      } else if (circularChange.diff < 0) {
        recommendations.push(
          `✅ 修复了 ${Math.abs(circularChange.diff)} 个循环依赖，代码结构有所改善`
        );
      }

      if (duplicatesChange.diff > 0) {
        recommendations.push(
          `⚠️ 新增了 ${duplicatesChange.diff} 个重复依赖，建议统一版本`
        );
      }
    }

    // 代码建议
    if (result.codeDiff) {
      const { commentCoverageChange, complexityChange } = result.codeDiff;

      if (commentCoverageChange.diff < -5) {
        recommendations.push(
          `⚠️ 注释覆盖率下降了 ${Math.abs(commentCoverageChange.diff).toFixed(1)}%，建议增加代码注释`
        );
      } else if (commentCoverageChange.diff > 5) {
        recommendations.push(
          `✅ 注释覆盖率提升了 ${commentCoverageChange.diff.toFixed(1)}%，文档质量有所改善`
        );
      }

      if (complexityChange && complexityChange.diff > 2) {
        recommendations.push(
          `⚠️ 平均复杂度增加了 ${complexityChange.diff.toFixed(1)}，建议重构复杂函数`
        );
      }
    }

    // 总体评分建议
    if (result.scoreChange < -20) {
      recommendations.push(
        `❌ 总体质量评分下降了 ${Math.abs(result.scoreChange)} 分，建议回顾本次变更`
      );
    } else if (result.scoreChange > 20) {
      recommendations.push(
        `🎉 总体质量评分提升了 ${result.scoreChange} 分，优化效果显著！`
      );
    }

    return recommendations;
  }

  /**
   * 计算百分比
   * 
   * @param diff - 差值
   * @param base - 基准值
   * @returns 百分比
   * @private
   */
  private calculatePercentage(diff: number, base: number): number {
    if (base === 0) return 0;
    return Math.round((diff / base) * 10000) / 100;
  }

  /**
   * 生成对比报告
   * 
   * @param result - 对比结果
   * @returns 格式化的报告文本
   */
  generateReport(result: CompareResult): string {
    const lines: string[] = [];

    lines.push('# 📊 分析对比报告\n');
    lines.push(`生成时间: ${new Date(result.timestamp).toLocaleString()}\n`);
    lines.push(`基准版本: ${new Date(result.baseline.timestamp).toLocaleString()}`);
    lines.push(`当前版本: ${new Date(result.current.timestamp).toLocaleString()}\n`);

    // Bundle对比
    if (result.bundleDiff) {
      const { bundleDiff } = result;
      lines.push('## 📦 Bundle变化\n');
      lines.push(`总大小: ${formatBytes(bundleDiff.totalSizeChange.before)} → ${formatBytes(bundleDiff.totalSizeChange.after)} (${this.formatChange(bundleDiff.totalSizeChange.percentage)})`);
      lines.push(`Gzip大小: ${formatBytes(bundleDiff.gzipSizeChange.before)} → ${formatBytes(bundleDiff.gzipSizeChange.after)} (${this.formatChange(bundleDiff.gzipSizeChange.percentage)})`);
      lines.push(`模块数量: ${bundleDiff.moduleCountChange.before} → ${bundleDiff.moduleCountChange.after} (${this.formatChange(bundleDiff.moduleCountChange.percentage)})\n`);

      if (bundleDiff.addedModules.length > 0) {
        lines.push(`新增模块 (${bundleDiff.addedModules.length}):`);
        bundleDiff.addedModules.slice(0, 5).forEach(m => lines.push(`  + ${m}`));
        if (bundleDiff.addedModules.length > 5) {
          lines.push(`  ... 还有 ${bundleDiff.addedModules.length - 5} 个`);
        }
        lines.push('');
      }
    }

    // 总体评分
    lines.push(`## 📈 总体评分变化: ${this.formatScoreChange(result.scoreChange)}\n`);

    // 建议
    if (result.recommendations.length > 0) {
      lines.push('## 💡 建议\n');
      result.recommendations.forEach(rec => lines.push(rec));
    }

    return lines.join('\n');
  }

  /**
   * 格式化变化百分比
   * 
   * @param percentage - 百分比
   * @returns 格式化的字符串
   * @private
   */
  private formatChange(percentage: number): string {
    const sign = percentage > 0 ? '+' : '';
    const emoji = percentage > 0 ? '📈' : percentage < 0 ? '📉' : '➡️';
    return `${emoji} ${sign}${percentage.toFixed(1)}%`;
  }

  /**
   * 格式化评分变化
   * 
   * @param score - 评分
   * @returns 格式化的字符串
   * @private
   */
  private formatScoreChange(score: number): string {
    const sign = score > 0 ? '+' : '';
    const emoji = score > 20 ? '🎉' : score > 0 ? '✅' : score > -20 ? '⚠️' : '❌';
    return `${emoji} ${sign}${score}`;
  }
}

/**
 * 默认对比器实例
 */
export const defaultComparator = new Comparator();


