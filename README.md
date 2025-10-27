# @ldesign/analyzer

> 🔍 全面的代码分析工具，让代码质量可视化

## ✨ 特性

- 🔍 **代码质量分析** - 复杂度、重复代码、代码异味检测
- 📊 **依赖分析** - 依赖关系图、循环依赖检测
- 🐛 **安全扫描** - 依赖漏洞扫描和安全建议
- 📈 **趋势分析** - 代码质量趋势图表
- 📋 **自定义规则** - 可配置的分析规则
- 🎯 **技术债务** - 技术债务评估和追踪
- 📊 **可视化报告** - 交互式分析报告

## 📦 安装

```bash
npm install @ldesign/analyzer --save-dev
```

## 🚀 快速开始

### 分析代码质量

```bash
# 分析整个项目
npx ldesign-analyzer analyze

# 分析指定目录
npx ldesign-analyzer analyze src/
```

### 依赖分析

```bash
# 分析依赖关系
npx ldesign-analyzer deps

# 检查循环依赖
npx ldesign-analyzer deps --circular
```

### 安全扫描

```bash
# 扫描安全漏洞
npx ldesign-analyzer security
```

### 生成报告

```bash
# 生成完整报告
npx ldesign-analyzer report
```

## ⚙️ 配置

创建 `analyzer.config.js`：

```javascript
module.exports = {
  // 分析目录
  include: ['src/**/*.{js,ts,jsx,tsx}'],
  exclude: ['node_modules', 'dist', '**/*.test.js'],
  
  // 复杂度阈值
  complexity: {
    max: 10,
    warn: 7,
  },
  
  // 重复代码检测
  duplication: {
    minLines: 5,
    minTokens: 50,
  },
  
  // 依赖分析
  dependencies: {
    checkCircular: true,
    maxDepth: 10,
  },
  
  // 安全扫描
  security: {
    severity: ['critical', 'high', 'medium'],
  },
  
  // 报告配置
  report: {
    format: 'html', // 'html', 'json', 'markdown'
    output: 'reports',
  },
};
```

## 📊 报告示例

分析完成后，工具会生成以下报告：

- **代码质量报告** - 复杂度、可维护性指标
- **依赖关系图** - 模块依赖可视化
- **安全报告** - 漏洞列表和修复建议
- **趋势分析** - 历史数据对比

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 许可证

MIT © LDesign Team

<div align="center">

# 📊 @ldesign/analyzer

**强大的代码分析工具 - Bundle 分析、依赖关系图、代码质量、性能优化**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](./tsconfig.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[功能特性](#功能特性) • [快速开始](#快速开始) • [使用指南](#使用指南) • [API文档](#api文档)

</div>

---

## ✨ 功能特性

### 🎯 P0 核心功能（18项）

#### 📦 Bundle 分析（5项）
- ✅ Bundle 大小统计（总大小、Gzip、Brotli）
- ✅ 模块大小分析（每个模块的大小和占比）
- ✅ Chunk 分析（分组、共享chunk）
- ✅ 资源类型分布（JS/CSS/图片/字体）
- ✅ Tree-map 可视化（交互式图表）

#### 🔗 依赖分析（5项）
- ✅ 依赖关系图（DAG）
- ✅ 循环依赖检测
- ✅ 依赖树可视化
- ✅ 依赖版本检查
- ✅ 重复依赖检测

#### 💻 代码分析（4项）
- ✅ 代码行数统计（总/有效/注释）
- ✅ 文件大小分布
- ✅ 代码语言分布（TS/JS/Vue/React）
- ✅ 注释覆盖率

#### 🎨 可视化（4项）
- ✅ Tree-map 图表（ECharts）
- ✅ Sunburst 图表（ECharts）
- ✅ 依赖关系图（ECharts Graph）
- ✅ 趋势图表（ECharts Line/Bar）

### 🚀 P1 高级功能（16项）

#### 💎 代码质量（4项）
- ✅ 代码复杂度分析（Cyclomatic）
- ✅ 重复代码检测
- ✅ 未使用代码检测（Dead Code）
- ✅ 代码坏味道检测

#### ⚡ 性能分析（4项）
- ✅ 打包时间分析
- ✅ 模块解析时间
- ✅ Tree-shaking 效果
- ✅ 代码分割建议

#### 🛡️ 安全检查（3项）
- ✅ 依赖漏洞扫描
- ✅ 敏感信息检测
- ✅ License 合规检查

#### 💡 优化建议（5项）
- ✅ Bundle 优化建议
- ✅ 代码分割建议
- ✅ 懒加载建议
- ✅ 压缩优化建议

### 🤖 P2 扩展功能（10项）

- ✅ AI 优化建议（智能分析）
- ✅ 性能瓶颈检测
- ✅ 自动优化（代码重构建议）
- ✅ 对比分析（版本对比）
- ✅ Web 分析服务
- ✅ 实时分析推送

---

## 🚀 快速开始

### 安装

```bash
# 使用 pnpm
pnpm add -D @ldesign/analyzer

# 使用 npm
npm install -D @ldesign/analyzer

# 使用 yarn
yarn add -D @ldesign/analyzer
```

### 基础使用

```bash
# 分析当前项目
ldesign-analyzer analyze

# 分析指定项目
ldesign-analyzer analyze ./my-project

# 指定构建工具
ldesign-analyzer analyze --bundler webpack

# 生成 HTML 报告
ldesign-analyzer analyze --output html,json
```

---

## 📖 使用指南

### CLI 命令

```bash
ldesign-analyzer analyze [path] [options]

选项:
  -b, --bundler <type>    构建工具类型 (webpack|rollup|vite|auto)
  -o, --output <formats>  输出格式 (cli,html,json)
  --no-bundle            跳过 Bundle 分析
  --no-dependency        跳过依赖分析
  --no-code              跳过代码分析

示例:
  ldesign-analyzer analyze                          # 分析当前目录
  ldesign-analyzer analyze ./dist                   # 分析指定目录
  ldesign-analyzer analyze -b webpack -o html       # 指定工具和输出
  ldesign-analyzer analyze --no-dependency          # 跳过依赖分析
```

### 程序化使用

```typescript
import { Analyzer } from '@ldesign/analyzer';

const analyzer = new Analyzer();

// 执行分析
const result = await analyzer.analyze({
  path: './my-project',
  bundler: 'webpack',
  analyze: {
    bundle: true,
    dependency: true,
    code: true,
  },
});

// 生成报告
await analyzer.report(result, ['cli', 'html', 'json']);
```

### 配置文件

创建 `analyzer.config.js`:

```javascript
export default {
  bundler: 'webpack',
  output: ['cli', 'html'],
  analyze: {
    bundle: true,
    dependency: true,
    code: true,
    quality: true,
    security: true,
  },
};
```

---

## 📊 输出格式

### CLI 输出

终端显示彩色表格和统计信息：

```
📦 Bundle 分析
─────────────────────────
总大小: 2.3 MB
Gzip大小: 756 KB
模块数量: 245
Chunk数量: 12

🔗 依赖分析
─────────────────────────
节点数量: 156
⚠️  发现 3 个循环依赖
⚠️  发现 5 个重复依赖
```

### HTML 报告

生成交互式 HTML 报告，包含：
- 📊 ECharts 交互式图表
- 🗺️ Tree-map 可视化
- 🕸️ 依赖关系图
- 📈 趋势分析
- 💡 优化建议

### JSON 输出

完整的 JSON 格式数据，可用于：
- CI/CD 集成
- 自定义分析
- 数据持久化
- 趋势追踪

---

## 🔧 支持的构建工具

| 工具 | 状态 | 说明 |
|------|------|------|
| Webpack | ✅ | 完全支持，读取 `stats.json` |
| Rollup | ✅ | 完全支持，分析输出目录 |
| Vite | ✅ | 完全支持，读取 `manifest.json` |

---

## 🎯 最佳实践

### 1. CI/CD 集成

```yaml
# .github/workflows/analyze.yml
name: Bundle Analysis
on: [push]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pnpm install
      - run: pnpm build
      - run: ldesign-analyzer analyze --output json
```

### 2. 性能预算

```typescript
const result = await analyzer.analyze({ path: './dist' });

if (result.bundle.totalSize > 1024 * 1024 * 5) {
  throw new Error('Bundle 超过 5MB 限制');
}
```

### 3. 定期分析

建议在以下场景运行分析：
- 每次 PR 提交
- 发布前检查
- 定期性能审计
- 重构后验证

---

## 📚 API 文档

### Analyzer

主分析器类。

#### `analyze(config: AnalyzerConfig): Promise<AnalysisResult>`

执行项目分析。

**参数:**
- `config.path` - 项目路径
- `config.bundler` - 构建工具类型
- `config.analyze` - 分析选项

**返回:**
- `AnalysisResult` - 分析结果对象

#### `report(result: AnalysisResult, formats: OutputFormat[]): Promise<void>`

生成分析报告。

**参数:**
- `result` - 分析结果
- `formats` - 输出格式数组

---

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)。

---

## 📄 许可证

MIT © LDesign Team

---

## 🔗 相关资源

- [项目计划](./PROJECT_PLAN.md)
- [更新日志](./CHANGELOG.md)
- [问题反馈](https://github.com/ldesign/analyzer/issues)






