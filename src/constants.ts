/**
 * 常量定义
 */

export const DEFAULT_CONFIG = {
  PORT: 8080,
  OUTPUT_DIR: '.analyzer-output',
  REPORT_FILENAME: 'report.html',
  JSON_FILENAME: 'analysis.json',
};

export const COMPLEXITY_THRESHOLDS = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 30,
};

export const SIZE_THRESHOLDS = {
  SMALL: 10 * 1024,      // 10KB
  MEDIUM: 100 * 1024,    // 100KB
  LARGE: 1024 * 1024,    // 1MB
};

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const SUPPORTED_EXTENSIONS = {
  CODE: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
  STYLE: ['.css', '.scss', '.sass', '.less', '.styl'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
  FONT: ['.woff', '.woff2', '.ttf', '.eot', '.otf'],
};

export const BUNDLE_FILE_PATTERNS = {
  webpack: ['webpack-stats.json', 'stats.json'],
  rollup: ['bundle.js', 'rollup-output.json'],
  vite: ['.vite/manifest.json', 'dist/manifest.json'],
};

export const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /api[_-]?secret/i,
  /password/i,
  /token/i,
  /secret[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /auth[_-]?token/i,
];

export const LICENSE_CATEGORIES = {
  permissive: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  copyleft: ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0'],
  proprietary: ['UNLICENSED'],
};

export const CODE_SMELL_THRESHOLDS = {
  LONG_FUNCTION: 50,        // 超过50行
  DEEP_NESTING: 4,          // 嵌套超过4层
  TOO_MANY_PARAMETERS: 5,   // 参数超过5个
  GOD_OBJECT: 20,           // 类方法超过20个
};

