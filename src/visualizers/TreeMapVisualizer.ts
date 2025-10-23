/**
 * TreeMap可视化器
 */

import type { Visualizer, TreeMapNode } from '../types';
import { formatBytes } from '../utils/fileUtils';

export class TreeMapVisualizer implements Visualizer {
  getType(): 'treemap' | 'sunburst' | 'graph' | 'trend' {
    return 'treemap';
  }

  generate(data: TreeMapNode): any {
    return {
      title: {
        text: 'Bundle Size TreeMap',
        left: 'center',
      },
      tooltip: {
        formatter: (info: any) => {
          const value = info.value;
          return `${info.name}<br/>Size: ${formatBytes(value)}`;
        },
      },
      series: [
        {
          type: 'treemap',
          data: [data],
          label: {
            show: true,
            formatter: '{b}',
          },
          upperLabel: {
            show: true,
            height: 30,
          },
          itemStyle: {
            borderColor: '#fff',
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 0,
                gapWidth: 5,
              },
            },
            {
              itemStyle: {
                gapWidth: 1,
              },
            },
            {
              colorSaturation: [0.35, 0.5],
              itemStyle: {
                gapWidth: 1,
                borderColorSaturation: 0.6,
              },
            },
          ],
        },
      ],
    };
  }
}

