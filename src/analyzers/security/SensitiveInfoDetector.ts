/**
 * 敏感信息检测器
 * 
 * @description 扫描代码中的敏感信息（API密钥、密码、Token等）
 * @module analyzers/security/SensitiveInfoDetector
 */

import type { Analyzer, SensitiveInfo } from '../../types';
import { getAllFiles, readFile } from '../../utils/fileUtils';
import { SENSITIVE_PATTERNS } from '../../constants';
import { AnalysisError } from '../../errors';

/**
 * 敏感信息检测结果
 */
export interface SensitiveInfoResult {
  /** 发现的敏感信息列表 */
  findings: SensitiveInfo[];
  /** 总数 */
  total: number;
  /** 按类型分组 */
  byType: Record<string, number>;
}

/**
 * 敏感信息检测器
 * 
 * @description 使用正则表达式模式检测代码中的敏感信息
 * 
 * @example
 * ```typescript
 * const detector = new SensitiveInfoDetector();
 * const result = await detector.analyze({ projectPath: './src' });
 * console.log(`发现 ${result.total} 处敏感信息`);
 * ```
 */
export class SensitiveInfoDetector implements Analyzer {
  /** 敏感信息模式 */
  private readonly patterns: Array<{
    type: SensitiveInfo['type'];
    regex: RegExp;
    description: string;
  }> = [
      {
        type: 'api-key',
        regex: /(?:api[_-]?key|apikey)[\s]*[:=][\s]*['"]([a-zA-Z0-9-_]{20,})['"]/gi,
        description: 'API密钥',
      },
      {
        type: 'token',
        regex: /(?:token|access[_-]?token|auth[_-]?token)[\s]*[:=][\s]*['"]([a-zA-Z0-9-_]{20,})['"]/gi,
        description: '访问Token',
      },
      {
        type: 'secret',
        regex: /(?:secret|api[_-]?secret|client[_-]?secret)[\s]*[:=][\s]*['"]([a-zA-Z0-9-_]{16,})['"]/gi,
        description: '密钥',
      },
      {
        type: 'password',
        regex: /(?:password|passwd|pwd)[\s]*[:=][\s]*['"]([^'"]{6,})['"]/gi,
        description: '密码',
      },
      {
        type: 'api-key',
        regex: /(?:private[_-]?key)[\s]*[:=][\s]*['"]([^'"]{20,})['"]/gi,
        description: '私钥',
      },
      {
        type: 'token',
        regex: /Authorization:\s*Bearer\s+([a-zA-Z0-9-_\.]{20,})/gi,
        description: 'Bearer Token',
      },
      {
        type: 'secret',
        regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
        description: 'RSA私钥',
      },
      {
        type: 'api-key',
        regex: /(?:aws[_-]?access[_-]?key[_-]?id)[\s]*[:=][\s]*['"]([A-Z0-9]{20})['"]/gi,
        description: 'AWS访问密钥',
      },
      {
        type: 'secret',
        regex: /(?:aws[_-]?secret[_-]?access[_-]?key)[\s]*[:=][\s]*['"]([a-zA-Z0-9/+=]{40})['"]/gi,
        description: 'AWS密钥',
      },
      {
        type: 'token',
        regex: /ghp_[a-zA-Z0-9]{36}/gi,
        description: 'GitHub个人访问令牌',
      },
      {
        type: 'token',
        regex: /gho_[a-zA-Z0-9]{36}/gi,
        description: 'GitHub OAuth令牌',
      },
    ];

  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'SensitiveInfoDetector';
  }

  /**
   * 检测项目中的敏感信息
   * 
   * @param data - 包含项目路径的数据对象
   * @returns 敏感信息检测结果
   * @throws {AnalysisError} 当检测失败时
   */
  async analyze(data: { projectPath: string }): Promise<SensitiveInfoResult> {
    const { projectPath } = data;

    try {
      // 获取所有代码文件
      const files = await getAllFiles(projectPath, [
        '.js', '.jsx', '.ts', '.tsx', '.vue',
        '.json', '.env', '.yml', '.yaml',
        '.sh', '.bash', '.config.js'
      ]);

      const findings: SensitiveInfo[] = [];
      const byType: Record<string, number> = {
        'api-key': 0,
        'password': 0,
        'token': 0,
        'secret': 0,
      };

      // 扫描每个文件
      for (const file of files) {
        try {
          // 跳过某些安全的文件
          if (this.shouldSkipFile(file)) {
            continue;
          }

          const fileFindings = await this.scanFile(file);
          findings.push(...fileFindings);

          // 统计类型
          for (const finding of fileFindings) {
            byType[finding.type] = (byType[finding.type] || 0) + 1;
          }
        } catch (error) {
          // 单个文件扫描失败时继续处理其他文件
          console.warn(`跳过文件 ${file}: ${(error as Error).message}`);
        }
      }

      return {
        findings,
        total: findings.length,
        byType,
      };
    } catch (error) {
      throw new AnalysisError(
        '敏感信息检测失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 扫描单个文件
   * 
   * @param filePath - 文件路径
   * @returns 发现的敏感信息列表
   * @private
   */
  private async scanFile(filePath: string): Promise<SensitiveInfo[]> {
    const content = await readFile(filePath);
    const lines = content.split('\n');
    const findings: SensitiveInfo[] = [];

    // 对每一行应用所有模式
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // 跳过注释行（简单判断）
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
        continue;
      }

      for (const pattern of this.patterns) {
        // 重置正则表达式的lastIndex
        pattern.regex.lastIndex = 0;

        const matches = line.matchAll(pattern.regex);
        for (const match of matches) {
          findings.push({
            file: filePath,
            line: lineIndex + 1,
            type: pattern.type,
            pattern: this.maskSensitiveValue(match[0]),
          });
        }
      }
    }

    return findings;
  }

  /**
   * 判断是否应该跳过文件
   * 
   * @param filePath - 文件路径
   * @returns 是否跳过
   * @private
   */
  private shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [
      /node_modules/,
      /\.test\./,
      /\.spec\./,
      /\.example\./,
      /\.sample\./,
      /\.md$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
    ];

    return skipPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 遮罩敏感值
   * 
   * @param value - 原始值
   * @returns 遮罩后的值
   * @private
   */
  private maskSensitiveValue(value: string): string {
    // 只显示前后几个字符
    if (value.length <= 10) {
      return '*'.repeat(value.length);
    }

    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    const middleLength = value.length - 8;

    return `${start}${'*'.repeat(Math.min(middleLength, 20))}${end}`;
  }
}


