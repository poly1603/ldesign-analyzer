/**
 * CLI 入口
 */

import { Command } from 'commander';
import { Analyzer } from '../core';
import type { AnalyzerConfig } from '../types';

export async function run() {
  const program = new Command();

  program
    .name('ldesign-analyzer')
    .description('@ldesign/analyzer - 强大的代码分析工具')
    .version('0.1.0');

  program
    .command('analyze [path]')
    .description('分析项目')
    .option('-b, --bundler <type>', '构建工具类型 (webpack|rollup|vite|auto)', 'auto')
    .option('-o, --output <formats>', '输出格式 (cli,html,json)', 'cli,html')
    .option('--no-bundle', '跳过 Bundle 分析')
    .option('--no-dependency', '跳过依赖分析')
    .option('--no-code', '跳过代码分析')
    .action(async (path: string = '.', options: any) => {
      try {
        const config: AnalyzerConfig = {
          path,
          bundler: options.bundler,
          output: options.output.split(','),
          analyze: {
            bundle: options.bundle,
            dependency: options.dependency,
            code: options.code,
          },
        };

        const analyzer = new Analyzer();
        const result = await analyzer.analyze(config);
        await analyzer.report(result, config.output as any);
      } catch (error: any) {
        console.error('❌ 分析失败:', error.message);
        process.exit(1);
      }
    });

  program.parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

