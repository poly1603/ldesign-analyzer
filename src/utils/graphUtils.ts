/**
 * 图算法工具函数
 */

export interface GraphNode {
  id: string;
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  [key: string]: any;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * 检测图中的循环依赖
 */
export function detectCycles(graph: Graph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  // 构建邻接表
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        // 找到循环
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }

    recStack.delete(node);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return cycles;
}

/**
 * 拓扑排序
 */
export function topologicalSort(graph: Graph): string[] | null {
  const result: string[] = [];
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 初始化入度
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // 构建邻接表和计算入度
  for (const edge of graph.edges) {
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // 找到所有入度为0的节点
  const queue: string[] = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // 如果结果长度不等于节点数，说明有循环
  if (result.length !== graph.nodes.length) {
    return null;
  }

  return result;
}

/**
 * 计算节点的深度（从根节点开始）
 */
export function calculateDepths(graph: Graph, roots: string[]): Map<string, number> {
  const depths = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 构建邻接表
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  // BFS计算深度
  const queue: Array<{ node: string; depth: number }> = roots.map(root => ({ node: root, depth: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;

    if (visited.has(node)) continue;
    visited.add(node);

    depths.set(node, depth);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }

  return depths;
}

/**
 * 查找两个节点之间的所有路径
 */
export function findAllPaths(graph: Graph, start: string, end: string, maxDepth = 10): string[][] {
  const paths: string[][] = [];
  const adjacency = new Map<string, string[]>();

  // 构建邻接表
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  function dfs(current: string, target: string, path: string[], visited: Set<string>, depth: number): void {
    if (depth > maxDepth) return;

    if (current === target) {
      paths.push([...path, current]);
      return;
    }

    visited.add(current);
    const neighbors = adjacency.get(current) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, target, [...path, current], new Set(visited), depth + 1);
      }
    }
  }

  dfs(start, end, [], new Set(), 0);
  return paths;
}

/**
 * 计算节点的中心性（被依赖的次数）
 */
export function calculateCentrality(graph: Graph): Map<string, number> {
  const centrality = new Map<string, number>();

  // 初始化
  for (const node of graph.nodes) {
    centrality.set(node.id, 0);
  }

  // 计算入度作为中心性指标
  for (const edge of graph.edges) {
    centrality.set(edge.target, (centrality.get(edge.target) || 0) + 1);
  }

  return centrality;
}

/**
 * 找到图中的强连通分量
 */
export function findStronglyConnectedComponents(graph: Graph): string[][] {
  const components: string[][] = [];
  const visited = new Set<string>();
  const stack: string[] = [];
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  // 构建邻接表和反向邻接表
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
    reverseAdjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)!.push(edge.target);
    reverseAdjacency.get(edge.target)!.push(edge.source);
  }

  // 第一次DFS，填充栈
  function dfs1(node: string): void {
    visited.add(node);
    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs1(neighbor);
      }
    }
    stack.push(node);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs1(node.id);
    }
  }

  // 第二次DFS，在反向图上
  visited.clear();

  function dfs2(node: string, component: string[]): void {
    visited.add(node);
    component.push(node);
    const neighbors = reverseAdjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs2(neighbor, component);
      }
    }
  }

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (!visited.has(node)) {
      const component: string[] = [];
      dfs2(node, component);
      if (component.length > 1) {
        components.push(component);
      }
    }
  }

  return components;
}

