# @ldesign/analyzer 示例

这个目录包含了 @ldesign/analyzer 的使用示例。

## 📚 示例列表

### 1. 基础使用 (`basic-usage.ts`)

最简单的使用方式，适合快速上手。

```bash
npx tsx examples/basic-usage.ts
```

**功能:**
- 创建分析器实例
- 执行项目分析
- 生成多种格式报告

---

### 2. 自定义分析 (`custom-analysis.ts`)

展示如何使用独立的分析器和自定义配置。

```bash
npx tsx examples/custom-analysis.ts
```

**功能:**
- 使用自定义解析器
- 独立使用 Bundle 分析器
- 独立使用依赖分析器
- 设置性能预算

---

### 3. CI/CD 集成 (`ci-integration.ts`)

在持续集成环境中使用的完整示例。

```bash
npx tsx examples/ci-integration.ts
```

**功能:**
- 性能预算检查
- 安全漏洞检测
- 生成 CI 摘要
- 自动失败/通过

---

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行示例

```bash
# 基础使用
pnpm tsx examples/basic-usage.ts

# 自定义分析
pnpm tsx examples/custom-analysis.ts

# CI/CD 集成
pnpm tsx examples/ci-integration.ts
```

---

## 📖 更多资源

- [完整文档](../README.md)
- [API 参考](../docs/api.md)
- [项目计划](../PROJECT_PLAN.md)

