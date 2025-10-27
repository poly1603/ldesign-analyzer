/**
 * 完整功能示例
 * 
 * @description 展示 @ldesign/analyzer v0.2.0 的所有功能
 */

import {
  // 核心
  Analyzer,

  // 缓存
  CacheManager,

  // 配置
  ConfigManager,
  loadConfig,

  // 日志
  Logger,
  LogLevel,
  createLogger,

  // 进度
  ProgressManager,
  withProgress,

  // 错误处理
  ErrorHandler,
  AnalysisError,
  withErrorHandling,
  safeExecute,
  retryOnError,

  // 对比分析
  Comparator,

  // 监控
  WatchManager,
  createWatcher,

  // 插件
  PluginManager,
  PluginHook,
  createPlugin,
  createBudgetPlugin,
  createNotificationPlugin,

  // 分析器
  ComplexityAnalyzer,
  SensitiveInfoDetector,

  // 类型
  type AnalysisResult,
} from '../src';

/**
 * 完整示例类
 */
class CompleteExample {
  private logger: Logger;
  private cache: CacheManager;
  private analyzer: Analyzer;
  private pluginManager?: PluginManager;

  constructor() {
    // 初始化日志
    this.logger = new Logger({
      level: LogLevel.INFO,
      console: true,
      file: true,
      filePath: './logs/complete-example.log',
      colors: true,
    });

    // 初始化缓存
    this.cache = new CacheManager({
      cacheDir: './.analyzer-cache-example',
      defaultTTL: 3600000,
      enabled: true,
    });

    // 初始化分析器
    this.analyzer = new Analyzer();

    this.logger.info('CompleteExample 初始化完成');
  }

  /**
   * 示例1: 基础分析
   */
  async example1_BasicAnalysis(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例1: 基础分析');
    console.log('='.repeat(60) + '\n');

    const result = await this.analyzer.analyze({
      path: process.cwd(),
      bundler: 'auto',
      analyze: {
        code: true,
        bundle: false,
        dependency: false,
      },
    });

    console.log('✅ 基础分析完成');
    console.log(`代码行数: ${result.code?.lines.total}`);
  }

  /**
   * 示例2: 带缓存的分析
   */
  async example2_WithCache(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例2: 带缓存的分析');
    console.log('='.repeat(60) + '\n');

    const cacheKey = 'example-analysis';
    const projectPath = process.cwd();

    // 尝试从缓存读取
    let result = await this.cache.get<AnalysisResult>(cacheKey, projectPath);

    if (result) {
      console.log('✅ 使用缓存结果');
    } else {
      console.log('🔄 执行新分析...');
      result = await this.analyzer.analyze({
        path: projectPath,
        analyze: { code: true, bundle: false },
      });

      // 保存到缓存
      await this.cache.set(cacheKey, result, projectPath);
      console.log('💾 结果已缓存');
    }

    // 显示缓存统计
    const stats = await this.cache.getStats();
    console.log(`\n缓存统计:`);
    console.log(`  - 条目数: ${stats.totalEntries}`);
    console.log(`  - 内存缓存: ${stats.memoryEntries}`);
    console.log(`  - 磁盘缓存: ${stats.diskEntries}`);
  }

  /**
   * 示例3: 带进度显示的分析
   */
  async example3_WithProgress(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例3: 带进度显示的分析');
    console.log('='.repeat(60) + '\n');

    const result = await this.analyzer.analyze(
      {
        path: process.cwd(),
        analyze: { code: true, bundle: false },
      },
      (phase, progress, message) => {
        // 进度回调
        this.logger.debug(`[${phase}] ${progress.toFixed(1)}%: ${message}`);
      }
    );

    console.log('✅ 带进度的分析完成');
  }

  /**
   * 示例4: 错误处理
   */
  async example4_ErrorHandling(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例4: 错误处理');
    console.log('='.repeat(60) + '\n');

    const errorHandler = ErrorHandler.getInstance();

    // 注册恢复策略
    errorHandler.registerRecoveryStrategy('fallback', {
      canRecover: (error) => error instanceof AnalysisError,
      recover: async () => {
        console.log('🔄 使用降级策略');
        return {
          timestamp: Date.now(),
          projectPath: '.',
          bundler: 'auto' as const,
        };
      },
      description: '分析失败时的降级策略',
    });

    // 安全执行
    const safeResult = await safeExecute(
      async () => {
        // 可能失败的操作
        return await this.analyzer.analyze({
          path: '/invalid/path',
          analyze: { code: true },
        });
      },
      null,
      true
    );

    console.log('✅ 错误处理完成');
  }

  /**
   * 示例5: 对比分析
   */
  async example5_CompareAnalysis(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例5: 对比分析');
    console.log('='.repeat(60) + '\n');

    // 模拟两个版本的分析结果
    const baseline: AnalysisResult = {
      timestamp: Date.now() - 3600000,
      projectPath: '.',
      bundler: 'webpack',
      bundle: {
        totalSize: 1024 * 1024,
        gzipSize: 300 * 1024,
        modules: [],
        chunks: [],
        assetTypes: {} as any,
        treeMapData: {} as any,
      },
      code: {
        lines: { total: 10000, code: 8000, comment: 1500, blank: 500 },
        fileSize: {} as any,
        languages: {},
        commentCoverage: 15,
      },
    };

    const current: AnalysisResult = {
      timestamp: Date.now(),
      projectPath: '.',
      bundler: 'webpack',
      bundle: {
        totalSize: 900 * 1024, // 减小了
        gzipSize: 280 * 1024,
        modules: [],
        chunks: [],
        assetTypes: {} as any,
        treeMapData: {} as any,
      },
      code: {
        lines: { total: 10500, code: 8300, comment: 1700, blank: 500 },
        fileSize: {} as any,
        languages: {},
        commentCoverage: 16.2, // 提升了
      },
    };

    const comparator = new Comparator();
    const diff = comparator.compare(baseline, current);

    console.log('对比结果:');
    console.log(`  总体评分变化: ${diff.scoreChange}`);
    console.log(`  Bundle大小变化: ${diff.bundleDiff?.totalSizeChange.percentage.toFixed(1)}%`);
    console.log(`  注释覆盖率变化: +${diff.codeDiff?.commentCoverageChange.diff.toFixed(1)}%`);

    console.log('\n建议:');
    diff.recommendations.forEach(rec => console.log(`  ${rec}`));

    console.log('\n✅ 对比分析完成');
  }

  /**
   * 示例6: 插件系统
   */
  async example6_PluginSystem(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例6: 插件系统');
    console.log('='.repeat(60) + '\n');

    const config = {
      path: process.cwd(),
      analyze: { code: true, bundle: false },
    };

    const pluginManager = new PluginManager(config);

    // 注册性能预算插件
    const budgetPlugin = createBudgetPlugin({
      maxBundleSize: 5 * 1024 * 1024, // 5MB
      maxCircularDependencies: 0,
    });
    pluginManager.register(budgetPlugin);

    // 注册自定义插件
    const customPlugin = createPlugin(
      'logger-plugin',
      PluginHook.AfterAnalyze,
      async (context) => {
        console.log('  [插件] 分析完成通知');
        console.log(`  [插件] 代码行数: ${context.result?.code?.lines.total}`);
      }
    );
    pluginManager.register(customPlugin);

    // 注册通知插件
    const notifyPlugin = createNotificationPlugin(async (result) => {
      console.log('  [通知] 分析完成，可以发送通知到Slack/钉钉等');
    });
    pluginManager.register(notifyPlugin);

    console.log(`已注册 ${pluginManager.getPluginCount()} 个插件`);

    // 执行分析前钩子
    await pluginManager.executeHook(PluginHook.BeforeAnalyze);

    // 执行分析
    const result = await this.analyzer.analyze(config);

    // 执行分析后钩子
    await pluginManager.executeHook(PluginHook.AfterAnalyze, result);

    console.log('\n✅ 插件系统示例完成');
  }

  /**
   * 示例7: 高级分析（所有分析器）
   */
  async example7_AdvancedAnalysis(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例7: 高级分析（所有分析器）');
    console.log('='.repeat(60) + '\n');

    const projectPath = process.cwd();

    // 1. 代码复杂度分析
    console.log('📊 1. 代码复杂度分析...');
    const complexityAnalyzer = new ComplexityAnalyzer();
    const complexity = await complexityAnalyzer.analyze({ projectPath });

    console.log(`  平均复杂度: ${complexity.averageComplexity}`);
    console.log(`  最大复杂度: ${complexity.maxComplexity}`);
    console.log(`  复杂函数数: ${complexity.complexFunctions.length}`);

    // 2. 敏感信息检测
    console.log('\n🔒 2. 敏感信息检测...');
    const detector = new SensitiveInfoDetector();
    const sensitive = await detector.analyze({ projectPath });

    console.log(`  发现敏感信息: ${sensitive.total} 处`);
    if (sensitive.total > 0) {
      console.log(`  类型分布:`, sensitive.byType);
    }

    console.log('\n✅ 高级分析完成');
  }

  /**
   * 示例8: 配置系统
   */
  async example8_ConfigSystem(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('示例8: 配置系统');
    console.log('='.repeat(60) + '\n');

    const configManager = new ConfigManager();

    // 加载配置
    const config = await configManager.load();

    console.log('配置信息:');
    console.log(`  Bundler: ${config.bundler}`);
    console.log(`  Output: ${config.output?.join(', ')}`);
    console.log(`  缓存: ${config.cache?.enabled ? '启用' : '禁用'}`);
    console.log(`  并发数: ${config.performance?.concurrency}`);

    // 合并配置
    const merged = configManager.merge(config, {
      bundler: 'vite',
      analyze: { quality: true },
    });

    console.log('\n合并后配置:');
    console.log(`  Bundler: ${merged.bundler}`);
    console.log(`  质量分析: ${merged.analyze?.quality}`);

    console.log('\n✅ 配置系统示例完成');
  }

  /**
   * 运行所有示例
   */
  async runAll(): Promise<void> {
    console.log('\n' + '🎉'.repeat(30));
    console.log('  @ldesign/analyzer v0.2.0 完整功能演示');
    console.log('🎉'.repeat(30) + '\n');

    try {
      // 示例1: 基础分析
      await this.example1_BasicAnalysis();

      // 示例2: 缓存
      await this.example2_WithCache();

      // 示例3: 进度
      await this.example3_WithProgress();

      // 示例4: 错误处理
      await this.example4_ErrorHandling();

      // 示例5: 对比分析
      await this.example5_CompareAnalysis();

      // 示例6: 插件系统
      await this.example6_PluginSystem();

      // 示例7: 高级分析
      await this.example7_AdvancedAnalysis();

      // 示例8: 配置系统
      await this.example8_ConfigSystem();

      console.log('\n' + '='.repeat(60));
      console.log('🎉 所有示例执行完成！');
      console.log('='.repeat(60) + '\n');

      // 显示最终统计
      await this.showFinalStats();
    } catch (error) {
      this.logger.error('示例执行失败', error as Error);
      throw error;
    } finally {
      // 刷新日志
      await this.logger.flush();
    }
  }

  /**
   * 显示最终统计
   */
  private async showFinalStats(): Promise<void> {
    console.log('📊 最终统计:');

    // 缓存统计
    const cacheStats = await this.cache.getStats();
    console.log('\n缓存统计:');
    console.log(`  - 总条目: ${cacheStats.totalEntries}`);
    console.log(`  - 内存缓存: ${cacheStats.memoryEntries}`);
    console.log(`  - 磁盘缓存: ${cacheStats.diskEntries}`);
    console.log(`  - 总大小: ${(cacheStats.totalSize / 1024).toFixed(2)} KB`);

    // 错误统计
    const errorHandler = ErrorHandler.getInstance();
    const errorStats = errorHandler.getErrorStats();
    console.log('\n错误统计:');
    console.log(`  - 总错误: ${errorStats.total}`);
    console.log(`  - 最近一小时: ${errorStats.recent}`);
    if (Object.keys(errorStats.byType).length > 0) {
      console.log(`  - 按类型:`, errorStats.byType);
    }

    // 日志统计
    const logs = this.logger.getBuffer();
    console.log('\n日志统计:');
    console.log(`  - 缓冲区日志: ${logs.length}`);
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 清理资源...');

    // 清理缓存
    await this.cache.clear();

    // 刷新日志
    await this.logger.flush();

    console.log('✅ 清理完成');
  }
}

/**
 * 主函数
 */
async function main() {
  const example = new CompleteExample();

  try {
    // 运行所有示例
    await example.runAll();

    console.log('\n✅ 演示成功完成！');
    console.log('\n💡 提示:');
    console.log('  - 查看日志文件: ./logs/complete-example.log');
    console.log('  - 查看缓存目录: ./.analyzer-cache-example');
    console.log('  - 查看文档: ./README.md');
    console.log('  - 查看快速参考: ./QUICK_REFERENCE.md\n');
  } catch (error) {
    console.error('\n❌ 演示执行失败:', (error as Error).message);
    process.exit(1);
  } finally {
    // 清理
    await example.cleanup();
  }
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

export { CompleteExample };


