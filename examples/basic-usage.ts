/**
 * @ldesign/analyzer 基础使用示例
 */

import { Analyzer } from '@ldesign/analyzer';

async function basicExample() {
  console.log('🔍 开始分析项目...\n');

  // 创建分析器实例
  const analyzer = new Analyzer();

  // 执行分析
  const result = await analyzer.analyze({
    path: './my-project',
    bundler: 'webpack', // 或 'rollup', 'vite', 'auto'
    analyze: {
      bundle: true,
      dependency: true,
      code: true,
    },
  });

  // 生成多种格式的报告
  await analyzer.report(result, ['cli', 'html', 'json']);

  console.log('\n✅ 分析完成！');
}

// 运行示例
basicExample().catch(console.error);

