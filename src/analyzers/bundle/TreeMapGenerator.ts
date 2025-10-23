/**
 * TreeMap数据生成器
 */

import type { Analyzer, ModuleInfo, TreeMapNode } from '../../types';
import path from 'path';

export class TreeMapGenerator implements Analyzer {
  getName(): string {
    return 'TreeMapGenerator';
  }

  async analyze(data: { modules: ModuleInfo[] }): Promise<TreeMapNode> {
    const { modules } = data;

    if (!modules || modules.length === 0) {
      return {
        name: 'root',
        value: 0,
        children: [],
      };
    }

    const root: TreeMapNode = {
      name: 'root',
      children: [],
    };

    // 按路径构建树
    for (const module of modules) {
      this.addModuleToTree(root, module);
    }

    // 计算节点值（自底向上）
    this.calculateNodeValues(root);

    return root;
  }

  /**
   * 将模块添加到树中
   */
  private addModuleToTree(root: TreeMapNode, module: ModuleInfo): void {
    const modulePath = module.path || module.name;

    // 清理路径
    let cleanPath = modulePath
      .replace(/^\.\//, '')
      .replace(/^node_modules\//, 'node_modules/')
      .replace(/\\/g, '/');

    // 分割路径
    const parts = cleanPath.split('/').filter(Boolean);

    if (parts.length === 0) {
      return;
    }

    let current = root;
    let currentPath = '';

    // 遍历路径的每一部分
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!current.children) {
        current.children = [];
      }

      // 查找是否已存在该节点
      let child = current.children.find(c => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          children: [],
        };
        current.children.push(child);
      }

      // 如果是最后一部分，设置值
      if (i === parts.length - 1) {
        child.value = module.size;
        // 叶子节点不需要children
        if (child.children && child.children.length === 0) {
          delete child.children;
        }
      }

      current = child;
    }
  }

  /**
   * 计算节点值（自底向上累加）
   */
  private calculateNodeValues(node: TreeMapNode): number {
    if (!node.children || node.children.length === 0) {
      // 叶子节点
      return node.value || 0;
    }

    // 非叶子节点：累加所有子节点的值
    let sum = 0;
    for (const child of node.children) {
      sum += this.calculateNodeValues(child);
    }

    node.value = sum;
    return sum;
  }
}

