/**
 * @ldesign/analyzer - 分析工具
 */
export class BundleAnalyzer {
  analyze(bundlePath: string) { console.info(`Analyzing bundle: ${bundlePath}`); return { size: 0, modules: [] } }
}
export function createAnalyzer() { return new BundleAnalyzer() }

