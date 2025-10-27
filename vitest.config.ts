/**
 * Vitest配置
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',

    // 全局测试设置
    globals: true,

    // 测试文件匹配模式
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],

    // 排除模式
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/examples/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/bin/**',
        '**/*.config.*',
      ],
      // 覆盖率阈值
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // 超时设置
    testTimeout: 30000,
    hookTimeout: 30000,

    // 并发设置
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // 监控模式配置
    watch: false,

    // 报告器
    reporters: ['verbose'],

    // 设置别名
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

