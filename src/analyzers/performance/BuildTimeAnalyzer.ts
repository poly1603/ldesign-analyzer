/**
 * 构建时间分析器
 * 
 * @description 分析构建时间和各阶段耗时
 * @module analyzers/performance/BuildTimeAnalyzer
 */

import type { Analyzer, BuildTimeMetrics } from '../../types';
import { fileExists, readJsonFile } from '../../utils/fileUtils';
import { AnalysisError } from '../../errors';
import path from 'path';

/**
 * 构建时间分析结果
 */
export interface BuildTimeResult extends BuildTimeMetrics {
  /** 构建效率评分 (0-100) */
  efficiency: number;
  /** 性能评级 */
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  /** 慢速模块 */
  slowModules?: Array<{
    name: string;
    time: number;
    percentage: number;
  }>;
}

/**
 * 构建时间分析器
 * 
 * @description 分析构建过程的时间消耗，识别性能瓶颈
 * 
 * @example
 * ```typescript
 * const analyzer = new BuildTimeAnalyzer();
 * const result = await analyzer.analyze({ 
 *   projectPath: './dist',
 *   statsPath: './dist/stats.json'
 * });
 * 
 * console.log(`总构建时间: ${result.total}ms`);
 * console.log(`性能评级: ${result.rating}`);
 * ```
 */
export class BuildTimeAnalyzer implements Analyzer {
  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'BuildTimeAnalyzer';
  }

  /**
   * 分析构建时间
   * 
   * @param data - 包含项目路径和stats路径的数据对象
   * @returns 构建时间分析结果
   * @throws {AnalysisError} 当分析失败时
   */
  async analyze(data: {
    projectPath: string;
    statsPath?: string;
  }): Promise<BuildTimeResult> {
    const { projectPath, statsPath } = data;

    try {
      // 尝试读取构建统计文件
      const stats = await this.loadBuildStats(projectPath, statsPath);

      if (!stats) {
        // 如果没有统计数据，返回空结果
        return this.getEmptyResult();
      }

      // 提取时间信息
      const metrics = this.extractTimeMetrics(stats);

      // 计算效率评分
      const efficiency = this.calculateEfficiency(metrics);

      // 评定性能等级
      const rating = this.ratePerformance(metrics.total);

      // 查找慢速模块
      const slowModules = this.findSlowModules(stats);

      return {
        ...metrics,
        efficiency,
        rating,
        slowModules,
      };
    } catch (error) {
      throw new AnalysisError(
        '构建时间分析失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 加载构建统计数据
   * 
   * @param projectPath - 项目路径
   * @param statsPath - stats文件路径
   * @returns 统计数据或null
   * @private
   */
  private async loadBuildStats(
    projectPath: string,
    statsPath?: string
  ): Promise<any | null> {
    // 可能的stats文件位置
    const possiblePaths = [
      statsPath,
      path.join(projectPath, 'webpack-stats.json'),
      path.join(projectPath, 'stats.json'),
      path.join(projectPath, 'dist', 'stats.json'),
      path.join(projectPath, 'build', 'stats.json'),
    ].filter(Boolean) as string[];

    for (const filePath of possiblePaths) {
      if (await fileExists(filePath)) {
        try {
          return await readJsonFile(filePath);
        } catch (error) {
          console.warn(`无法读取 ${filePath}`);
        }
      }
    }

    return null;
  }

  /**
   * 提取时间指标
   * 
   * @param stats - 构建统计
   * @returns 时间指标
   * @private
   */
  private extractTimeMetrics(stats: any): BuildTimeMetrics {
    // Webpack格式
    if (stats.time !== undefined) {
      return {
        total: stats.time,
        compilation: Math.round(stats.time * 0.6), // 估算
        optimization: Math.round(stats.time * 0.2),
        emission: Math.round(stats.time * 0.2),
      };
    }

    // 其他格式或默认值
    return {
      total: 0,
      compilation: 0,
      optimization: 0,
      emission: 0,
    };
  }

  /**
   * 计算效率评分
   * 
   * @param metrics - 时间指标
   * @returns 效率评分 (0-100)
   * @private
   */
  private calculateEfficiency(metrics: BuildTimeMetrics): number {
    // 基于总时间计算效率
    // 时间越短，效率越高
    if (metrics.total === 0) return 100;

    // 1秒 = 100分，每增加1秒减10分
    const baseScore = 100;
    const penalty = Math.floor(metrics.total / 1000) * 10;

    return Math.max(0, Math.min(100, baseScore - penalty));
  }

  /**
   * 评定性能等级
   * 
   * @param totalTime - 总时间（毫秒）
   * @returns 性能等级
   * @private
   */
  private ratePerformance(totalTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
    const seconds = totalTime / 1000;

    if (seconds < 5) return 'excellent';
    if (seconds < 15) return 'good';
    if (seconds < 30) return 'fair';
    return 'poor';
  }

  /**
   * 查找慢速模块
   * 
   * @param stats - 构建统计
   * @returns 慢速模块列表
   * @private
   */
  private findSlowModules(stats: any): Array<{
    name: string;
    time: number;
    percentage: number;
  }> {
    // 如果stats包含模块构建时间信息
    if (stats.modules && Array.isArray(stats.modules)) {
      const modulesWithTime = stats.modules
        .filter((m: any) => m.buildTime !== undefined)
        .map((m: any) => ({
          name: m.name || m.identifier,
          time: m.buildTime,
          percentage: 0,
        }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 10);

      // 计算百分比
      const totalTime = modulesWithTime.reduce((sum, m) => sum + m.time, 0);
      modulesWithTime.forEach(m => {
        m.percentage = totalTime > 0 ? (m.time / totalTime) * 100 : 0;
      });

      return modulesWithTime;
    }

    return [];
  }

  /**
   * 获取空结果
   * 
   * @returns 空的构建时间结果
   * @private
   */
  private getEmptyResult(): BuildTimeResult {
    return {
      total: 0,
      compilation: 0,
      optimization: 0,
      emission: 0,
      efficiency: 0,
      rating: 'excellent',
      slowModules: [],
    };
  }
}


