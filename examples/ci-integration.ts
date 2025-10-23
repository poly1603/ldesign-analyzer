/**
 * CI/CD 集成示例
 */

import { Analyzer } from '@ldesign/analyzer';
import { writeFileSync } from 'fs';

async function ciIntegrationExample() {
  const analyzer = new Analyzer();

  // 分析项目
  const result = await analyzer.analyze({
    path: './dist',
    bundler: 'auto',
    analyze: {
      bundle: true,
      dependency: true,
      code: true,
      security: true,
    },
  });

  // 检查性能预算
  const budgets = {
    maxBundleSize: 5 * 1024 * 1024, // 5MB
    maxGzipSize: 1.5 * 1024 * 1024, // 1.5MB
    maxCircularDeps: 5,
    maxVulnerabilities: 0,
  };

  let exitCode = 0;

  if (result.bundle) {
    if (result.bundle.totalSize > budgets.maxBundleSize) {
      console.error(`❌ Bundle 超过限制: ${result.bundle.totalSize} > ${budgets.maxBundleSize}`);
      exitCode = 1;
    }
    if (result.bundle.gzipSize > budgets.maxGzipSize) {
      console.error(`❌ Gzip 超过限制: ${result.bundle.gzipSize} > ${budgets.maxGzipSize}`);
      exitCode = 1;
    }
  }

  if (result.dependency) {
    if (result.dependency.circular.length > budgets.maxCircularDeps) {
      console.error(`❌ 循环依赖过多: ${result.dependency.circular.length} > ${budgets.maxCircularDeps}`);
      exitCode = 1;
    }
  }

  if (result.security) {
    const criticalVulns = result.security.vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > budgets.maxVulnerabilities) {
      console.error(`❌ 发现严重漏洞: ${criticalVulns.length}`);
      exitCode = 1;
    }
  }

  // 生成报告
  await analyzer.report(result, ['json', 'html']);

  // 写入 CI 总结
  const summary = {
    bundleSize: result.bundle?.totalSize || 0,
    gzipSize: result.bundle?.gzipSize || 0,
    modules: result.bundle?.modules.length || 0,
    circularDeps: result.dependency?.circular.length || 0,
    vulnerabilities: result.security?.vulnerabilities.length || 0,
    passed: exitCode === 0,
  };

  writeFileSync('.analyzer-output/summary.json', JSON.stringify(summary, null, 2));

  if (exitCode === 0) {
    console.log('✅ 所有检查通过！');
  } else {
    console.error('❌ 检查失败，请查看详细报告');
  }

  process.exit(exitCode);
}

ciIntegrationExample().catch((error) => {
  console.error('分析失败:', error);
  process.exit(1);
});

