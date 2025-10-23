# 贡献指南

感谢您对 @ldesign/analyzer 的关注！我们欢迎任何形式的贡献。

## 🚀 快速开始

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/ldesign/packages.git
cd packages/tools/analyzer

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test
```

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
feat(bundle): 添加 Brotli 压缩大小统计

- 实现 Brotli 压缩算法
- 更新 BundleSizeAnalyzer
- 添加相关测试

Closes #123
```

## 🔧 代码规范

### TypeScript

- 使用 TypeScript 严格模式
- 所有公共 API 必须有类型定义
- 优先使用 interface 而不是 type

### 代码风格

```typescript
// ✅ 好
export class BundleAnalyzer implements Analyzer {
  async analyze(data: ParsedData): Promise<BundleAnalysis> {
    // ...
  }
}

// ❌ 不好
export class BundleAnalyzer {
  analyze(data) {
    // ...
  }
}
```

## 🧪 测试

- 所有新功能必须有测试
- 测试覆盖率保持在 80% 以上
- 使用 Vitest 编写测试

```typescript
import { describe, it, expect } from 'vitest';
import { BundleAnalyzer } from '../src/analyzers/bundle';

describe('BundleAnalyzer', () => {
  it('should analyze bundle correctly', async () => {
    const analyzer = new BundleAnalyzer();
    const result = await analyzer.analyze(mockData);
    expect(result.totalSize).toBeGreaterThan(0);
  });
});
```

## 📚 文档

- 更新相关的 README
- 添加 JSDoc 注释
- 更新 CHANGELOG

## 🐛 报告问题

提交 Issue 时请包含：

1. 问题描述
2. 复现步骤
3. 预期行为
4. 实际行为
5. 环境信息（Node版本、OS等）

## 💡 提交 PR

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

### PR 检查清单

- [ ] 代码通过 lint 检查
- [ ] 测试全部通过
- [ ] 添加了必要的文档
- [ ] 更新了 CHANGELOG
- [ ] 提交信息符合规范

## 📧 联系方式

- Issue: https://github.com/ldesign/packages/issues
- Email: team@ldesign.dev

感谢您的贡献！ 🎉

