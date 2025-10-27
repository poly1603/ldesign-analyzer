/**
 * 高级使用示例
 * 
 * @description 展示 @ldesign/analyzer 的高级功能
 * - 错误处理
 * - 进度显示
 * - 缓存系统
 * - 配置管理
 * - 日志系统
 * - 代码质量分析
 * - 安全检测
 */

import {
  Analyzer,
  CacheManager,
  ConfigManager,
  Logger,
  LogLevel,
  ProgressManager,
  ErrorHandler,
  ComplexityAnalyzer,
  SensitiveInfoDetector,
  AnalysisError,
  type AnalysisResult,
} from '../src';

/**
 * 高级分析器类
 */
class AdvancedAnalyzer {
  private logger: Logger;
  private cache: CacheManager;
  private config: any;

  constructor() {
    // 初始化日志系统
    this.logger = new Logger({
      level: LogLevel.INFO,
      console: true,
      file: true,
      filePath: './logs/analyzer.log',
      colors: true,
    });

    // 初始化缓存系统
    this.cache = new CacheManager({
      cacheDir: './.analyzer-cache',
      defaultTTL: 3600000, // 1小时
      enabled: true,
    });

    this.logger.info('AdvancedAnalyzer 初始化完成');
  }

  /**
   * 执行完整分析
   */
  async analyze(projectPath: string): Promise<AnalysisResult> {
    this.logger.info(`开始分析项目: ${projectPath}`);

    try {
      // 1. 加载配置
      await this.loadConfig();

      // 2. 检查缓存
      const cacheKey = `analysis-${projectPath}`;
      const cached = await this.cache.get(cacheKey, projectPath);

      if (cached) {
        this.logger.info('✅ 使用缓存结果');
        return cached;
      }

      // 3. 执行分析
      const result = await this.performAnalysis(projectPath);

      // 4. 运行额外检查
      await this.runQualityChecks(result, projectPath);
      await this.runSecurityChecks(result, projectPath);

      // 5. 保存到缓存
      await this.cache.set(cacheKey, result, projectPath);
      this.logger.info('✅ 结果已缓存');

      // 6. 生成报告
      await this.generateReports(result);

      this.logger.info('✅ 分析完成');
      return result;
    } catch (error) {
      this.logger.error('❌ 分析失败', error as Error);
      throw error;
    } finally {
      // 刷新日志
      await this.logger.flush();
    }
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    this.logger.info('加载配置...');

    try {
      const configManager = new ConfigManager();
      this.config = await configManager.load();
      this.logger.info('配置加载成功', {
        bundler: this.config.bundler,
        output: this.config.output,
      });
    } catch (error) {
      this.logger.warn('使用默认配置');
      this.config = {
        path: '.',
        bundler: 'auto',
        output: ['cli', 'html'],
      };
    }
  }

  /**
   * 执行基础分析
   */
  private async performAnalysis(projectPath: string): Promise<AnalysisResult> {
    this.logger.info('执行基础分析...');

    const analyzer = new Analyzer();
    const progress = new ProgressManager();

    progress.start('分析项目', 100);

    try {
      const result = await analyzer.analyze(
        {
          path: projectPath,
          bundler: this.config.bundler || 'auto',
          analyze: {
            bundle: true,
            dependency: true,
            code: true,
          },
        },
        (phase, percent, message) => {
          progress.update(Math.round(percent), message);
          this.logger.debug(`[${phase}] ${percent.toFixed(1)}%: ${message}`);
        }
      );

      progress.complete('基础分析完成');
      return result;
    } catch (error) {
      progress.error('分析失败');
      throw new AnalysisError(
        '基础分析失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 运行代码质量检查
   */
  private async runQualityChecks(
    result: AnalysisResult,
    projectPath: string
  ): Promise<void> {
    this.logger.info('运行代码质量检查...');

    try {
      // 代码复杂度分析
      this.logger.info('  - 分析代码复杂度');
      const complexityAnalyzer = new ComplexityAnalyzer();
      const complexity = await complexityAnalyzer.analyze({ projectPath });

      this.logger.info('代码复杂度分析完成', {
        average: complexity.averageComplexity,
        max: complexity.maxComplexity,
        totalFunctions: complexity.totalFunctions,
        complexFunctions: complexity.complexFunctions.length,
      });

      // 更新结果
      result.code = {
        ...result.code!,
        quality: {
          averageComplexity: complexity.averageComplexity,
          maxComplexity: complexity.maxComplexity,
          complexFunctions: complexity.complexFunctions,
          duplicates: [],
          deadCode: [],
          codeSmells: [],
        },
      };

      // 报告复杂函数
      if (complexity.complexFunctions.length > 0) {
        this.logger.warn(
          `发现 ${complexity.complexFunctions.length} 个复杂函数`,
          {
            examples: complexity.complexFunctions.slice(0, 3).map(f => ({
              name: f.name,
              file: f.file,
              complexity: f.complexity,
            })),
          }
        );
      }
    } catch (error) {
      this.logger.error('代码质量检查失败', error as Error);
      // 不抛出错误，继续执行
    }
  }

  /**
   * 运行安全检查
   */
  private async runSecurityChecks(
    result: AnalysisResult,
    projectPath: string
  ): Promise<void> {
    this.logger.info('运行安全检查...');

    try {
      // 敏感信息检测
      this.logger.info('  - 检测敏感信息');
      const detector = new SensitiveInfoDetector();
      const sensitive = await detector.analyze({ projectPath });

      this.logger.info('敏感信息检测完成', {
        total: sensitive.total,
        byType: sensitive.byType,
      });

      // 更新结果
      result.security = {
        vulnerabilities: [],
        sensitiveInfo: sensitive.findings,
        licenseIssues: [],
      };

      // 报告敏感信息
      if (sensitive.total > 0) {
        this.logger.warn(`发现 ${sensitive.total} 处敏感信息`, {
          types: sensitive.byType,
          examples: sensitive.findings.slice(0, 3).map(s => ({
            type: s.type,
            file: s.file,
            line: s.line,
          })),
        });
      }
    } catch (error) {
      this.logger.error('安全检查失败', error as Error);
      // 不抛出错误，继续执行
    }
  }

  /**
   * 生成报告
   */
  private async generateReports(result: AnalysisResult): Promise<void> {
    this.logger.info('生成报告...');

    const analyzer = new Analyzer();
    const outputs = this.config.output || ['cli'];

    for (const format of outputs) {
      try {
        this.logger.info(`  - 生成 ${format} 报告`);
        await analyzer.report(result, [format]);
      } catch (error) {
        this.logger.error(`生成 ${format} 报告失败`, error as Error);
      }
    }
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    this.logger.info('清理缓存...');
    await this.cache.clear();
    this.logger.info('✅ 缓存已清理');
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<void> {
    const stats = await this.cache.getStats();
    this.logger.info('缓存统计', {
      entries: stats.totalEntries,
      memoryEntries: stats.memoryEntries,
      diskEntries: stats.diskEntries,
      totalSize: `${(stats.totalSize / 1024).toFixed(2)} KB`,
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 @ldesign/analyzer 高级使用示例\n');

  // 设置错误处理
  const errorHandler = ErrorHandler.getInstance();

  // 注册恢复策略
  errorHandler.registerRecoveryStrategy('analysis-fallback', {
    canRecover: (error) => error instanceof AnalysisError,
    recover: async () => {
      console.warn('⚠️ 使用降级分析');
      return {
        timestamp: Date.now(),
        projectPath: '.',
        bundler: 'auto',
      };
    },
    description: '分析失败时使用降级策略',
  });

  try {
    // 创建高级分析器
    const analyzer = new AdvancedAnalyzer();

    // 执行分析
    const projectPath = process.argv[2] || '.';
    const result = await analyzer.analyze(projectPath);

    // 显示缓存统计
    await analyzer.getCacheStats();

    console.log('\n✅ 分析成功完成！');
    console.log(`\n📊 分析结果摘要:`);
    console.log(`  - Bundle大小: ${formatBytes(result.bundle?.totalSize || 0)}`);
    console.log(`  - 模块数量: ${result.bundle?.modules.length || 0}`);
    console.log(`  - 代码行数: ${result.code?.lines.total.toLocaleString() || 0}`);

    if (result.code?.quality) {
      console.log(`  - 平均复杂度: ${result.code.quality.averageComplexity}`);
      console.log(`  - 复杂函数: ${result.code.quality.complexFunctions.length}`);
    }

    if (result.security) {
      console.log(`  - 敏感信息: ${result.security.sensitiveInfo.length}`);
    }

    console.log(`  - 优化建议: ${result.suggestions?.length || 0}`);
  } catch (error) {
    console.error('\n❌ 错误:', (error as Error).message);

    // 使用错误处理器
    await errorHandler.handle(error as Error, {
      logToConsole: true,
      throw: false,
    });

    process.exit(1);
  }
}

/**
 * 格式化字节
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

export { AdvancedAnalyzer };


