/**
 * 自定义分析示例
 */

import { Analyzer, BundleAnalyzer, DependencyAnalyzer } from '@ldesign/analyzer';
import { WebpackParser } from '@ldesign/analyzer';

async function customAnalysisExample() {
  // 1. 使用自定义解析器
  const parser = new WebpackParser();
  const parsedData = await parser.parse('./dist');

  // 2. 使用独立的分析器
  const bundleAnalyzer = new BundleAnalyzer();
  const bundleResult = await bundleAnalyzer.analyze(parsedData);

  console.log('Bundle 总大小:', bundleResult.totalSize);
  console.log('Gzip 大小:', bundleResult.gzipSize);
  console.log('模块数量:', bundleResult.modules.length);

  // 3. 依赖分析
  const dependencyAnalyzer = new DependencyAnalyzer();
  const depResult = await dependencyAnalyzer.analyze({
    ...parsedData,
    projectPath: './',
  });

  console.log('依赖节点数:', depResult.nodes.length);
  console.log('循环依赖数:', depResult.circular.length);
  console.log('重复依赖数:', depResult.duplicates.length);

  // 4. 设置性能预算
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (bundleResult.totalSize > maxSize) {
    throw new Error(`Bundle 超过限制: ${bundleResult.totalSize} > ${maxSize}`);
  }
}

customAnalysisExample().catch(console.error);

