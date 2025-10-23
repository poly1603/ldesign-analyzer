/**
 * 依赖树构建器
 */

import type { Analyzer, DependencyGraph } from '../../types';

export interface DependencyTree {
  name: string;
  id: string;
  size?: number;
  children: DependencyTree[];
  depth: number;
}

export class DependencyTreeBuilder implements Analyzer {
  getName(): string {
    return 'DependencyTreeBuilder';
  }

  async analyze(data: DependencyGraph): Promise<DependencyTree[]> {
    const { nodes, edges } = data;

    if (!nodes || nodes.length === 0) {
      return [];
    }

    // 找到根节点（没有依赖者的节点）
    const hasIncomingEdge = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !hasIncomingEdge.has(n.id));

    // 如果没有根节点，选择入度最小的节点
    if (roots.length === 0 && nodes.length > 0) {
      roots.push(nodes[0]);
    }

    // 构建邻接表
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, []);
      }
      adjacency.get(edge.source)!.push(edge.target);
    }

    // 为每个根节点构建树
    const trees: DependencyTree[] = [];
    const visited = new Set<string>();

    for (const root of roots) {
      const tree = this.buildTree(root.id, nodes, adjacency, visited, 0);
      if (tree) {
        trees.push(tree);
      }
    }

    return trees;
  }

  private buildTree(
    nodeId: string,
    nodes: { id: string; name: string; size?: number }[],
    adjacency: Map<string, string[]>,
    visited: Set<string>,
    depth: number
  ): DependencyTree | null {
    // 防止无限循环
    if (depth > 20 || visited.has(nodeId)) {
      return null;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      return null;
    }

    visited.add(nodeId);

    const children: DependencyTree[] = [];
    const childIds = adjacency.get(nodeId) || [];

    for (const childId of childIds) {
      const childTree = this.buildTree(childId, nodes, adjacency, new Set(visited), depth + 1);
      if (childTree) {
        children.push(childTree);
      }
    }

    return {
      name: node.name,
      id: node.id,
      size: node.size,
      children,
      depth,
    };
  }
}

