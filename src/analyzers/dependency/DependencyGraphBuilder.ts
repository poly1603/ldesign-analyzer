/**
 * 依赖关系图构建器
 */

import type { Analyzer, DependencyGraph, DependencyNode, DependencyEdge, ModuleInfo } from '../../types';

export class DependencyGraphBuilder implements Analyzer {
  getName(): string {
    return 'DependencyGraphBuilder';
  }

  async analyze(data: { modules: ModuleInfo[]; dependencies?: Record<string, string[]> }): Promise<DependencyGraph> {
    const { modules, dependencies = {} } = data;

    if (!modules || modules.length === 0) {
      return {
        nodes: [],
        edges: [],
        circular: [],
        duplicates: [],
        versionConflicts: [],
      };
    }

    // 构建节点
    const nodes: DependencyNode[] = modules.map(m => ({
      id: m.id,
      name: m.name,
      size: m.size,
      type: m.name.includes('node_modules') ? 'package' : 'module',
    }));

    // 构建边
    const edges: DependencyEdge[] = [];
    const edgeSet = new Set<string>(); // 用于去重

    for (const module of modules) {
      for (const depName of module.dependencies) {
        const depModule = modules.find(m => m.name === depName || m.id === depName);
        if (depModule) {
          const edgeKey = `${module.id}->${depModule.id}`;
          if (!edgeSet.has(edgeKey)) {
            edges.push({
              source: module.id,
              target: depModule.id,
              type: 'direct',
            });
            edgeSet.add(edgeKey);
          }
        }
      }
    }

    return {
      nodes,
      edges,
      circular: [], // 由CircularDependencyDetector填充
      duplicates: [], // 由DuplicateDetector填充
      versionConflicts: [], // 由VersionChecker填充
    };
  }
}

