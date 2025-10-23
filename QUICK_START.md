# 🚀 @ldesign/analyzer 快速开始

> 5分钟快速上手指南

## 1️⃣ 安装

```bash
# 使用 pnpm（推荐）
pnpm add -D @ldesign/analyzer

# 使用 npm
npm install -D @ldesign/analyzer

# 使用 yarn
yarn add -D @ldesign/analyzer
```

## 2️⃣ 快速使用

### 方式一：CLI 命令行

```bash
# 分析当前项目
npx ldesign-analyzer analyze

# 生成 HTML 报告
npx ldesign-analyzer analyze --output html

# 指定构建工具
npx ldesign-analyzer analyze --bundler webpack
```

### 方式二：程序化使用

```typescript
import { Analyzer } from '@ldesign/analyzer';

const analyzer = new Analyzer();

const result = await analyzer.analyze({
  path: './my-project',
  bundler: 'webpack',
});

await analyzer.report(result, ['cli', 'html']);
```

## 3️⃣ 查看报告

分析完成后，报告会生成在 `.analyzer-output/` 目录：

```
.analyzer-output/
├── report.html      # 📊 交互式 HTML 报告
├── analysis.json    # 📝 JSON 数据
└── summary.json     # 📋 摘要信息
```

**打开 HTML 报告:**

```bash
# Windows
start .analyzer-output/report.html

# macOS
open .analyzer-output/report.html

# Linux
xdg-open .analyzer-output/report.html
```

## 4️⃣ 常用命令

```bash
# 完整分析
ldesign-analyzer analyze

# 只分析 Bundle
ldesign-analyzer analyze --no-dependency --no-code

# 跳过依赖分析
ldesign-analyzer analyze --no-dependency

# 多种输出格式
ldesign-analyzer analyze -o cli,html,json

# 指定项目路径
ldesign-analyzer analyze ./dist
```

## 5️⃣ CI/CD 集成

### GitHub Actions

```yaml
# .github/workflows/analyze.yml
name: Bundle Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: pnpm ldesign-analyzer analyze -o json
      - uses: actions/upload-artifact@v2
        with:
          name: analysis-report
          path: .analyzer-output/
```

### 性能预算检查

```typescript
import { Analyzer } from '@ldesign/analyzer';

const analyzer = new Analyzer();
const result = await analyzer.analyze({ path: './dist' });

// 检查大小限制
if (result.bundle.totalSize > 5 * 1024 * 1024) {
  throw new Error('Bundle 超过 5MB 限制');
}

// 检查循环依赖
if (result.dependency.circular.length > 5) {
  throw new Error('循环依赖过多');
}
```

## 6️⃣ 配置文件（可选）

创建 `analyzer.config.js`:

```javascript
export default {
  bundler: 'webpack',
  output: ['cli', 'html'],
  analyze: {
    bundle: true,
    dependency: true,
    code: true,
  },
  budgets: {
    maxBundleSize: 5 * 1024 * 1024, // 5MB
    maxCircularDeps: 5,
  },
};
```

## 🎯 下一步

- 📖 阅读[完整文档](./README.md)
- 🔍 查看[示例代码](./examples/)
- 💡 了解[最佳实践](./README.md#最佳实践)
- 🐛 [报告问题](https://github.com/ldesign/analyzer/issues)

---

**祝您使用愉快！** 🎉

