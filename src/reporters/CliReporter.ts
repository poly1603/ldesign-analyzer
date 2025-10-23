/**
 * CLI报告生成器
 */

import type { Reporter, AnalysisResult } from '../types';
import { formatBytes } from '../utils/fileUtils';

export class CliReporter implements Reporter {
  getFormat(): 'cli' | 'html' | 'json' {
    return 'cli';
  }

  async generate(result: AnalysisResult): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊  分析报告');
    console.log('='.repeat(60) + '\n');

    // Bundle分析
    if (result.bundle) {
      console.log('📦 Bundle 分析');
      console.log('─'.repeat(60));
      console.log(`总大小: ${formatBytes(result.bundle.totalSize)}`);
      console.log(`Gzip大小: ${formatBytes(result.bundle.gzipSize)}`);
      console.log(`模块数量: ${result.bundle.modules.length}`);
      console.log(`Chunk数量: ${result.bundle.chunks.length}`);

      console.log('\n最大的模块 (Top 5):');
      result.bundle.modules
        .sort((a, b) => b.size - a.size)
        .slice(0, 5)
        .forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.name}: ${formatBytes(m.size)}`);
        });
      console.log('');
    }

    // 依赖分析
    if (result.dependency) {
      console.log('🔗 依赖分析');
      console.log('─'.repeat(60));
      console.log(`节点数量: ${result.dependency.nodes.length}`);
      console.log(`边数量: ${result.dependency.edges.length}`);

      if (result.dependency.circular.length > 0) {
        console.log(`⚠️  发现 ${result.dependency.circular.length} 个循环依赖`);
      }

      if (result.dependency.duplicates.length > 0) {
        console.log(`⚠️  发现 ${result.dependency.duplicates.length} 个重复依赖`);
        result.dependency.duplicates.slice(0, 3).forEach(d => {
          console.log(`  - ${d.name}: ${d.versions.length} 个版本`);
        });
      }
      console.log('');
    }

    // 代码分析
    if (result.code) {
      console.log('💻 代码分析');
      console.log('─'.repeat(60));
      console.log(`总行数: ${result.code.lines.total.toLocaleString()}`);
      console.log(`代码行数: ${result.code.lines.code.toLocaleString()}`);
      console.log(`注释行数: ${result.code.lines.comment.toLocaleString()}`);
      console.log(`空白行数: ${result.code.lines.blank.toLocaleString()}`);
      console.log(`注释覆盖率: ${result.code.commentCoverage.toFixed(2)}%`);

      console.log('\n语言分布:');
      Object.entries(result.code.languages)
        .sort((a, b) => b[1].lines - a[1].lines)
        .slice(0, 5)
        .forEach(([lang, stats]) => {
          console.log(`  ${lang}: ${stats.lines.toLocaleString()} 行 (${stats.percentage.toFixed(1)}%)`);
        });
      console.log('');
    }

    // 安全报告
    if (result.security && result.security.vulnerabilities.length > 0) {
      console.log('🛡️ 安全报告');
      console.log('─'.repeat(60));
      console.log(`⚠️  发现 ${result.security.vulnerabilities.length} 个安全漏洞`);

      const bySeverity = {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
      };

      result.security.vulnerabilities.forEach(v => {
        bySeverity[v.severity]++;
      });

      if (bySeverity.critical > 0) console.log(`  🔴 严重: ${bySeverity.critical}`);
      if (bySeverity.high > 0) console.log(`  🟠 高危: ${bySeverity.high}`);
      if (bySeverity.moderate > 0) console.log(`  🟡 中危: ${bySeverity.moderate}`);
      if (bySeverity.low > 0) console.log(`  🟢 低危: ${bySeverity.low}`);
      console.log('');
    }

    // 优化建议
    if (result.suggestions && result.suggestions.length > 0) {
      console.log('💡 优化建议');
      console.log('─'.repeat(60));
      result.suggestions.slice(0, 5).forEach((s, i) => {
        console.log(`${i + 1}. [${s.impact}] ${s.title}`);
        console.log(`   ${s.description}`);
        if (s.savings?.size) {
          console.log(`   预计节省: ${formatBytes(s.savings.size)}`);
        }
      });
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ 分析完成\n');
  }
}

