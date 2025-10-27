/**
 * License检查器
 * 
 * @description 检查项目依赖的License合规性
 * @module analyzers/security/LicenseChecker
 */

import type { Analyzer, LicenseIssue } from '../../types';
import { fileExists, readJsonFile } from '../../utils/fileUtils';
import { LICENSE_CATEGORIES } from '../../constants';
import { AnalysisError } from '../../errors';
import path from 'path';

/**
 * License检查结果
 */
export interface LicenseCheckResult {
  /** License问题列表 */
  issues: LicenseIssue[];
  /** 按严重程度分组 */
  bySeverity: {
    warning: number;
    error: number;
  };
  /** 按类型分组 */
  byType: {
    permissive: number;
    copyleft: number;
    proprietary: number;
    unknown: number;
  };
  /** 所有依赖的License */
  licenses: Map<string, string>;
}

/**
 * License检查器
 * 
 * @description 检查项目依赖的License是否符合要求
 * 
 * @example
 * ```typescript
 * const checker = new LicenseChecker();
 * const result = await checker.analyze({ 
 *   projectPath: './my-project',
 *   allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause']
 * });
 * 
 * console.log(`发现 ${result.issues.length} 个License问题`);
 * ```
 */
export class LicenseChecker implements Analyzer {
  /**
   * 获取分析器名称
   */
  getName(): string {
    return 'LicenseChecker';
  }

  /**
   * 检查项目依赖的License
   * 
   * @param data - 包含项目路径和允许的License列表
   * @returns License检查结果
   * @throws {AnalysisError} 当检查失败时
   */
  async analyze(data: {
    projectPath: string;
    allowedLicenses?: string[];
    blockedLicenses?: string[];
  }): Promise<LicenseCheckResult> {
    const { projectPath, allowedLicenses, blockedLicenses = [] } = data;

    try {
      // 读取package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!(await fileExists(packageJsonPath))) {
        console.warn('未找到package.json，跳过License检查');
        return this.getEmptyResult();
      }

      const packageJson = await readJsonFile(packageJsonPath);

      // 收集所有依赖
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      const issues: LicenseIssue[] = [];
      const licenses = new Map<string, string>();
      const byType = {
        permissive: 0,
        copyleft: 0,
        proprietary: 0,
        unknown: 0,
      };

      // 检查每个依赖的License
      for (const [packageName, version] of Object.entries(allDeps)) {
        const license = await this.getPackageLicense(
          projectPath,
          packageName as string
        );

        if (license) {
          licenses.set(packageName as string, license);

          // 分类License
          const category = this.categorizeLicense(license);
          byType[category]++;

          // 检查是否在允许列表中
          if (allowedLicenses && !allowedLicenses.includes(license)) {
            issues.push({
              package: packageName as string,
              license,
              issue: `License ${license} 不在允许列表中`,
              severity: 'warning',
            });
          }

          // 检查是否在禁止列表中
          if (blockedLicenses.includes(license)) {
            issues.push({
              package: packageName as string,
              license,
              issue: `License ${license} 在禁止列表中`,
              severity: 'error',
            });
          }

          // 检查Copyleft License
          if (LICENSE_CATEGORIES.copyleft.includes(license)) {
            issues.push({
              package: packageName as string,
              license,
              issue: `Copyleft License可能影响商业使用`,
              severity: 'warning',
            });
          }

          // 检查私有License
          if (LICENSE_CATEGORIES.proprietary.includes(license)) {
            issues.push({
              package: packageName as string,
              license,
              issue: `私有License可能需要特殊授权`,
              severity: 'error',
            });
          }
        } else {
          licenses.set(packageName as string, 'UNKNOWN');
          byType.unknown++;

          issues.push({
            package: packageName as string,
            license: 'UNKNOWN',
            issue: '未找到License信息',
            severity: 'warning',
          });
        }
      }

      const bySeverity = {
        warning: issues.filter(i => i.severity === 'warning').length,
        error: issues.filter(i => i.severity === 'error').length,
      };

      return {
        issues,
        bySeverity,
        byType,
        licenses,
      };
    } catch (error) {
      throw new AnalysisError(
        'License检查失败',
        { projectPath },
        error as Error
      );
    }
  }

  /**
   * 获取包的License
   * 
   * @param projectPath - 项目路径
   * @param packageName - 包名
   * @returns License字符串或null
   * @private
   */
  private async getPackageLicense(
    projectPath: string,
    packageName: string
  ): Promise<string | null> {
    // 尝试从node_modules中读取
    const packageJsonPath = path.join(
      projectPath,
      'node_modules',
      packageName,
      'package.json'
    );

    if (await fileExists(packageJsonPath)) {
      try {
        const packageJson = await readJsonFile(packageJsonPath);

        // License字段可能是字符串或对象
        if (typeof packageJson.license === 'string') {
          return packageJson.license;
        } else if (packageJson.license && typeof packageJson.license === 'object') {
          return packageJson.license.type || null;
        }

        // 检查licenses数组（旧格式）
        if (Array.isArray(packageJson.licenses) && packageJson.licenses.length > 0) {
          return packageJson.licenses[0].type || null;
        }
      } catch (error) {
        // 读取失败
      }
    }

    return null;
  }

  /**
   * 将License分类
   * 
   * @param license - License字符串
   * @returns License类别
   * @private
   */
  private categorizeLicense(
    license: string
  ): 'permissive' | 'copyleft' | 'proprietary' | 'unknown' {
    if (LICENSE_CATEGORIES.permissive.includes(license)) {
      return 'permissive';
    }
    if (LICENSE_CATEGORIES.copyleft.includes(license)) {
      return 'copyleft';
    }
    if (LICENSE_CATEGORIES.proprietary.includes(license)) {
      return 'proprietary';
    }
    return 'unknown';
  }

  /**
   * 获取空结果
   * 
   * @returns 空的License检查结果
   * @private
   */
  private getEmptyResult(): LicenseCheckResult {
    return {
      issues: [],
      bySeverity: {
        warning: 0,
        error: 0,
      },
      byType: {
        permissive: 0,
        copyleft: 0,
        proprietary: 0,
        unknown: 0,
      },
      licenses: new Map(),
    };
  }
}

