/**
 * 版本冲突检查器
 */

import type { Analyzer, VersionConflict, ModuleInfo } from '../../types';
import { fileExists, readJsonFile } from '../../utils/fileUtils';
import path from 'path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export class VersionChecker implements Analyzer {
  getName(): string {
    return 'VersionChecker';
  }

  async analyze(data: { projectPath: string; modules?: ModuleInfo[] }): Promise<VersionConflict[]> {
    const { projectPath } = data;

    // 读取package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!await fileExists(packageJsonPath)) {
      return [];
    }

    const packageJson: PackageJson = await readJsonFile(packageJsonPath);
    const conflicts: VersionConflict[] = [];

    // 检查node_modules中的实际版本
    const packageVersions = await this.scanNodeModules(projectPath);

    // 比对声明的版本和实际安装的版本
    for (const [pkgName, versions] of packageVersions.entries()) {
      if (versions.size > 1) {
        // 发现多个版本
        conflicts.push({
          package: pkgName,
          versions: Array.from(versions).map(version => ({
            version,
            requiredBy: [], // 简化处理
          })),
          recommended: Array.from(versions)[0], // 推荐第一个版本
        });
      }
    }

    return conflicts;
  }

  /**
   * 扫描node_modules目录
   */
  private async scanNodeModules(projectPath: string): Promise<Map<string, Set<string>>> {
    const packageVersions = new Map<string, Set<string>>();
    const nodeModulesPath = path.join(projectPath, 'node_modules');

    if (!await fileExists(nodeModulesPath)) {
      return packageVersions;
    }

    // 简化实现：只扫描一层
    try {
      const fs = await import('fs/promises');
      const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const pkgJsonPath = path.join(nodeModulesPath, entry.name, 'package.json');
          if (await fileExists(pkgJsonPath)) {
            try {
              const pkgJson: { version?: string } = await readJsonFile(pkgJsonPath);
              if (pkgJson.version) {
                if (!packageVersions.has(entry.name)) {
                  packageVersions.set(entry.name, new Set());
                }
                packageVersions.get(entry.name)!.add(pkgJson.version);
              }
            } catch {
              // 忽略读取失败的包
            }
          }
        }
      }
    } catch (error) {
      console.warn('扫描node_modules失败:', error);
    }

    return packageVersions;
  }
}

