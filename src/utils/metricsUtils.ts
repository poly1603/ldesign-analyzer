/**
 * 度量计算工具函数
 */

/**
 * 计算百分比
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}

/**
 * 计算平均值
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * 计算中位数
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * 计算标准差
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = calculateAverage(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = calculateAverage(squaredDiffs);

  return Math.sqrt(variance);
}

/**
 * 将对象按值排序
 */
export function sortByValue<T extends Record<string, number>>(obj: T, descending = true): [string, number][] {
  return Object.entries(obj).sort((a, b) => {
    return descending ? b[1] - a[1] : a[1] - b[1];
  });
}

/**
 * 获取Top N项
 */
export function getTopN<T>(items: T[], getValue: (item: T) => number, n: number): T[] {
  return [...items]
    .sort((a, b) => getValue(b) - getValue(a))
    .slice(0, n);
}

/**
 * 分组统计
 */
export function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return groups;
}

/**
 * 计算节省百分比
 */
export function calculateSavings(before: number, after: number): { absolute: number; percentage: number } {
  const absolute = before - after;
  const percentage = calculatePercentage(absolute, before);

  return { absolute, percentage };
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

/**
 * 计算文件大小等级
 */
export function getFileSizeCategory(bytes: number): 'small' | 'medium' | 'large' | 'huge' {
  const KB = 1024;
  const MB = KB * 1024;

  if (bytes < 10 * KB) {
    return 'small';
  } else if (bytes < 100 * KB) {
    return 'medium';
  } else if (bytes < MB) {
    return 'large';
  } else {
    return 'huge';
  }
}

/**
 * 计算影响程度评分
 */
export function calculateImpactScore(
  size?: number,
  frequency?: number,
  complexity?: number
): number {
  let score = 0;

  if (size !== undefined) {
    // 大小贡献 (0-40分)
    score += Math.min(40, (size / (1024 * 1024)) * 10);
  }

  if (frequency !== undefined) {
    // 频率贡献 (0-30分)
    score += Math.min(30, frequency * 3);
  }

  if (complexity !== undefined) {
    // 复杂度贡献 (0-30分)
    score += Math.min(30, complexity * 3);
  }

  return Math.round(score);
}

/**
 * 将数值转换为等级
 */
export function valueToLevel(value: number, thresholds: { low: number; medium: number; high: number }): 'low' | 'medium' | 'high' {
  if (value < thresholds.low) {
    return 'low';
  } else if (value < thresholds.medium) {
    return 'medium';
  } else {
    return 'high';
  }
}

