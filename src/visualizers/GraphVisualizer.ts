/**
 * 依赖关系图可视化器
 */

import type { Visualizer, DependencyGraph } from '../types';

export class GraphVisualizer implements Visualizer {
  getType(): 'treemap' | 'sunburst' | 'graph' | 'trend' {
    return 'graph';
  }

  generate(data: DependencyGraph): any {
    const { nodes, edges } = data;

    // 转换节点格式
    const graphNodes = nodes.map(n => ({
      id: n.id,
      name: n.name,
      symbolSize: Math.max(20, Math.min(100, (n.size || 0) / 1000)),
      category: n.type,
      value: n.size,
    }));

    // 转换边格式
    const graphEdges = edges.map(e => ({
      source: e.source,
      target: e.target,
      lineStyle: {
        type: e.type === 'peer' ? 'dashed' : 'solid',
      },
    }));

    return {
      title: {
        text: 'Dependency Graph',
        left: 'center',
      },
      tooltip: {},
      legend: [
        {
          data: ['package', 'module'],
          orient: 'vertical',
          left: 'right',
        },
      ],
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: graphNodes,
          edges: graphEdges,
          categories: [
            { name: 'package' },
            { name: 'module' },
          ],
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
          },
          labelLayout: {
            hideOverlap: true,
          },
          scaleLimit: {
            min: 0.4,
            max: 2,
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3,
          },
          force: {
            repulsion: 2000,
            edgeLength: [100, 300],
          },
        },
      ],
    };
  }
}

