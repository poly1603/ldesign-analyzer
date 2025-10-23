/**
 * Sunburst可视化器
 */

import type { Visualizer, TreeMapNode } from '../types';
import { formatBytes } from '../utils/fileUtils';

export class SunburstVisualizer implements Visualizer {
  getType(): 'treemap' | 'sunburst' | 'graph' | 'trend' {
    return 'sunburst';
  }

  generate(data: TreeMapNode): any {
    return {
      title: {
        text: 'Dependency Sunburst',
        left: 'center',
      },
      tooltip: {
        formatter: (info: any) => {
          return `${info.name}<br/>Size: ${formatBytes(info.value || 0)}`;
        },
      },
      series: [
        {
          type: 'sunburst',
          data: [data],
          radius: [0, '90%'],
          label: {
            rotate: 'radial',
          },
          itemStyle: {
            borderRadius: 7,
            borderWidth: 2,
          },
        },
      ],
    };
  }
}

