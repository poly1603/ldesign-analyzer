/**
 * HTML报告生成器
 */

import type { Reporter, AnalysisResult } from '../types';
import { writeFile } from '../utils/fileUtils';
import path from 'path';
import {
  TreeMapVisualizer,
  SunburstVisualizer,
  GraphVisualizer,
} from '../visualizers';

export class HtmlReporter implements Reporter {
  getFormat(): 'cli' | 'html' | 'json' {
    return 'html';
  }

  async generate(result: AnalysisResult): Promise<string> {
    const html = this.generateHtml(result);
    const outputPath = path.join(process.cwd(), '.analyzer-output', 'report.html');
    await writeFile(outputPath, html);
    return outputPath;
  }

  private generateHtml(result: AnalysisResult): string {
    // 生成图表配置
    const charts: any[] = [];

    if (result.bundle?.treeMapData) {
      const treeMapVis = new TreeMapVisualizer();
      charts.push({
        id: 'treemap',
        title: 'Bundle TreeMap',
        option: treeMapVis.generate(result.bundle.treeMapData),
      });
    }

    if (result.dependency) {
      const graphVis = new GraphVisualizer();
      charts.push({
        id: 'dependency-graph',
        title: '依赖关系图',
        option: graphVis.generate(result.dependency),
      });
    }

    const chartsJson = JSON.stringify(charts, null, 2);
    const resultJson = JSON.stringify(result, null, 2);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@ldesign/analyzer - 分析报告</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .card h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .chart {
      width: 100%;
      height: 600px;
      margin: 20px 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-item {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 5px;
      padding: 15px;
      margin: 10px 0;
    }
    .suggestion {
      background: #d1ecf1;
      border: 1px solid #0dcaf0;
      border-radius: 5px;
      padding: 15px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 @ldesign/analyzer</h1>
      <p>Bundle 分析报告 - 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="card">
      <h2>📦 Bundle 概览</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">总大小</div>
          <div class="stat-value">${this.formatBytes(result.bundle?.totalSize || 0)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Gzip 大小</div>
          <div class="stat-value">${this.formatBytes(result.bundle?.gzipSize || 0)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">模块数量</div>
          <div class="stat-value">${result.bundle?.modules.length || 0}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Chunk 数量</div>
          <div class="stat-value">${result.bundle?.chunks.length || 0}</div>
        </div>
      </div>
    </div>

    ${charts.map(chart => `
      <div class="card">
        <h2>${chart.title}</h2>
        <div id="${chart.id}" class="chart"></div>
      </div>
    `).join('')}

    ${result.suggestions && result.suggestions.length > 0 ? `
      <div class="card">
        <h2>💡 优化建议</h2>
        ${result.suggestions.map(s => `
          <div class="suggestion">
            <strong>[${s.impact}] ${s.title}</strong>
            <p>${s.description}</p>
            ${s.savings?.size ? `<p>预计节省: ${this.formatBytes(s.savings.size)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>

  <script>
    const charts = ${chartsJson};
    
    charts.forEach(chart => {
      const dom = document.getElementById(chart.id);
      if (dom) {
        const myChart = echarts.init(dom);
        myChart.setOption(chart.option);
        
        window.addEventListener('resize', () => {
          myChart.resize();
        });
      }
    });
  </script>
</body>
</html>`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

