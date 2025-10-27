# 📖 @ldesign/analyzer API参考文档

**版本**: v0.2.0  
**更新日期**: 2025-10-25

本文档提供 @ldesign/analyzer 的完整API参考。

---

## 📚 目录

- [核心类](#核心类)
  - [Analyzer](#analyzer)
  - [BundleAnalyzer](#bundleanalyzer)
  - [DependencyAnalyzer](#dependencyanalyzer)
  - [CodeAnalyzer](#codeanalyzer)
- [错误处理](#错误处理)
- [缓存系统](#缓存系统)
- [进度管理](#进度管理)
- [配置系统](#配置系统)
- [日志系统](#日志系统)
- [分析器](#分析器)
- [插件系统](#插件系统)
- [对比分析](#对比分析)
- [监控模式](#监控模式)
- [工具函数](#工具函数)

---

## 核心类

### Analyzer

主分析器类，协调所有分析任务的执行。

#### 构造函数

```typescript
constructor()
```

#### 方法

##### `analyze(config, onProgress?)`

执行项目分析。

**参数**:
- `config: AnalyzerConfig` - 分析配置
- `onProgress?: ProgressCallback` - 可选的进度回调函数

**返回**: `Promise<AnalysisResult>`

**抛出**:
- `ValidationError` - 当配置无效时
- `ParseError` - 当解析失败且无法恢复时
- `AnalysisError` - 当分析过程出错时

**示例**:
```typescript
const analyzer = new Analyzer();
const result = await analyzer.analyze({
  path: './dist',
  bundler: 'webpack',
  analyze: {
    bundle: true,
    dependency: true,
    code: true
  }
});
```

##### `report(result, formats?)`

生成分析报告。

**参数**:
- `result: AnalysisResult` - 分析结果
- `formats?: OutputFormat[]` - 输出格式数组，默认 `['cli']`

**返回**: `Promise<void>`

**示例**:
```typescript
await analyzer.report(result, ['cli', 'html', 'json']);
```

##### `cancel()`

取消正在进行的分析。

**示例**:
```typescript
const analyzePromise = analyzer.analyze(config);
setTimeout(() => analyzer.cancel(), 5000);
```

---

## 错误处理

### 错误类

#### `AnalyzerError`

基础错误类，所有分析器错误的父类。

```typescript
class AnalyzerError extends Error {
  code: string;
  cause?: Error;
  context?: Record<string, any>;
  suggestion?: string;
  
  constructor(
    message: string,
    code?: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
      suggestion?: string;
    }
  )
  
  getFormattedMessage(): string;
}
```

#### 专用错误类

- `ParseError` - 解析错误
- `AnalysisError` - 分析错误
- `ConfigError` - 配置错误
- `FileSystemError` - 文件系统错误
- `ValidationError` - 验证错误
- `UnsupportedError` - 不支持的操作
- `NetworkError` - 网络错误
- `TimeoutError` - 超时错误

**示例**:
```typescript
throw new AnalysisError(
  'Bundle分析失败',
  { moduleCount: 0 },
  originalError
);
```

### ErrorHandler

全局错误处理器类。

#### 方法

##### `getInstance()`

获取错误处理器单例。

```typescript
static getInstance(): ErrorHandler
```

##### `registerRecoveryStrategy(name, strategy)`

注册错误恢复策略。

**参数**:
- `name: string` - 策略名称
- `strategy: RecoveryStrategy<T>` - 恢复策略

**示例**:
```typescript
errorHandler.registerRecoveryStrategy('parse-fallback', {
  canRecover: (error) => error instanceof ParseError,
  recover: async () => ({ modules: [], chunks: [] }),
  description: '解析失败时返回空数据'
});
```

##### `handle(error, options?)`

处理错误并尝试恢复。

**参数**:
- `error: Error` - 错误对象
- `options?: ErrorHandlerOptions` - 处理选项

**返回**: `Promise<T | undefined>`

### 辅助函数

#### `withErrorHandling(fn, options?)`

包装函数，自动处理错误。

```typescript
function withErrorHandling<T, Args>(
  fn: (...args: Args) => T | Promise<T>,
  options?: ErrorHandlerOptions
): (...args: Args) => Promise<T | undefined>
```

#### `safeExecute(fn, defaultValue, logError?)`

安全执行函数，出错返回默认值。

```typescript
function safeExecute<T>(
  fn: () => T | Promise<T>,
  defaultValue: T,
  logError?: boolean
): Promise<T>
```

#### `retryOnError(fn, maxRetries?, delay?, onRetry?)`

重试函数执行。

```typescript
function retryOnError<T>(
  fn: () => T | Promise<T>,
  maxRetries?: number,
  delay?: number,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T>
```

---

## 缓存系统

### CacheManager

缓存管理器类。

#### 构造函数

```typescript
constructor(options?: CacheOptions)
```

**选项**:
```typescript
interface CacheOptions {
  cacheDir?: string;      // 默认: '.analyzer-cache'
  defaultTTL?: number;    // 默认: 0 (永不过期)
  enabled?: boolean;      // 默认: true
}
```

#### 方法

##### `set(key, data, filePath?, ttl?)`

设置缓存。

```typescript
async set<T>(
  key: string,
  data: T,
  filePath?: string,
  ttl?: number
): Promise<void>
```

##### `get(key, filePath?)`

获取缓存。

```typescript
async get<T>(
  key: string,
  filePath?: string
): Promise<T | null>
```

##### `delete(key)`

删除缓存。

```typescript
async delete(key: string): Promise<void>
```

##### `clear()`

清空所有缓存。

```typescript
async clear(): Promise<void>
```

##### `cleanup()`

清理过期缓存。

```typescript
async cleanup(): Promise<void>
```

##### `getStats()`

获取缓存统计。

```typescript
async getStats(): Promise<{
  totalEntries: number;
  memoryEntries: number;
  diskEntries: number;
  totalSize: number;
}>
```

**示例**:
```typescript
const cache = new CacheManager({
  cacheDir: './.my-cache',
  defaultTTL: 3600000 // 1小时
});

await cache.set('analysis', result, './dist');
const cached = await cache.get('analysis', './dist');
```

---

## 进度管理

### ProgressManager

进度管理器类。

#### 构造函数

```typescript
constructor(callback?: ProgressCallback, silent?: boolean)
```

#### 方法

##### `start(phase, total, message?)`

开始新阶段。

```typescript
start(phase: string, total: number, message?: string): void
```

##### `update(current, message?)`

更新进度。

```typescript
update(current: number, message?: string): void
```

##### `increment(message?, amount?)`

增加进度。

```typescript
increment(message?: string, amount?: number): void
```

##### `complete(message?)`

完成当前阶段。

```typescript
complete(message?: string): void
```

##### `getInfo()`

获取当前进度信息。

```typescript
getInfo(): ProgressInfo
```

**示例**:
```typescript
const progress = new ProgressManager();
progress.start('分析文件', 100);

for (let i = 0; i < 100; i++) {
  await analyzeFile(files[i]);
  progress.increment(`处理: ${files[i]}`);
}

progress.complete();
```

### 辅助函数

#### `withProgress(items, processor, options?)`

带进度显示的批处理。

```typescript
async function withProgress<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options?: {
    phase?: string;
    concurrency?: number;
    silent?: boolean;
    onProgress?: ProgressCallback;
  }
): Promise<R[]>
```

---

## 配置系统

### ConfigManager

配置管理器类。

#### 方法

##### `load(cwd?)`

加载配置文件。

```typescript
async load(cwd?: string): Promise<FullConfig>
```

##### `merge(baseConfig, overrides)`

合并配置。

```typescript
merge(baseConfig: FullConfig, overrides: Partial<FullConfig>): FullConfig
```

##### `getConfig()`

获取当前配置。

```typescript
getConfig(): FullConfig | null
```

##### `reset()`

重置配置。

```typescript
reset(): void
```

**示例**:
```typescript
const configManager = new ConfigManager();
const config = await configManager.load();
```

### 辅助函数

#### `loadConfig(cwd?)`

快捷加载配置。

```typescript
async function loadConfig(cwd?: string): Promise<FullConfig>
```

---

## 日志系统

### Logger

日志记录器类。

#### 构造函数

```typescript
constructor(options?: LoggerOptions)
```

**选项**:
```typescript
interface LoggerOptions {
  level?: LogLevel;        // 默认: INFO
  console?: boolean;       // 默认: true
  file?: boolean;          // 默认: false
  filePath?: string;
  colors?: boolean;        // 默认: true
}
```

#### 方法

##### `debug(message, meta?)`

记录DEBUG级别日志。

```typescript
debug(message: string, meta?: Record<string, any>): void
```

##### `info(message, meta?)`

记录INFO级别日志。

```typescript
info(message: string, meta?: Record<string, any>): void
```

##### `warn(message, meta?)`

记录WARN级别日志。

```typescript
warn(message: string, meta?: Record<string, any>): void
```

##### `error(message, metaOrError?)`

记录ERROR级别日志。

```typescript
error(message: string, metaOrError?: Record<string, any> | Error): void
```

##### `setLevel(level)`

设置日志级别。

```typescript
setLevel(level: LogLevel): void
```

##### `flush()`

刷新日志到文件。

```typescript
async flush(): Promise<void>
```

**示例**:
```typescript
const logger = new Logger({
  level: LogLevel.INFO,
  file: true,
  filePath: './logs/app.log'
});

logger.info('开始分析', { path: './dist' });
logger.error('分析失败', new Error('解析错误'));
```

### LogLevel枚举

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}
```

---

## 分析器

### 质量分析器

#### ComplexityAnalyzer

代码复杂度分析器。

```typescript
class ComplexityAnalyzer {
  async analyze(data: { 
    projectPath: string 
  }): Promise<ComplexityResult>
}
```

#### DuplicateCodeDetector

重复代码检测器。

```typescript
class DuplicateCodeDetector {
  async analyze(data: { 
    projectPath: string;
    minLines?: number;
    minTokens?: number;
  }): Promise<DuplicateCodeResult>
}
```

#### DeadCodeDetector

死代码检测器。

```typescript
class DeadCodeDetector {
  async analyze(data: { 
    projectPath: string;
    entryPoints?: string[];
  }): Promise<DeadCodeResult>
}
```

#### CodeSmellDetector

代码坏味道检测器。

```typescript
class CodeSmellDetector {
  async analyze(data: { 
    projectPath: string 
  }): Promise<CodeSmellResult>
}
```

### 安全分析器

#### SensitiveInfoDetector

敏感信息检测器。

```typescript
class SensitiveInfoDetector {
  async analyze(data: { 
    projectPath: string 
  }): Promise<SensitiveInfoResult>
}
```

#### VulnerabilityScanner

漏洞扫描器。

```typescript
class VulnerabilityScanner {
  async analyze(data: { 
    projectPath: string 
  }): Promise<VulnerabilityResult>
}
```

#### LicenseChecker

License检查器。

```typescript
class LicenseChecker {
  async analyze(data: { 
    projectPath: string;
    allowedLicenses?: string[];
    blockedLicenses?: string[];
  }): Promise<LicenseCheckResult>
}
```

### 性能分析器

#### BuildTimeAnalyzer

构建时间分析器。

```typescript
class BuildTimeAnalyzer {
  async analyze(data: { 
    projectPath: string;
    statsPath?: string;
  }): Promise<BuildTimeResult>
}
```

---

## 插件系统

### PluginManager

插件管理器类。

#### 构造函数

```typescript
constructor(config: AnalyzerConfig)
```

#### 方法

##### `register(plugin)`

注册插件。

```typescript
register(plugin: Plugin): void
```

##### `unregister(name)`

注销插件。

```typescript
unregister(name: string): void
```

##### `executeHook(hook, result?)`

执行钩子。

```typescript
async executeHook(
  hook: PluginHook,
  result?: Partial<AnalysisResult>
): Promise<void>
```

**示例**:
```typescript
const pluginManager = new PluginManager(config);

pluginManager.register({
  name: 'my-plugin',
  hooks: {
    [PluginHook.AfterAnalyze]: async (context) => {
      console.log('分析完成', context.result);
    }
  }
});

await pluginManager.executeHook(PluginHook.AfterAnalyze, result);
```

### PluginHook枚举

```typescript
enum PluginHook {
  BeforeAnalyze = 'before:analyze',
  AfterAnalyze = 'after:analyze',
  BeforeBundleAnalyze = 'before:bundle',
  AfterBundleAnalyze = 'after:bundle',
  BeforeDependencyAnalyze = 'before:dependency',
  AfterDependencyAnalyze = 'after:dependency',
  BeforeCodeAnalyze = 'before:code',
  AfterCodeAnalyze = 'after:code',
  BeforeReport = 'before:report',
  AfterReport = 'after:report',
}
```

### 辅助函数

#### `createPlugin(name, hook, fn)`

创建简单插件。

```typescript
function createPlugin(
  name: string,
  hook: PluginHook,
  fn: PluginHookFunction
): Plugin
```

#### `createBudgetPlugin(budgets)`

创建性能预算插件。

```typescript
function createBudgetPlugin(budgets: {
  maxBundleSize?: number;
  maxGzipSize?: number;
  maxModuleCount?: number;
  maxCircularDependencies?: number;
  maxDuplicates?: number;
}): Plugin
```

#### `createNotificationPlugin(notifier)`

创建通知插件。

```typescript
function createNotificationPlugin(
  notifier: (result: AnalysisResult) => void | Promise<void>
): Plugin
```

---

## 对比分析

### Comparator

对比分析器类。

#### 方法

##### `compare(baseline, current)`

对比两个分析结果。

```typescript
compare(
  baseline: AnalysisResult,
  current: AnalysisResult
): CompareResult
```

##### `generateReport(result)`

生成对比报告。

```typescript
generateReport(result: CompareResult): string
```

**示例**:
```typescript
const comparator = new Comparator();
const diff = comparator.compare(oldResult, newResult);

console.log(`Bundle大小变化: ${diff.bundleDiff?.totalSizeChange.percentage}%`);
console.log(`总体评分: ${diff.scoreChange}`);

const report = comparator.generateReport(diff);
console.log(report);
```

---

## 监控模式

### WatchManager

监控管理器类。

#### 构造函数

```typescript
constructor(config: AnalyzerConfig, options?: WatchOptions)
```

**选项**:
```typescript
interface WatchOptions {
  patterns?: string[];      // 监控的文件模式
  exclude?: string[];       // 排除的文件模式
  debounce?: number;        // 防抖延迟（毫秒）
  onChange?: (result: AnalysisResult) => void | Promise<void>;
  onError?: (error: Error) => void;
}
```

#### 方法

##### `start()`

开始监控。

```typescript
async start(): Promise<void>
```

##### `stop()`

停止监控。

```typescript
stop(): void
```

**示例**:
```typescript
const watcher = new WatchManager(
  { path: './dist', bundler: 'webpack' },
  {
    debounce: 1000,
    onChange: async (result) => {
      console.log('文件已更新，分析完成');
    }
  }
);

await watcher.start();

// 停止监控
// watcher.stop();
```

### 辅助函数

#### `createWatcher(config, options?)`

创建监控器。

```typescript
function createWatcher(
  config: AnalyzerConfig,
  options?: WatchOptions
): WatchManager
```

---

## 工具函数

### 文件工具 (fileUtils)

#### `fileExists(filePath)`

检查文件是否存在。

```typescript
async function fileExists(filePath: string): Promise<boolean>
```

#### `readJsonFile<T>(filePath)`

读取JSON文件。

```typescript
async function readJsonFile<T>(filePath: string): Promise<T>
```

#### `writeJsonFile(filePath, data, pretty?)`

写入JSON文件。

```typescript
async function writeJsonFile(
  filePath: string,
  data: any,
  pretty?: boolean
): Promise<void>
```

#### `formatBytes(bytes, decimals?)`

格式化字节大小。

```typescript
function formatBytes(bytes: number, decimals?: number): string
```

#### `getAllFiles(dirPath, extensions?, exclude?)`

递归获取目录下所有文件。

```typescript
async function getAllFiles(
  dirPath: string,
  extensions?: string[],
  exclude?: string[]
): Promise<string[]>
```

#### `processBatch<T>(files, processor, concurrency?)`

批量处理文件（并发）。

```typescript
async function processBatch<T>(
  files: string[],
  processor: (file: string) => Promise<T>,
  concurrency?: number
): Promise<T[]>
```

### 图算法工具 (graphUtils)

#### `detectCycles(graph)`

检测图中的循环依赖。

```typescript
function detectCycles(graph: Graph): string[][]
```

#### `topologicalSort(graph)`

拓扑排序。

```typescript
function topologicalSort(graph: Graph): string[] | null
```

#### `calculateDepths(graph, roots)`

计算节点深度。

```typescript
function calculateDepths(
  graph: Graph,
  roots: string[]
): Map<string, number>
```

### 度量工具 (metricsUtils)

#### `calculatePercentage(value, total)`

计算百分比。

```typescript
function calculatePercentage(value: number, total: number): number
```

#### `calculateAverage(values)`

计算平均值。

```typescript
function calculateAverage(values: number[]): number
```

#### `formatDuration(ms)`

格式化持续时间。

```typescript
function formatDuration(ms: number): string
```

---

## 类型定义

### AnalyzerConfig

```typescript
interface AnalyzerConfig {
  path: string;
  bundler?: BundlerType;
  output?: OutputFormat[];
  outputDir?: string;
  serve?: boolean;
  port?: number;
  open?: boolean;
  analyze?: AnalyzeOptions;
}
```

### AnalysisResult

```typescript
interface AnalysisResult {
  timestamp: number;
  projectPath: string;
  bundler: BundlerType;
  bundle?: BundleAnalysis;
  dependency?: DependencyGraph;
  code?: CodeMetrics;
  performance?: PerformanceAnalysis;
  security?: SecurityReport;
  suggestions?: OptimizationSuggestion[];
}
```

### 完整类型定义

查看 `src/types/index.ts` 获取所有类型定义。

---

## 💡 使用建议

### 1. 生产环境使用

```typescript
import { Analyzer, CacheManager, Logger, LogLevel } from '@ldesign/analyzer';

const logger = new Logger({ 
  level: LogLevel.WARN,
  file: true 
});

const cache = new CacheManager({ 
  enabled: true,
  ttl: 3600000 
});

const analyzer = new Analyzer();
```

### 2. CI/CD集成

```typescript
const result = await analyzer.analyze({ path: './dist' });

// 检查性能预算
if (result.bundle?.totalSize > 5 * 1024 * 1024) {
  throw new Error('Bundle超过5MB限制');
}
```

### 3. 开发环境

```typescript
// 使用监控模式
const watcher = createWatcher(
  { path: './dist', bundler: 'vite' },
  { 
    debounce: 1000,
    onChange: (result) => console.log('更新完成')
  }
);

await watcher.start();
```

---

## 🔗 相关文档

- [README](./README.md)
- [快速参考](./QUICK_REFERENCE.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [示例代码](./examples/)

---

**最后更新**: 2025-10-25  
**版本**: v0.2.0

