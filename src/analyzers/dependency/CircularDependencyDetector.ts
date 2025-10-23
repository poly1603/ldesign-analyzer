/**
 * 循环依赖检测器
 */

import type { Analyzer, CircularDependency, DependencyGraph } from '../../types';
import { detectCycles } from '../../utils/graphUtils';

export class CircularDependencyDetector implements Analyzer {
  getName(): string {
    return 'CircularDependencyDetector';
  }

  async analyze(data: DependencyGraph): Promise<CircularDependency[]> {
    const { nodes, edges } = data;

    if (!nodes || nodes.length === 0) {
      return [];
    }

    // 使用图工具检测循环
    const cycles = detectCycles({ nodes, edges });

    // 转换为CircularDependency格式
    return cycles.map(cycle => ({
      cycle,
      severity: cycle.length > 5 ? 'error' : 'warning',
    }));
  }
}

