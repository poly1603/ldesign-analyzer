/**
 * 依赖分析核心引擎
 */

import type { DependencyGraph, ParsedData } from '../types';
import {
  DependencyGraphBuilder,
  CircularDependencyDetector,
  VersionChecker,
  DuplicateDetector,
} from '../analyzers/dependency';

export class DependencyAnalyzer {
  async analyze(data: ParsedData & { projectPath: string }): Promise<DependencyGraph> {
    const { modules, dependencies, projectPath } = data;

    // 构建依赖图
    const graphBuilder = new DependencyGraphBuilder();
    const graph = await graphBuilder.analyze({ modules, dependencies });

    // 检测循环依赖
    const circularDetector = new CircularDependencyDetector();
    const circular = await circularDetector.analyze(graph);

    // 检测重复依赖
    const duplicateDetector = new DuplicateDetector();
    const duplicates = await duplicateDetector.analyze({ modules });

    // 检查版本冲突
    const versionChecker = new VersionChecker();
    const versionConflicts = await versionChecker.analyze({ projectPath, modules });

    return {
      ...graph,
      circular,
      duplicates,
      versionConflicts,
    };
  }
}

