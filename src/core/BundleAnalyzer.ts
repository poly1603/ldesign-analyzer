/**
 * Bundle分析核心引擎
 */

import type { BundleAnalysis, ParsedData } from '../types';
import {
  BundleSizeAnalyzer,
  ModuleSizeAnalyzer,
  ChunkAnalyzer,
  AssetTypeAnalyzer,
  TreeMapGenerator,
} from '../analyzers/bundle';

export class BundleAnalyzer {
  async analyze(data: ParsedData): Promise<BundleAnalysis> {
    const { modules, chunks } = data;

    // 运行各个分析器
    const sizeAnalyzer = new BundleSizeAnalyzer();
    const sizeResult = await sizeAnalyzer.analyze({ modules });

    const moduleAnalyzer = new ModuleSizeAnalyzer();
    await moduleAnalyzer.analyze({ modules });

    const chunkAnalyzer = new ChunkAnalyzer();
    await chunkAnalyzer.analyze({ chunks: chunks || [] });

    const assetAnalyzer = new AssetTypeAnalyzer();
    const assetTypes = await assetAnalyzer.analyze({ modules });

    const treeMapGen = new TreeMapGenerator();
    const treeMapData = await treeMapGen.analyze({ modules });

    return {
      totalSize: sizeResult.totalSize,
      gzipSize: sizeResult.gzipSize,
      brotliSize: sizeResult.brotliSize,
      modules,
      chunks: chunks || [],
      assetTypes,
      treeMapData,
    };
  }
}

