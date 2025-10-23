/**
 * @ldesign/analyzer - 类型定义
 */

export type BundlerType = 'webpack' | 'rollup' | 'vite' | 'auto';
export type OutputFormat = 'html' | 'json' | 'cli';

/**
 * 分析器配置
 */
export interface AnalyzerConfig {
  /** 项目路径 */
  path: string;
  /** 构建工具类型 */
  bundler?: BundlerType;
  /** 输出格式 */
  output?: OutputFormat[];
  /** 输出目录 */
  outputDir?: string;
  /** 是否启动Web服务 */
  serve?: boolean;
  /** 服务端口 */
  port?: number;
  /** 是否自动打开浏览器 */
  open?: boolean;
  /** 分析选项 */
  analyze?: AnalyzeOptions;
}

/**
 * 分析选项
 */
export interface AnalyzeOptions {
  /** 是否分析Bundle */
  bundle?: boolean;
  /** 是否分析依赖 */
  dependency?: boolean;
  /** 是否分析代码 */
  code?: boolean;
  /** 是否进行质量检查 */
  quality?: boolean;
  /** 是否进行性能分析 */
  performance?: boolean;
  /** 是否进行安全检查 */
  security?: boolean;
  /** 是否生成优化建议 */
  optimization?: boolean;
  /** 是否使用AI分析 */
  ai?: boolean;
}

/**
 * Bundle分析结果
 */
export interface BundleAnalysis {
  /** 总大小（字节） */
  totalSize: number;
  /** Gzip压缩后大小 */
  gzipSize: number;
  /** Brotli压缩后大小 */
  brotliSize?: number;
  /** 模块列表 */
  modules: ModuleInfo[];
  /** Chunk列表 */
  chunks: ChunkInfo[];
  /** 资源类型分布 */
  assetTypes: AssetTypeDistribution;
  /** TreeMap数据 */
  treeMapData: TreeMapNode;
}

/**
 * 模块信息
 */
export interface ModuleInfo {
  /** 模块ID */
  id: string;
  /** 模块名称 */
  name: string;
  /** 模块大小 */
  size: number;
  /** Gzip大小 */
  gzipSize?: number;
  /** 所属Chunk */
  chunks: string[];
  /** 依赖的模块 */
  dependencies: string[];
  /** 被依赖的模块 */
  dependents: string[];
  /** 模块路径 */
  path?: string;
}

/**
 * Chunk信息
 */
export interface ChunkInfo {
  /** Chunk ID */
  id: string;
  /** Chunk名称 */
  name: string;
  /** Chunk大小 */
  size: number;
  /** 初始chunk还是异步chunk */
  initial: boolean;
  /** 包含的模块 */
  modules: string[];
  /** 父Chunk */
  parents?: string[];
  /** 子Chunk */
  children?: string[];
}

/**
 * 资源类型分布
 */
export interface AssetTypeDistribution {
  js: AssetTypeInfo;
  css: AssetTypeInfo;
  images: AssetTypeInfo;
  fonts: AssetTypeInfo;
  other: AssetTypeInfo;
}

export interface AssetTypeInfo {
  count: number;
  size: number;
  percentage: number;
}

/**
 * TreeMap节点
 */
export interface TreeMapNode {
  name: string;
  value?: number;
  path?: string;
  children?: TreeMapNode[];
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  /** 节点列表 */
  nodes: DependencyNode[];
  /** 边列表 */
  edges: DependencyEdge[];
  /** 循环依赖 */
  circular: CircularDependency[];
  /** 重复依赖 */
  duplicates: DuplicateDependency[];
  /** 版本冲突 */
  versionConflicts: VersionConflict[];
}

export interface DependencyNode {
  id: string;
  name: string;
  version?: string;
  size?: number;
  type: 'package' | 'module';
  depth?: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type?: 'direct' | 'peer' | 'optional';
}

export interface CircularDependency {
  cycle: string[];
  severity: 'error' | 'warning';
}

export interface DuplicateDependency {
  name: string;
  versions: string[];
  locations: string[];
  totalSize: number;
}

export interface VersionConflict {
  package: string;
  versions: { version: string; requiredBy: string[] }[];
  recommended?: string;
}

/**
 * 代码度量
 */
export interface CodeMetrics {
  /** 代码行数统计 */
  lines: LinesMetrics;
  /** 文件大小分布 */
  fileSize: FileSizeDistribution;
  /** 语言分布 */
  languages: LanguageDistribution;
  /** 注释覆盖率 */
  commentCoverage: number;
  /** 代码质量指标 */
  quality?: CodeQualityMetrics;
}

export interface LinesMetrics {
  total: number;
  code: number;
  comment: number;
  blank: number;
}

export interface FileSizeDistribution {
  small: number;  // < 10KB
  medium: number; // 10KB - 100KB
  large: number;  // 100KB - 1MB
  huge: number;   // > 1MB
}

export interface LanguageDistribution {
  [language: string]: {
    files: number;
    lines: number;
    percentage: number;
  };
}

export interface CodeQualityMetrics {
  /** 平均圈复杂度 */
  averageComplexity: number;
  /** 最大圈复杂度 */
  maxComplexity: number;
  /** 复杂函数数量 */
  complexFunctions: ComplexFunction[];
  /** 重复代码 */
  duplicates: DuplicateCode[];
  /** 死代码 */
  deadCode: DeadCode[];
  /** 代码坏味道 */
  codeSmells: CodeSmell[];
}

export interface ComplexFunction {
  name: string;
  file: string;
  line: number;
  complexity: number;
}

export interface DuplicateCode {
  files: string[];
  lines: number;
  tokens: number;
  percentage: number;
}

export interface DeadCode {
  file: string;
  exports: string[];
  reason: string;
}

export interface CodeSmell {
  type: 'long-function' | 'deep-nesting' | 'too-many-parameters' | 'god-object';
  file: string;
  line?: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * 性能分析
 */
export interface PerformanceAnalysis {
  /** 构建时间 */
  buildTime?: BuildTimeMetrics;
  /** 模块解析时间 */
  moduleResolution?: ModuleResolutionMetrics;
  /** Tree-shaking效果 */
  treeShaking?: TreeShakingMetrics;
}

export interface BuildTimeMetrics {
  total: number;
  compilation: number;
  optimization: number;
  emission: number;
}

export interface ModuleResolutionMetrics {
  total: number;
  slowModules: { module: string; time: number }[];
}

export interface TreeShakingMetrics {
  eliminated: number;
  retained: number;
  effectiveness: number;
}

/**
 * 安全报告
 */
export interface SecurityReport {
  /** 漏洞列表 */
  vulnerabilities: Vulnerability[];
  /** 敏感信息 */
  sensitiveInfo: SensitiveInfo[];
  /** License问题 */
  licenseIssues: LicenseIssue[];
}

export interface Vulnerability {
  package: string;
  version: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  cve?: string;
}

export interface SensitiveInfo {
  file: string;
  line: number;
  type: 'api-key' | 'password' | 'token' | 'secret';
  pattern: string;
}

export interface LicenseIssue {
  package: string;
  license: string;
  issue: string;
  severity: 'warning' | 'error';
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  category: 'bundle' | 'code-split' | 'lazy-load' | 'compression' | 'tree-shaking';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  savings?: {
    size?: number;
    time?: number;
  };
  steps?: string[];
}

/**
 * 完整分析结果
 */
export interface AnalysisResult {
  /** 分析时间戳 */
  timestamp: number;
  /** 项目路径 */
  projectPath: string;
  /** 构建工具 */
  bundler: BundlerType;
  /** Bundle分析 */
  bundle?: BundleAnalysis;
  /** 依赖分析 */
  dependency?: DependencyGraph;
  /** 代码度量 */
  code?: CodeMetrics;
  /** 性能分析 */
  performance?: PerformanceAnalysis;
  /** 安全报告 */
  security?: SecurityReport;
  /** 优化建议 */
  suggestions?: OptimizationSuggestion[];
}

/**
 * 解析器接口
 */
export interface Parser {
  parse(path: string): Promise<ParsedData>;
  supports(path: string): boolean;
}

export interface ParsedData {
  modules: ModuleInfo[];
  chunks?: ChunkInfo[];
  dependencies?: Record<string, string[]>;
  buildInfo?: {
    time?: number;
    version?: string;
  };
}

/**
 * 分析器接口
 */
export interface Analyzer {
  analyze(data: any): Promise<any>;
  getName(): string;
}

/**
 * 可视化器接口
 */
export interface Visualizer {
  generate(data: any): any;
  getType(): 'treemap' | 'sunburst' | 'graph' | 'trend';
}

/**
 * 报告器接口
 */
export interface Reporter {
  generate(result: AnalysisResult): Promise<string | void>;
  getFormat(): OutputFormat;
}

