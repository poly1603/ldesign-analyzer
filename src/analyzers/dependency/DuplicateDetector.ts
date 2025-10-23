/**
 * 重复依赖检测器
 */

import type { Analyzer, DuplicateDependency, ModuleInfo } from '../../types';

export class DuplicateDetector implements Analyzer {
  getName(): string {
    return 'DuplicateDetector';
  }

  async analyze(data: { modules: ModuleInfo[] }): Promise<DuplicateDependency[]> {
    const { modules } = data;

    if (!modules || modules.length === 0) {
      return [];
    }

    // 按模块名称分组（去除路径和版本）
    const moduleGroups = new Map<string, ModuleInfo[]>();

    for (const module of modules) {
      // 提取包名（处理node_modules路径）
      const pkgName = this.extractPackageName(module.name);

      if (!moduleGroups.has(pkgName)) {
        moduleGroups.set(pkgName, []);
      }
      moduleGroups.get(pkgName)!.push(module);
    }

    // 找出重复的模块
    const duplicates: DuplicateDependency[] = [];

    for (const [name, group] of moduleGroups.entries()) {
      if (group.length > 1) {
        // 提取不同的版本
        const versions = new Set(group.map(m => this.extractVersion(m.name)));
        const locations = group.map(m => m.path || m.name);
        const totalSize = group.reduce((sum, m) => sum + m.size, 0);

        duplicates.push({
          name,
          versions: Array.from(versions),
          locations,
          totalSize,
        });
      }
    }

    // 按大小排序
    duplicates.sort((a, b) => b.totalSize - a.totalSize);

    return duplicates;
  }

  /**
   * 提取包名
   */
  private extractPackageName(moduleName: string): string {
    // 处理node_modules路径
    const nodeModulesMatch = moduleName.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)/);
    if (nodeModulesMatch) {
      return nodeModulesMatch[1];
    }

    // 处理普通路径，提取基础名称
    const parts = moduleName.split('/');
    return parts[0] || moduleName;
  }

  /**
   * 提取版本号
   */
  private extractVersion(moduleName: string): string {
    // 尝试从路径中提取版本号
    const versionMatch = moduleName.match(/@([\d.]+)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    return 'unknown';
  }
}

