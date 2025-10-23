/**
 * 解析器导出
 */

export { WebpackParser } from './WebpackParser';
export { RollupParser } from './RollupParser';
export { ViteParser } from './ViteParser';

import { WebpackParser } from './WebpackParser';
import { RollupParser } from './RollupParser';
import { ViteParser } from './ViteParser';
import type { Parser, BundlerType } from '../types';

/**
 * 获取解析器
 */
export function getParser(bundler: BundlerType, projectPath: string): Parser {
  if (bundler === 'webpack') {
    return new WebpackParser();
  }

  if (bundler === 'rollup') {
    return new RollupParser();
  }

  if (bundler === 'vite') {
    return new ViteParser();
  }

  // 自动检测
  const viteParser = new ViteParser();
  if (viteParser.supports(projectPath)) {
    return viteParser;
  }

  const rollupParser = new RollupParser();
  if (rollupParser.supports(projectPath)) {
    return rollupParser;
  }

  // 默认使用Webpack解析器
  return new WebpackParser();
}

