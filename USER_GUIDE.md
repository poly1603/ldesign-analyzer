# 📖 @ldesign/analyzer 使用指南

**版本**: v0.2.0  
**更新日期**: 2025-10-25

本指南将帮助您充分利用 @ldesign/analyzer 的所有功能。

---

## 📚 目录

1. [快速开始](#快速开始)
2. [基础使用](#基础使用)
3. [高级功能](#高级功能)
4. [配置指南](#配置指南)
5. [最佳实践](#最佳实践)
6. [故障排查](#故障排查)
7. [性能优化](#性能优化)

---

## 快速开始

### 安装

```bash
# 使用pnpm（推荐）
pnpm add -D @ldesign/analyzer

# 使用npm
npm install -D @ldesign/analyzer

# 使用yarn
yarn add -D @ldesign/analyzer
```

### 第一次使用

```bash
# 分析当前项目
npx ldesign-analyzer analyze

# 分析指定目录
npx ldesign-analyzer analyze ./dist

# 生成HTML报告
npx ldesign-analyzer analyze --output html
```

---

## 基础使用

### CLI命令

#### 基础命令

```bash
# 分析项目
ldesign-analyzer analyze [路径] [选项]

选项:
  -b, --bundler <type>    构建工具 (webpack|rollup|vite|auto)
  -o, --output <formats>  输出格式 (cli,html,json)
  --no-bundle            跳过Bundle分析
  --no-dependency        跳过依赖分析
  --no-code              跳过代码分析
```

#### 实用示例

```bash
# 示例1: 分析Webpack项目
ldesign-analyzer analyze ./dist -b webpack -o cli,html

# 示例2: 只分析代码，不分析Bundle
ldesign-analyzer analyze --no-bundle --no-dependency

# 示例3: 生成所有格式的报告
ldesign-analyzer analyze -o cli,html,json
```

### 程序化使用

#### 基础分析

```typescript
import { Analyzer } from '@ldesign/analyzer';

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

// 生成报告
await analyzer.report(result, ['cli', 'html']);
```

#### 部分分析

```typescript
// 只分析代码，跳过Bundle和依赖
const result = await analyzer.analyze({
  path: './src',
  analyze: {
    bundle: false,
    dependency: false,
    code: true
  }
});
```

---

## 高级功能

### 1. 缓存系统

#### 启用缓存

```typescript
import { CacheManager } from '@ldesign/analyzer';

const cache = new CacheManager({
  cacheDir: './.analyzer-cache',
  defaultTTL: 3600000, // 1小时
  enabled: true
});

// 检查缓存
const cacheKey = 'analysis-result';
let result = await cache.get(cacheKey, './dist');

if (!result) {
  // 执行分析
  result = await analyzer.analyze({ path: './dist' });
  
  // 保存到缓存
  await cache.set(cacheKey, result, './dist');
}
```

#### 缓存管理

```typescript
// 获取统计
const stats = await cache.getStats();
console.log(`缓存条目: ${stats.totalEntries}`);
console.log(`总大小: ${stats.totalSize} 字节`);

// 清理过期缓存
await cache.cleanup();

// 清空所有缓存
await cache.clear();
```

### 2. 进度显示

#### 基础进度

```typescript
const result = await analyzer.analyze(
  { path: './dist' },
  (phase, progress, message) => {
    console.log(`[${phase}] ${progress.toFixed(1)}%: ${message}`);
  }
);
```

#### 自定义进度管理

```typescript
import { ProgressManager } from '@ldesign/analyzer';

const progress = new ProgressManager();

progress.start('处理文件', files.length);

for (const file of files) {
  await processFile(file);
  progress.increment(`处理: ${file}`);
}

progress.complete('处理完成');
```

#### 批处理进度

```typescript
import { withProgress } from '@ldesign/analyzer';

const results = await withProgress(
  files,
  async (file) => analyzeFile(file),
  {
    phase: '分析文件',
    concurrency: 5,
    onProgress: (info) => {
      console.log(`进度: ${info.percent.toFixed(1)}%`);
    }
  }
);
```

### 3. 错误处理

#### 使用自定义错误

```typescript
import { AnalysisError, ValidationError } from '@ldesign/analyzer';

try {
  await analyzer.analyze(config);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('配置错误:', error.getFormattedMessage());
  } else if (error instanceof AnalysisError) {
    console.error('分析失败:', error.getFormattedMessage());
  }
}
```

#### 错误恢复

```typescript
import { ErrorHandler } from '@ldesign/analyzer';

const errorHandler = ErrorHandler.getInstance();

errorHandler.registerRecoveryStrategy('my-recovery', {
  canRecover: (error) => error instanceof ParseError,
  recover: async () => {
    // 返回降级数据
    return { modules: [], chunks: [] };
  },
  description: '解析失败时使用降级数据'
});
```

#### 安全执行

```typescript
import { safeExecute, retryOnError } from '@ldesign/analyzer';

// 安全执行，失败返回默认值
const result = await safeExecute(
  () => analyzer.analyze(config),
  null,
  true
);

// 重试机制
const data = await retryOnError(
  () => fetchData(),
  3,      // 重试3次
  1000    // 间隔1秒
);
```

### 4. 日志系统

#### 基础日志

```typescript
import { Logger, LogLevel } from '@ldesign/analyzer';

const logger = new Logger({
  level: LogLevel.INFO,
  console: true,
  file: true,
  filePath: './logs/analyzer.log',
  colors: true
});

logger.info('开始分析', { path: './dist' });
logger.warn('发现警告', { count: 5 });
logger.error('分析失败', new Error('解析错误'));
```

#### 子日志器

```typescript
import { createLogger } from '@ldesign/analyzer';

const bundleLogger = createLogger('Bundle', {
  level: LogLevel.DEBUG
});

bundleLogger.info('分析开始');
// 输出: [Bundle] 分析开始
```

### 5. 插件系统

#### 性能预算插件

```typescript
import { PluginManager, createBudgetPlugin } from '@ldesign/analyzer';

const pluginManager = new PluginManager(config);

const budgetPlugin = createBudgetPlugin({
  maxBundleSize: 5 * 1024 * 1024,  // 5MB
  maxGzipSize: 1 * 1024 * 1024,    // 1MB
  maxModuleCount: 500,
  maxCircularDependencies: 0,
  maxDuplicates: 3
});

pluginManager.register(budgetPlugin);

// 执行分析，会自动检查预算
const result = await analyzer.analyze(config);
await pluginManager.executeHook(PluginHook.AfterAnalyze, result);
```

#### 自定义插件

```typescript
import { createPlugin, PluginHook } from '@ldesign/analyzer';

const customPlugin = createPlugin(
  'my-custom-plugin',
  PluginHook.AfterAnalyze,
  async (context) => {
    const result = context.result;
    
    // 自定义逻辑
    if (result?.bundle?.totalSize > 10 * 1024 * 1024) {
      console.warn('⚠️ Bundle过大！');
    }
  }
);

pluginManager.register(customPlugin);
```

#### 通知插件

```typescript
import { createNotificationPlugin } from '@ldesign/analyzer';

const notifyPlugin = createNotificationPlugin(async (result) => {
  // 发送通知到Slack、钉钉等
  await sendNotification({
    title: '分析完成',
    message: `Bundle大小: ${formatBytes(result.bundle?.totalSize || 0)}`
  });
});

pluginManager.register(notifyPlugin);
```

### 6. 对比分析

```typescript
import { Comparator } from '@ldesign/analyzer';

// 分析旧版本
const oldResult = await analyzer.analyze({ path: './dist-old' });

// 分析新版本
const newResult = await analyzer.analyze({ path: './dist-new' });

// 对比
const comparator = new Comparator();
const diff = comparator.compare(oldResult, newResult);

// 查看变化
console.log(`Bundle大小变化: ${diff.bundleDiff?.totalSizeChange.percentage}%`);
console.log(`循环依赖变化: ${diff.dependencyDiff?.circularChange.diff}`);
console.log(`总体评分: ${diff.scoreChange}`);

// 生成报告
const report = comparator.generateReport(diff);
console.log(report);
```

### 7. 监控模式

```typescript
import { createWatcher } from '@ldesign/analyzer';

const watcher = createWatcher(
  {
    path: './dist',
    bundler: 'webpack',
    analyze: {
      bundle: true,
      dependency: true
    }
  },
  {
    debounce: 2000,
    patterns: ['**/*.js', '**/*.ts'],
    exclude: ['**/node_modules/**'],
    onChange: async (result) => {
      console.log('\n文件已更新，重新分析完成');
      console.log(`Bundle大小: ${formatBytes(result.bundle?.totalSize || 0)}`);
      
      // 检查性能预算
      if (result.bundle?.totalSize > 5 * 1024 * 1024) {
        console.error('❌ Bundle超过5MB限制！');
      }
    },
    onError: (error) => {
      console.error('监控错误:', error.message);
    }
  }
);

// 开始监控
await watcher.start();

// 停止监控（可选）
// watcher.stop();
```

---

## 配置指南

### 配置文件

#### analyzer.config.ts

```typescript
// analyzer.config.ts
export default {
  path: './dist',
  bundler: 'webpack',
  output: ['cli', 'html', 'json'],
  outputDir: './.analyzer-output',
  
  analyze: {
    bundle: true,
    dependency: true,
    code: true,
    quality: true,
    performance: true,
    security: true
  },
  
  cache: {
    enabled: true,
    dir: './.analyzer-cache',
    ttl: 3600000  // 1小时
  },
  
  performance: {
    concurrency: 10,
    maxFileSize: 10 * 1024 * 1024
  },
  
  exclude: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage'
  ]
};
```

#### .analyzerrc

```json
{
  "path": "./dist",
  "bundler": "webpack",
  "output": ["cli", "html"],
  "analyze": {
    "bundle": true,
    "dependency": true,
    "code": true
  }
}
```

#### package.json

```json
{
  "name": "my-project",
  "analyzer": {
    "path": "./dist",
    "bundler": "vite",
    "output": ["html", "json"]
  }
}
```

### 环境变量

```bash
# 设置分析路径
ANALYZER_PATH=./dist

# 设置构建工具
ANALYZER_BUNDLER=webpack

# 启用调试日志
ANALYZER_LOG_LEVEL=debug
```

---

## 最佳实践

### 1. CI/CD集成

#### GitHub Actions

```yaml
name: Bundle Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build
        run: pnpm build
        
      - name: Analyze
        run: pnpm ldesign-analyzer analyze ./dist --output json
        
      - name: Check bundle size
        run: |
          node -e "
            const result = require('./.analyzer-output/analysis.json');
            if (result.bundle.totalSize > 5 * 1024 * 1024) {
              throw new Error('Bundle size exceeds 5MB limit');
            }
          "
```

#### 性能预算检查

```typescript
// scripts/check-budget.ts
import { Analyzer, createBudgetPlugin } from '@ldesign/analyzer';

const analyzer = new Analyzer();
const result = await analyzer.analyze({ path: './dist' });

// 使用插件检查
const pluginManager = new PluginManager({ path: './dist' });
const budgetPlugin = createBudgetPlugin({
  maxBundleSize: 5 * 1024 * 1024,
  maxCircularDependencies: 0
});

pluginManager.register(budgetPlugin);

try {
  await pluginManager.executeHook(PluginHook.AfterAnalyze, result);
  console.log('✅ 性能预算检查通过');
} catch (error) {
  console.error('❌ 性能预算检查失败');
  process.exit(1);
}
```

### 2. 定期分析

#### Cron任务

```bash
# 每天凌晨2点分析一次
0 2 * * * cd /path/to/project && npm run build && ldesign-analyzer analyze
```

#### 脚本

```typescript
// scripts/daily-analysis.ts
import { Analyzer, CacheManager } from '@ldesign/analyzer';

async function dailyAnalysis() {
  const analyzer = new Analyzer();
  const result = await analyzer.analyze({
    path: './dist',
    bundler: 'auto'
  });

  // 保存历史记录
  const timestamp = new Date().toISOString().split('T')[0];
  await writeJsonFile(
    `./analysis-history/${timestamp}.json`,
    result
  );

  // 生成HTML报告
  await analyzer.report(result, ['html']);
}

dailyAnalysis().catch(console.error);
```

### 3. 开发环境使用

#### 开发脚本

```json
{
  "scripts": {
    "analyze": "ldesign-analyzer analyze ./dist",
    "analyze:watch": "ldesign-analyzer analyze ./dist --watch",
    "analyze:full": "ldesign-analyzer analyze ./dist --output cli,html,json"
  }
}
```

#### 实时监控

```typescript
// dev-monitor.ts
import { createWatcher } from '@ldesign/analyzer';

const watcher = createWatcher(
  {
    path: './dist',
    bundler: 'vite',
    analyze: {
      bundle: true,
      dependency: true,
      code: true
    }
  },
  {
    debounce: 1000,
    onChange: async (result) => {
      console.clear();
      console.log('📊 实时分析结果');
      console.log(`Bundle: ${formatBytes(result.bundle?.totalSize || 0)}`);
      console.log(`模块: ${result.bundle?.modules.length || 0}`);
      
      if (result.dependency?.circular.length) {
        console.warn(`⚠️ 循环依赖: ${result.dependency.circular.length}`);
      }
    }
  }
);

await watcher.start();
```

### 4. 代码质量检查

```typescript
import {
  ComplexityAnalyzer,
  DuplicateCodeDetector,
  DeadCodeDetector,
  CodeSmellDetector
} from '@ldesign/analyzer';

async function checkCodeQuality(projectPath: string) {
  // 1. 复杂度分析
  const complexityAnalyzer = new ComplexityAnalyzer();
  const complexity = await complexityAnalyzer.analyze({ projectPath });
  
  console.log(`平均复杂度: ${complexity.averageComplexity}`);
  
  if (complexity.complexFunctions.length > 0) {
    console.warn(`发现 ${complexity.complexFunctions.length} 个复杂函数`);
  }

  // 2. 重复代码检测
  const duplicateDetector = new DuplicateCodeDetector();
  const duplicates = await duplicateDetector.analyze({ 
    projectPath,
    minLines: 5
  });
  
  console.log(`重复代码: ${duplicates.duplicatePercentage.toFixed(1)}%`);

  // 3. 死代码检测
  const deadCodeDetector = new DeadCodeDetector();
  const deadCode = await deadCodeDetector.analyze({ 
    projectPath,
    entryPoints: ['./src/index.ts']
  });
  
  console.log(`未使用导出: ${deadCode.unusedExports}`);

  // 4. 代码坏味道
  const smellDetector = new CodeSmellDetector();
  const smells = await smellDetector.analyze({ projectPath });
  
  console.log(`代码坏味道: ${smells.smells.length}`);
}
```

### 5. 安全检查

```typescript
import {
  SensitiveInfoDetector,
  VulnerabilityScanner,
  LicenseChecker
} from '@ldesign/analyzer';

async function securityCheck(projectPath: string) {
  // 1. 敏感信息检测
  const sensitiveDetector = new SensitiveInfoDetector();
  const sensitive = await sensitiveDetector.analyze({ projectPath });
  
  if (sensitive.total > 0) {
    console.error(`❌ 发现 ${sensitive.total} 处敏感信息！`);
    sensitive.findings.forEach(finding => {
      console.log(`  ${finding.type}: ${finding.file}:${finding.line}`);
    });
  }

  // 2. 漏洞扫描
  const vulnScanner = new VulnerabilityScanner();
  const vulnerabilities = await vulnScanner.analyze({ projectPath });
  
  if (vulnerabilities.bySeverity.critical > 0) {
    console.error(`❌ 发现 ${vulnerabilities.bySeverity.critical} 个严重漏洞！`);
  }

  // 3. License检查
  const licenseChecker = new LicenseChecker();
  const licenses = await licenseChecker.analyze({
    projectPath,
    allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause']
  });
  
  if (licenses.bySeverity.error > 0) {
    console.error(`❌ 发现 ${licenses.bySeverity.error} 个License问题！`);
  }
}
```

---

## 故障排查

### 常见问题

#### 1. 找不到构建输出文件

**问题**: `未找到 webpack-stats.json 文件`

**解决方案**:
```bash
# Webpack: 生成stats.json
webpack --json > webpack-stats.json

# 或在webpack.config.js中配置
const StatsWriterPlugin = require('webpack-stats-plugin').StatsWriterPlugin;

plugins: [
  new StatsWriterPlugin({
    filename: 'stats.json'
  })
]
```

#### 2. 分析速度慢

**解决方案**:

1. 启用缓存:
```typescript
const cache = new CacheManager({ enabled: true });
```

2. 减少并发数（如果内存不足）:
```typescript
// analyzer.config.ts
export default {
  performance: {
    concurrency: 5  // 降低并发数
  }
};
```

3. 排除不必要的目录:
```typescript
export default {
  exclude: [
    'node_modules',
    'test',
    'examples'
  ]
};
```

#### 3. 内存不足

**解决方案**:

1. 增加Node.js内存限制:
```bash
node --max-old-space-size=4096 ./node_modules/.bin/ldesign-analyzer analyze
```

2. 分批处理:
```typescript
// 只分析部分功能
const result = await analyzer.analyze({
  path: './dist',
  analyze: {
    bundle: true,
    dependency: false,  // 跳过
    code: false         // 跳过
  }
});
```

#### 4. 解析失败

**问题**: `解析构建输出失败`

**解决方案**:

1. 检查bundler类型:
```bash
ldesign-analyzer analyze --bundler webpack
```

2. 手动指定stats文件:
```typescript
const result = await analyzer.analyze({
  path: './custom/path/to/stats.json',
  bundler: 'webpack'
});
```

3. 只分析代码:
```bash
ldesign-analyzer analyze --no-bundle --no-dependency
```

---

## 性能优化

### 1. 启用缓存

```typescript
// 推荐配置
const cache = new CacheManager({
  enabled: true,
  dir: './.analyzer-cache',
  ttl: 3600000  // 1小时
});
```

### 2. 调整并发数

```typescript
// 根据机器性能调整
export default {
  performance: {
    concurrency: 10  // CPU核心数的1-2倍
  }
};
```

### 3. 排除不必要的文件

```typescript
export default {
  exclude: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'test',
    '__tests__',
    '*.test.ts',
    '*.spec.ts'
  ]
};
```

### 4. 使用进度回调

```typescript
// 避免频繁输出，使用节流
let lastLog = 0;
const result = await analyzer.analyze(
  config,
  (phase, progress, message) => {
    const now = Date.now();
    if (now - lastLog > 1000) {  // 每秒最多输出一次
      console.log(`${phase}: ${progress.toFixed(0)}%`);
      lastLog = now;
    }
  }
);
```

---

## 🔗 相关资源

- [API参考](./API_REFERENCE.md)
- [快速参考](./QUICK_REFERENCE.md)
- [示例代码](./examples/)
- [更新日志](./CHANGELOG_v0.2.0.md)

---

## 💡 提示和技巧

### 1. 组合使用功能

```typescript
import {
  Analyzer,
  CacheManager,
  PluginManager,
  createBudgetPlugin,
  Logger,
  LogLevel
} from '@ldesign/analyzer';

// 组合使用缓存 + 插件 + 日志
const logger = new Logger({ level: LogLevel.INFO });
const cache = new CacheManager({ enabled: true });
const pluginManager = new PluginManager(config);

pluginManager.register(createBudgetPlugin({ maxBundleSize: 5MB }));

let result = await cache.get('analysis');
if (!result) {
  result = await analyzer.analyze(config);
  await cache.set('analysis', result);
}

await pluginManager.executeHook(PluginHook.AfterAnalyze, result);
```

### 2. 自定义报告

```typescript
// 创建自定义报告
const result = await analyzer.analyze(config);

// 提取关键指标
const metrics = {
  bundleSize: result.bundle?.totalSize,
  gzipSize: result.bundle?.gzipSize,
  moduleCount: result.bundle?.modules.length,
  circularDeps: result.dependency?.circular.length,
  duplicates: result.dependency?.duplicates.length,
  codeLines: result.code?.lines.code,
  commentCoverage: result.code?.commentCoverage
};

// 生成自定义格式
const customReport = generateCustomReport(metrics);
await writeFile('./custom-report.md', customReport);
```

### 3. 多项目分析

```typescript
const projects = ['./project1', './project2', './project3'];

for (const projectPath of projects) {
  const result = await analyzer.analyze({ path: projectPath });
  
  console.log(`\n项目: ${projectPath}`);
  console.log(`Bundle: ${formatBytes(result.bundle?.totalSize || 0)}`);
  console.log(`代码行数: ${result.code?.lines.code || 0}`);
}
```

---

**最后更新**: 2025-10-25  
**版本**: v0.2.0

