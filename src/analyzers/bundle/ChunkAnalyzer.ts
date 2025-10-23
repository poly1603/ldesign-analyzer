/**
 * Chunk分析器
 */

import type { Analyzer, ChunkInfo } from '../../types';
import { calculatePercentage } from '../../utils/metricsUtils';

export interface ChunkAnalysisResult {
  totalChunks: number;
  initialChunks: number;
  asyncChunks: number;
  totalSize: number;
  chunks: Array<{
    id: string;
    name: string;
    size: number;
    percentage: number;
    initial: boolean;
    moduleCount: number;
  }>;
  sharedChunks: Array<{
    id: string;
    name: string;
    size: number;
    sharedBy: string[];
  }>;
}

export class ChunkAnalyzer implements Analyzer {
  getName(): string {
    return 'ChunkAnalyzer';
  }

  async analyze(data: { chunks: ChunkInfo[] }): Promise<ChunkAnalysisResult> {
    const { chunks } = data;

    if (!chunks || chunks.length === 0) {
      return {
        totalChunks: 0,
        initialChunks: 0,
        asyncChunks: 0,
        totalSize: 0,
        chunks: [],
        sharedChunks: [],
      };
    }

    const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
    const initialChunks = chunks.filter(c => c.initial).length;
    const asyncChunks = chunks.length - initialChunks;

    // 处理chunk信息
    const chunkInfos = chunks.map(c => ({
      id: c.id,
      name: c.name,
      size: c.size,
      percentage: calculatePercentage(c.size, totalSize),
      initial: c.initial,
      moduleCount: c.modules.length,
    }));

    // 查找共享chunks（被多个父chunk引用）
    const sharedChunks = chunks
      .filter(c => c.parents && c.parents.length > 1)
      .map(c => ({
        id: c.id,
        name: c.name,
        size: c.size,
        sharedBy: c.parents || [],
      }));

    return {
      totalChunks: chunks.length,
      initialChunks,
      asyncChunks,
      totalSize,
      chunks: chunkInfos,
      sharedChunks,
    };
  }
}

