/**
 * 主分析器
 * 
 * @description 核心分析器类，协调所有分析任务的执行
 * @module core/Analyzer
 */

import type { AnalyzerConfig, AnalysisResult, OutputFormat, OptimizationSuggestion } from '../types';
import { getParser } from '../parsers';
import { BundleAnalyzer } from './BundleAnalyzer';
import { DependencyAnalyzer } from './DependencyAnalyzer';
import { CodeAnalyzer } from './CodeAnalyzer';
import { CliReporter, HtmlReporter, JsonReporter } from '../reporters';
import { AnalysisError, ParseError, ValidationError } from '../errors';
import { ErrorHandler, withErrorHandling } from '../errors/handlers';

/**
 * 分析进度回调函数类型
 */
export type ProgressCallback = (phase: string, progress: number, message: string) => void;

/**
 * 主分析器类
 * 
 * @description 提供完整的项目分析功能，包括Bundle、依赖、代码质量等多维度分析
 * 
 * @example
 * ```typescript
 * const analyzer = new Analyzer();
 * 
 * // 基础分析
 * const result = await analyzer.analyze({
 *   path: './dist',
 *   bundler: 'webpack'
 * });
 * 
 * // 生成报告
 * await analyzer.report(result, ['cli', 'html', 'json']);
 * ```
 * 
 * @example
 * ```typescript
 * // 带进度回调的分析
 * const result = await analyzer.analyze(
 *   {
 *     path: './dist',
 *     bundler: 'webpack'
 *   },
 *   (phase, progress, message) => {
 *     console.log(`[${phase}] ${progress}%: ${message}`);
 *   }
 * );
 * ```
 */
export class Analyzer {
  private errorHandler: ErrorHandler;
  private abortController?: AbortController;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.setupRecoveryStrategies();
  }

  /**
   * 执行项目分析
   * 
   * @param config - 分析配置
   * @param onProgress - 可选的进度回调函数
   * @returns 分析结果对象
   * @throws {ValidationError} 当配置无效时
   * @throws {ParseError} 当解析失败且无法恢复时
   * @throws {AnalysisError} 当分析过程出错时
   * 
   * @example
   * ```typescript
   * const result = await analyzer.analyze({
   *   path: './my-project',
   *   bundler: 'webpack',
   *   analyze: {
   *     bundle: true,
   *     dependency: true,
   *     code: true
   *   }
   * });
   * ```
   */
  async analyze(
    config: AnalyzerConfig,
    onProgress?: ProgressCallback
  ): Promise<AnalysisResult> {
    // 验证配置
    this.validateConfig(config);

    const { path: projectPath, bundler = 'auto', analyze: options = {} } = config;

    // 创建中止控制器
    this.abortController = new AbortController();

    try {
      // 获取解析器
      const parser = getParser(bundler, projectPath);

      this.reportProgress(onProgress, 'parse', 0, '开始解析项目...');
      console.log('🔍 开始分析项目...');

      // 解析构建输出
      let parsedData;
      try {
        parsedData = await parser.parse(projectPath);
        this.reportProgress(onProgress, 'parse', 100, '解析完成');
      } catch (error) {
        // 尝试使用错误处理器恢复
        const recovered = await this.errorHandler.handle(
          new ParseError(
            '解析构建输出失败',
            { projectPath, bundler },
            error as Error
          ),
          { throw: false, logToConsole: true }
        );

        if (recovered) {
          parsedData = recovered;
        } else {
          console.warn('⚠️  解析构建输出失败，将只进行代码分析');
          parsedData = { modules: [], chunks: [], dependencies: {}, buildInfo: {} };
        }
      }

      // 初始化结果对象
      const result: AnalysisResult = {
        timestamp: Date.now(),
        projectPath,
        bundler: bundler === 'auto' ? 'webpack' : bundler,
      };

      // Bundle分析
      if (options.bundle !== false && parsedData.modules.length > 0) {
        this.reportProgress(onProgress, 'bundle', 0, '开始Bundle分析...');
        console.log('📦 分析 Bundle...');

        try {
          const bundleAnalyzer = new BundleAnalyzer();
          result.bundle = await bundleAnalyzer.analyze(parsedData);
          this.reportProgress(onProgress, 'bundle', 100, 'Bundle分析完成');
        } catch (error) {
          throw new AnalysisError(
            'Bundle分析失败',
            { moduleCount: parsedData.modules.length },
            error as Error
          );
        }
      }

      // 依赖分析
      if (options.dependency !== false && parsedData.modules.length > 0) {
        this.reportProgress(onProgress, 'dependency', 0, '开始依赖分析...');
        console.log('🔗 分析依赖关系...');

        try {
          const dependencyAnalyzer = new DependencyAnalyzer();
          result.dependency = await dependencyAnalyzer.analyze({
            ...parsedData,
            projectPath,
          });
          this.reportProgress(onProgress, 'dependency', 100, '依赖分析完成');
        } catch (error) {
          throw new AnalysisError(
            '依赖分析失败',
            { projectPath },
            error as Error
          );
        }
      }

      // 代码分析
      if (options.code !== false) {
        this.reportProgress(onProgress, 'code', 0, '开始代码分析...');
        console.log('💻 分析代码...');

        try {
          const codeAnalyzer = new CodeAnalyzer();
          result.code = await codeAnalyzer.analyze(projectPath);
          this.reportProgress(onProgress, 'code', 100, '代码分析完成');
        } catch (error) {
          throw new AnalysisError(
            '代码分析失败',
            { projectPath },
            error as Error
          );
        }
      }

      // 生成优化建议
      this.reportProgress(onProgress, 'suggestions', 0, '生成优化建议...');
      result.suggestions = this.generateSuggestions(result);
      this.reportProgress(onProgress, 'suggestions', 100, '建议生成完成');

      console.log('✅ 分析完成');

      return result;
    } finally {
      this.abortController = undefined;
    }
  }

  /**
   * 生成分析报告
   * 
   * @param result - 分析结果
   * @param formats - 输出格式数组，默认为 ['cli']
   * @returns Promise<void>
   * @throws {AnalysisError} 当报告生成失败时
   * 
   * @example
   * ```typescript
   * // 生成多种格式的报告
   * await analyzer.report(result, ['cli', 'html', 'json']);
   * 
   * // 只生成CLI报告
   * await analyzer.report(result);
   * ```
   */
  async report(
    result: AnalysisResult,
    formats: OutputFormat[] = ['cli']
  ): Promise<void> {
    for (const format of formats) {
      try {
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
      } catch (error) {
        throw new AnalysisError(
          `生成${format}报告失败`,
          { format },
          error as Error
        );
      }
    }
  }

  /**
   * 取消正在进行的分析
   * 
   * @description 可以安全地取消正在进行的分析任务
   * 
   * @example
   * ```typescript
   * const analyzer = new Analyzer();
   * const analyzePromise = analyzer.analyze(config);
   * 
   * // 5秒后取消
   * setTimeout(() => analyzer.cancel(), 5000);
   * 
   * try {
   *   await analyzePromise;
   * } catch (error) {
   *   console.log('分析已取消');
   * }
   * ```
   */
  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      console.log('🛑 分析已取消');
    }
  }

  /**
   * 验证配置
   * 
   * @param config - 分析配置
   * @throws {ValidationError} 当配置无效时
   * @private
   */
  private validateConfig(config: AnalyzerConfig): void {
    if (!config.path) {
      throw new ValidationError('项目路径不能为空', { config });
    }

    if (config.bundler && !['webpack', 'rollup', 'vite', 'auto'].includes(config.bundler)) {
      throw new ValidationError(
        `不支持的构建工具: ${config.bundler}`,
        { bundler: config.bundler, supported: ['webpack', 'rollup', 'vite', 'auto'] }
      );
    }
  }

  /**
   * 报告进度
   * 
   * @param callback - 进度回调函数
   * @param phase - 当前阶段
   * @param progress - 进度百分比 (0-100)
   * @param message - 进度消息
   * @private
   */
  private reportProgress(
    callback: ProgressCallback | undefined,
    phase: string,
    progress: number,
    message: string
  ): void {
    if (callback) {
      callback(phase, progress, message);
    }
  }

  /**
   * 生成优化建议
   * 
   * @param result - 分析结果
   * @returns 优化建议数组
   * @private
   * 
   * @description 基于分析结果智能生成优化建议，包括：
   * - Bundle体积优化
   * - 代码分割建议
   * - 依赖优化
   * - 性能改进
   */
  private generateSuggestions(result: AnalysisResult): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 基于Bundle大小的建议
    if (result.bundle && result.bundle.totalSize > 1024 * 1024) {
      suggestions.push({
        category: 'bundle',
        title: 'Bundle 体积过大',
        description: '考虑使用代码分割和懒加载来减小初始加载体积',
        impact: 'high',
        effort: 'medium',
        savings: { size: Math.round(result.bundle.totalSize * 0.3) },
        steps: [
          '使用动态import()实现路由懒加载',
          '将第三方库单独打包为vendor chunk',
          '启用Tree Shaking移除未使用的代码',
          '考虑使用CDN加载大型依赖'
        ]
      });
    }

    // 基于模块数量的建议
    if (result.bundle && result.bundle.modules.length > 500) {
      suggestions.push({
        category: 'code-split',
        title: '模块数量过多',
        description: `项目包含 ${result.bundle.modules.length} 个模块，建议进行代码分割`,
        impact: 'medium',
        effort: 'medium',
        steps: [
          '按路由或功能模块进行代码分割',
          '使用动态导入延迟加载非关键模块',
          '考虑微前端架构拆分应用'
        ]
      });
    }

    // 基于循环依赖的建议
    if (result.dependency?.circular && result.dependency.circular.length > 0) {
      suggestions.push({
        category: 'code-split',
        title: '存在循环依赖',
        description: `发现 ${result.dependency.circular.length} 个循环依赖，可能导致打包和运行时问题`,
        impact: result.dependency.circular.length > 5 ? 'high' : 'medium',
        effort: 'high',
        steps: [
          '使用依赖关系图找出循环依赖',
          '重构代码，提取公共逻辑到独立模块',
          '考虑使用依赖注入解耦模块',
          '添加ESLint规则防止新的循环依赖'
        ]
      });
    }

    // 基于重复依赖的建议
    if (result.dependency?.duplicates && result.dependency.duplicates.length > 0) {
      const totalDuplicateSize = result.dependency.duplicates.reduce(
        (sum, d) => sum + d.totalSize,
        0
      );

      suggestions.push({
        category: 'bundle',
        title: '存在重复依赖',
        description: `发现 ${result.dependency.duplicates.length} 个重复依赖，建议统一版本`,
        impact: totalDuplicateSize > 100 * 1024 ? 'high' : 'medium',
        effort: 'low',
        savings: {
          size: Math.round(totalDuplicateSize * 0.5),
        },
        steps: [
          '使用 npm ls 或 pnpm why 查找重复依赖来源',
          '在package.json中统一依赖版本',
          '使用resolutions字段强制使用特定版本',
          '考虑使用pnpm减少重复依赖'
        ]
      });
    }

    // 基于代码行数的建议
    if (result.code && result.code.lines.code > 50000) {
      suggestions.push({
        category: 'code-split',
        title: '代码规模较大',
        description: `项目代码量超过 ${Math.round(result.code.lines.code / 1000)}k 行，建议模块化`,
        impact: 'medium',
        effort: 'high',
        steps: [
          '将大型组件拆分为小型可复用组件',
          '按功能领域组织代码结构',
          '考虑使用monorepo管理多个包',
          '定期重构和清理冗余代码'
        ]
      });
    }

    // 基于注释覆盖率的建议
    if (result.code && result.code.commentCoverage < 10) {
      suggestions.push({
        category: 'code-split',
        title: '代码注释不足',
        description: `注释覆盖率仅 ${result.code.commentCoverage.toFixed(1)}%，建议增加代码文档`,
        impact: 'low',
        effort: 'low',
        steps: [
          '为公共API添加JSDoc注释',
          '为复杂逻辑添加说明性注释',
          '使用TypeDoc自动生成API文档',
          '建立代码注释规范'
        ]
      });
    }

    // 基于Gzip压缩比的建议
    if (result.bundle) {
      const compressionRatio = result.bundle.gzipSize / result.bundle.totalSize;
      if (compressionRatio > 0.4) {
        suggestions.push({
          category: 'compression',
          title: 'Gzip压缩效果不佳',
          description: '压缩比偏低，可能包含大量二进制或已压缩资源',
          impact: 'low',
          effort: 'low',
          steps: [
            '将图片等二进制资源移至CDN',
            '启用Brotli压缩获得更好效果',
            '检查是否包含压缩的资源文件',
            '优化文本资源的可压缩性'
          ]
        });
      }
    }

    return suggestions;
  }

  /**
   * 设置错误恢复策略
   * 
   * @private
   * @description 注册各种错误场景的恢复策略
   */
  private setupRecoveryStrategies(): void {
    // 解析错误恢复策略：返回空数据继续分析
    this.errorHandler.registerRecoveryStrategy('parse-fallback', {
      canRecover: (error) => error instanceof ParseError,
      recover: async () => ({
        modules: [],
        chunks: [],
        dependencies: {},
        buildInfo: {},
      }),
      description: '解析失败时返回空数据，继续进行代码分析'
    });
  }
}

