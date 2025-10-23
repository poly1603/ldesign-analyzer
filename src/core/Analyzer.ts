/**
 * 主分析器
 */

import type { AnalyzerConfig, AnalysisResult } from '../types';
import { getParser } from '../parsers';
import { BundleAnalyzer } from './BundleAnalyzer';
import { DependencyAnalyzer } from './DependencyAnalyzer';
import { CodeAnalyzer } from './CodeAnalyzer';
import { CliReporter, HtmlReporter, JsonReporter } from '../reporters';

export class Analyzer {
  async analyze(config: AnalyzerConfig): Promise<AnalysisResult> {
    const { path: projectPath, bundler = 'auto', analyze: options = {} } = config;

    // 获取解析器
    const parser = getParser(bundler, projectPath);

    console.log('🔍 开始分析项目...');

    // 解析构建输出
    let parsedData;
    try {
      parsedData = await parser.parse(projectPath);
    } catch (error) {
      console.warn('⚠️  解析构建输出失败，将只进行代码分析');
      parsedData = { modules: [], chunks: [], dependencies: {}, buildInfo: {} };
    }

    const result: AnalysisResult = {
      timestamp: Date.now(),
      projectPath,
      bundler: bundler === 'auto' ? 'webpack' : bundler,
    };

    // Bundle分析
    if (options.bundle !== false && parsedData.modules.length > 0) {
      console.log('📦 分析 Bundle...');
      const bundleAnalyzer = new BundleAnalyzer();
      result.bundle = await bundleAnalyzer.analyze(parsedData);
    }

    // 依赖分析
    if (options.dependency !== false && parsedData.modules.length > 0) {
      console.log('🔗 分析依赖关系...');
      const dependencyAnalyzer = new DependencyAnalyzer();
      result.dependency = await dependencyAnalyzer.analyze({
        ...parsedData,
        projectPath,
      });
    }

    // 代码分析
    if (options.code !== false) {
      console.log('💻 分析代码...');
      const codeAnalyzer = new CodeAnalyzer();
      result.code = await codeAnalyzer.analyze(projectPath);
    }

    // 生成优化建议（简化版本）
    result.suggestions = this.generateSuggestions(result);

    console.log('✅ 分析完成');

    return result;
  }

  async report(result: AnalysisResult, formats: ('cli' | 'html' | 'json')[] = ['cli']): Promise<void> {
    for (const format of formats) {
      if (format === 'cli') {
        const reporter = new CliReporter();
        await reporter.generate(result);
      } else if (format === 'html') {
        const reporter = new HtmlReporter();
        const path = await reporter.generate(result);
        console.log(`📄 HTML 报告已生成: ${path}`);
      } else if (format === 'json') {
        const reporter = new JsonReporter();
        const path = await reporter.generate(result);
        console.log(`📝 JSON 报告已生成: ${path}`);
      }
    }
  }

  private generateSuggestions(result: AnalysisResult) {
    const suggestions: any[] = [];

    // 基于Bundle大小的建议
    if (result.bundle && result.bundle.totalSize > 1024 * 1024) {
      suggestions.push({
        category: 'bundle',
        title: 'Bundle 体积过大',
        description: '考虑使用代码分割和懒加载来减小初始加载体积',
        impact: 'high',
        effort: 'medium',
        savings: { size: result.bundle.totalSize * 0.3 },
      });
    }

    // 基于依赖的建议
    if (result.dependency?.circular.length) {
      suggestions.push({
        category: 'code-split',
        title: '存在循环依赖',
        description: `发现 ${result.dependency.circular.length} 个循环依赖，建议重构代码结构`,
        impact: 'medium',
        effort: 'high',
      });
    }

    if (result.dependency?.duplicates.length) {
      suggestions.push({
        category: 'bundle',
        title: '存在重复依赖',
        description: `发现 ${result.dependency.duplicates.length} 个重复依赖，建议统一版本`,
        impact: 'medium',
        effort: 'low',
        savings: {
          size: result.dependency.duplicates.reduce((sum, d) => sum + d.totalSize, 0) * 0.5,
        },
      });
    }

    return suggestions;
  }
}

