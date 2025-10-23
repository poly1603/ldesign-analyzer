/**
 * 趋势图可视化器
 */

import type { Visualizer } from '../types';

export interface TrendData {
  timestamps: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

export class TrendVisualizer implements Visualizer {
  getType(): 'treemap' | 'sunburst' | 'graph' | 'trend' {
    return 'trend';
  }

  generate(data: TrendData): any {
    return {
      title: {
        text: 'Build Size Trend',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: data.series.map(s => s.name),
        bottom: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: data.timestamps,
        },
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Size (KB)',
        },
      ],
      series: data.series.map(s => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: true,
        areaStyle: {},
      })),
    };
  }
}

