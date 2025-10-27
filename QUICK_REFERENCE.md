# @ldesign/analyzer 快速参考

> **版本**: v0.2.0  
> **更新日期**: 2025-10-25

本文档提供 @ldesign/analyzer 的快速参考，包括新增功能和常用API。

---

## 📚 目录

- [基础使用](#基础使用)
- [错误处理](#错误处理)
- [进度显示](#进度显示)
- [缓存系统](#缓存系统)
- [配置系统](#配置系统)
- [日志系统](#日志系统)
- [并发处理](#并发处理)
- [新增分析器](#新增分析器)

---

## 基础使用

### 简单分析

```typescript
import { Analyzer } from '@ldesign/analyzer';

const analyzer = new Analyzer();
const result = await analyzer.analyze({
  path: './dist',
  bundler: 'webpack'
});

await analyzer.report(result, ['cli', 'html']);
```

### 带进度回调

```typescript
const result = await analyzer.analyze(
  {
    path: './dist',
    bundler: 'webpack'
  },
  (phase, progress, message) => {
    console.log(`[${phase}] ${progress.toFixed(1)}%: ${message}`);
  }
);
```

### 取消分析

```typescript
const analyzePromise = analyzer.analyze(config);

// 5秒后取消
setTimeout(() => analyzer.cancel(), 5000);

try {
  await analyzePromise;
} catch (error) {
  console.log('分析已取消');
}
```

---

## 错误处理

### 使用自定义错误类

```typescript
import { AnalysisError, ParseError, ValidationError } from '@ldesign/analyzer';

// 抛出分析错误
throw new AnalysisError(
  'Bundle分析失败',
  { moduleCount: 0 },
  originalError
);

// 抛出解析错误
throw new ParseError(
  '无法解析webpack stats.json',
  { path: './dist/stats.json' }
);

// 抛出验证错误
throw new ValidationError(
  '项目路径不存在',
  { path: './non-existent' }
);
```

### 错误处理器

```typescript
import { ErrorHandler } from '@ldesign/analyzer';

const errorHandler = ErrorHandler.getInstance();

// 注册恢复策略
errorHandler.registerRecoveryStrategy('parse-fallback', {
  canRecover: (error) => error instanceof ParseError,
  recover: async () => ({ modules: [], chunks: [] }),
  description: '解析失败时返回空数据'
});

// 处理错误
try {
  await someFunction();
} catch (error) {
  await errorHandler.handle(error, {
    logToConsole: true,
    throw: false
  });
}
```

### 辅助函数

```typescript
import { withErrorHandling, safeExecute, retryOnError } from '@ldesign/analyzer';

// 函数包装
const safeAnalyze = withErrorHandling(
  async () => analyzer.analyze(config),
  { logToConsole: true, throw: false }
);

// 安全执行
const result = await safeExecute(
  () => readJsonFile('./config.json'),
  {}, // 默认值
  true // 记录错误
);

// 重试机制
const data = await retryOnError(
  () => fetchData(),
  3,       // 最多重试3次
  1000,    // 间隔1秒
  (attempt) => console.log(`重试第${attempt}次`)
);
```

---

## 进度显示

### 基础用法

```typescript
import { ProgressManager } from '@ldesign/analyzer';

const progress = new ProgressManager();

// 开始阶段
progress.start('分析文件', 100);

// 更新进度
for (let i = 0; i < 100; i++) {
  await analyzeFile(files[i]);
  progress.increment(`正在分析: ${files[i]}`);
}

// 完成
progress.complete();
```

### 带进度的批处理

```typescript
import { withProgress } from '@ldesign/analyzer';

const results = await withProgress(
  files,
  async (file) => analyzeFile(file),
  {
    phase: '分析文件',
    concurrency: 5,
    silent: false,
    onProgress: (info) => {
      console.log(`进度: ${info.percent.toFixed(1)}%`);
    }
  }
);
```

### 进度装饰器

```typescript
import { withProgressDecorator } from '@ldesign/analyzer';

class MyAnalyzer {
  @withProgressDecorator('分析Bundle')
  async analyzeBundle() {
    // 分析逻辑
  }
}
```

---

## 缓存系统

### 基础用法

```typescript
import { CacheManager } from '@ldesign/analyzer';

const cache = new CacheManager({
  cacheDir: './.analyzer-cache',
  defaultTTL: 3600000, // 1小时
  enabled: true
});

// 保存缓存
await cache.set('bundle-analysis', result, filePath);

// 读取缓存
const cached = await cache.get('bundle-analysis', filePath);
if (cached) {
  console.log('使用缓存结果');
} else {
  // 执行分析
  const result = await analyze();
  await cache.set('bundle-analysis', result, filePath);
}
```

### 缓存管理

```typescript
// 删除缓存
await cache.delete('old-analysis');

// 清空所有缓存
await cache.clear();

// 清理过期缓存
await cache.cleanup();

// 获取缓存统计
const stats = await cache.getStats();
console.log(`缓存条目: ${stats.totalEntries}`);
console.log(`缓存大小: ${stats.totalSize} 字节`);
```

### 使用默认缓存

```typescript
import { defaultCache } from '@ldesign/analyzer';

await defaultCache.set('key', data);
const cached = await defaultCache.get('key');
```

---

## 配置系统

### 配置文件

创建 `analyzer.config.ts`:

```typescript
export default {
  path: './dist',
  bundler: 'webpack',
  output: ['cli', 'html', 'json'],
  analyze: {
    bundle: true,
    dependency: true,
    code: true,
    quality: true,
    security: true
  },
  cache: {
    enabled: true,
    dir: '.analyzer-cache',
    ttl: 3600000
  },
  performance: {
    concurrency: 10,
    maxFileSize: 10 * 1024 * 1024
  },
  exclude: [
    'node_modules',
    '.git',
    'dist',
    'build'
  ]
};
```

### 程序化使用

```typescript
import { ConfigManager, loadConfig } from '@ldesign/analyzer';

// 使用快捷函数
const config = await loadConfig();

// 使用ConfigManager
const configManager = new ConfigManager();
const config = await configManager.load('./my-project');

// 合并配置
const merged = configManager.merge(baseConfig, {
  bundler: 'vite',
  analyze: { bundle: false }
});
```

---

## 日志系统

### 基础用法

```typescript
import { Logger, LogLevel } from '@ldesign/analyzer';

const logger = new Logger({
  level: LogLevel.INFO,
  console: true,
  file: true,
  filePath: './logs/analyzer.log',
  colors: true
});

// 记录日志
logger.debug('调试信息', { variable: value });
logger.info('开始分析', { path: './dist' });
logger.warn('性能警告', { size: 1024 * 1024 * 5 });
logger.error('分析失败', new Error('解析错误'));
```

### 子日志器

```typescript
import { createLogger } from '@ldesign/analyzer';

const bundleLogger = createLogger('Bundle', {
  level: LogLevel.DEBUG
});

bundleLogger.info('分析Bundle');
// 输出: [Bundle] 分析Bundle
```

### 日志管理

```typescript
// 设置日志级别
logger.setLevel(LogLevel.DEBUG);

// 获取日志缓冲区
const logs = logger.getBuffer();

// 清空缓冲区
logger.clearBuffer();

// 刷新到文件
await logger.flush();
```

### 使用默认日志器

```typescript
import { defaultLogger } from '@ldesign/analyzer';

defaultLogger.info('使用默认日志器');
```

---

## 并发处理

### 并发文件操作

```typescript
import {
  getAllFilesConcurrent,
  readFilesConcurrent,
  processBatch
} from '@ldesign/analyzer';

// 并发获取多个目录的文件
const files = await getAllFilesConcurrent(
  ['./src', './lib', './test'],
  ['.ts', '.tsx']
);

// 并发读取文件
const contents = await readFilesConcurrent([
  './file1.txt',
  './file2.txt',
  './file3.txt'
]);

// 批量处理（控制并发数）
const results = await processBatch(
  files,
  async (file) => analyzeFile(file),
  5 // 最多5个并发
);
```

---

## 新增分析器

### 代码复杂度分析

```typescript
import { ComplexityAnalyzer } from '@ldesign/analyzer';

const analyzer = new ComplexityAnalyzer();
const result = await analyzer.analyze({ 
  projectPath: './src' 
});

console.log(`平均复杂度: ${result.averageComplexity}`);
console.log(`最大复杂度: ${result.maxComplexity}`);
console.log(`总函数数: ${result.totalFunctions}`);

// 查看复杂函数
result.complexFunctions.forEach(func => {
  console.log(`${func.name} (${func.file}:${func.line}): ${func.complexity}`);
});
```

### 敏感信息检测

```typescript
import { SensitiveInfoDetector } from '@ldesign/analyzer';

const detector = new SensitiveInfoDetector();
const result = await detector.analyze({ 
  projectPath: './src' 
});

console.log(`发现 ${result.total} 处敏感信息`);
console.log('按类型:', result.byType);

// 查看详情
result.findings.forEach(finding => {
  console.log(`${finding.type}: ${finding.file}:${finding.line}`);
  console.log(`  模式: ${finding.pattern}`);
});
```

---

## 完整示例

### 带所有新功能的完整示例

```typescript
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
} from '@ldesign/analyzer';

async function analyzeProject() {
  // 1. 设置日志
  const logger = new Logger({
    level: LogLevel.INFO,
    console: true,
    file: true,
    filePath: './logs/analyzer.log'
  });

  // 2. 加载配置
  const configManager = new ConfigManager();
  const config = await configManager.load();
  logger.info('配置已加载', config);

  // 3. 设置缓存
  const cache = new CacheManager({
    cacheDir: './.analyzer-cache',
    defaultTTL: 3600000
  });

  // 4. 尝试从缓存加载
  const cacheKey = 'project-analysis';
  let result = await cache.get(cacheKey);

  if (result) {
    logger.info('使用缓存结果');
    return result;
  }

  // 5. 执行分析（带进度）
  const analyzer = new Analyzer();
  
  try {
    result = await analyzer.analyze(
      config,
      (phase, progress, message) => {
        logger.debug(`[${phase}] ${progress.toFixed(1)}%: ${message}`);
      }
    );

    // 6. 运行额外分析
    logger.info('运行代码复杂度分析');
    const complexityAnalyzer = new ComplexityAnalyzer();
    const complexity = await complexityAnalyzer.analyze({
      projectPath: config.path
    });
    
    logger.info('运行敏感信息检测');
    const detector = new SensitiveInfoDetector();
    const sensitive = await detector.analyze({
      projectPath: config.path
    });

    // 7. 合并结果
    result.code = {
      ...result.code,
      quality: {
        ...result.code?.quality,
        averageComplexity: complexity.averageComplexity,
        maxComplexity: complexity.maxComplexity,
        complexFunctions: complexity.complexFunctions,
      }
    };

    result.security = {
      ...result.security,
      sensitiveInfo: sensitive.findings,
    };

    // 8. 保存到缓存
    await cache.set(cacheKey, result, config.path);
    logger.info('结果已缓存');

    // 9. 生成报告
    await analyzer.report(result, config.output || ['cli']);
    logger.info('分析完成');

    return result;
  } catch (error) {
    logger.error('分析失败', error as Error);
    
    // 错误处理
    const errorHandler = ErrorHandler.getInstance();
    await errorHandler.handle(error as Error, {
      logToConsole: true,
      throw: false
    });
    
    throw error;
  } finally {
    // 刷新日志
    await logger.flush();
  }
}

// 运行分析
analyzeProject().catch(console.error);
```

---

## 🔗 相关链接

- [完整文档](./README.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [项目计划](./PROJECT_PLAN.md)
- [更新日志](./CHANGELOG.md)

---

**最后更新**: 2025-10-25  
**版本**: v0.2.0


