/**
 * ProgressManager单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressManager, withProgress } from '../../../src/progress';

describe('ProgressManager', () => {
  let progress: ProgressManager;

  beforeEach(() => {
    progress = new ProgressManager(undefined, true); // silent mode
  });

  describe('start', () => {
    it('should initialize progress', () => {
      progress.start('测试阶段', 100, '开始测试');

      const info = progress.getInfo();
      expect(info.phase).toBe('测试阶段');
      expect(info.total).toBe(100);
      expect(info.current).toBe(0);
      expect(info.percent).toBe(0);
    });
  });

  describe('update', () => {
    it('should update progress', () => {
      progress.start('测试', 100);
      progress.update(50, '已完成50%');

      const info = progress.getInfo();
      expect(info.current).toBe(50);
      expect(info.percent).toBe(50);
    });

    it('should calculate percentage correctly', () => {
      progress.start('测试', 200);
      progress.update(50);

      const info = progress.getInfo();
      expect(info.percent).toBe(25);
    });
  });

  describe('increment', () => {
    it('should increment progress by 1', () => {
      progress.start('测试', 100);
      progress.increment();

      expect(progress.getInfo().current).toBe(1);
    });

    it('should increment by custom amount', () => {
      progress.start('测试', 100);
      progress.increment('', 5);

      expect(progress.getInfo().current).toBe(5);
    });

    it('should not exceed total', () => {
      progress.start('测试', 10);
      progress.increment('', 15);

      expect(progress.getInfo().current).toBe(10);
    });
  });

  describe('complete', () => {
    it('should set progress to 100%', () => {
      progress.start('测试', 100);
      progress.update(50);
      progress.complete();

      const info = progress.getInfo();
      expect(info.current).toBe(100);
      expect(info.percent).toBe(100);
    });
  });

  describe('getInfo', () => {
    it('should return progress info', () => {
      progress.start('测试阶段', 100);
      progress.update(25);

      const info = progress.getInfo();

      expect(info).toMatchObject({
        phase: '测试阶段',
        current: 25,
        total: 100,
        percent: 25,
      });
      expect(info.startTime).toBeGreaterThan(0);
      expect(info.estimatedRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should estimate remaining time', async () => {
      progress.start('测试', 100);

      // 模拟一些进度
      await new Promise(resolve => setTimeout(resolve, 50));
      progress.update(50);

      const info = progress.getInfo();
      expect(info.estimatedRemaining).toBeGreaterThan(0);
    });
  });

  describe('with callback', () => {
    it('should call progress callback', () => {
      const callback = vi.fn();
      const progressWithCallback = new ProgressManager(callback, true);

      progressWithCallback.start('测试', 100);
      progressWithCallback.update(50, '进度更新');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[callback.mock.calls.length - 1][0]).toMatchObject({
        phase: '测试',
        current: 50,
        percent: 50,
        message: '进度更新',
      });
    });
  });
});

describe('withProgress', () => {
  it('should process items with progress', async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = async (item: number) => item * 2;

    const results = await withProgress(items, processor, {
      silent: true,
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it('should respect concurrency limit', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let activeCount = 0;
    let maxActiveCount = 0;

    const processor = async (item: number) => {
      activeCount++;
      maxActiveCount = Math.max(maxActiveCount, activeCount);

      await new Promise(resolve => setTimeout(resolve, 10));

      activeCount--;
      return item;
    };

    await withProgress(items, processor, {
      concurrency: 3,
      silent: true,
    });

    expect(maxActiveCount).toBeLessThanOrEqual(3);
  });

  it('should call progress callback', async () => {
    const items = [1, 2, 3];
    const processor = async (item: number) => item;
    const progressCallback = vi.fn();

    await withProgress(items, processor, {
      silent: true,
      onProgress: progressCallback,
    });

    expect(progressCallback).toHaveBeenCalled();

    // 应该至少调用一次，且最后一次应该是100%
    const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
    expect(lastCall.percent).toBe(100);
  });

  it('should handle errors gracefully', async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = async (item: number) => {
      if (item === 3) {
        throw new Error('Test error');
      }
      return item * 2;
    };

    // 应该继续处理其他项
    const results = await withProgress(items, processor, {
      silent: true,
    });

    // 结果数组应该有4个元素（1个失败）
    expect(results.length).toBe(4);
    expect(results).toContain(2);
    expect(results).toContain(4);
    expect(results).not.toContain(6); // item 3 失败
    expect(results).toContain(8);
    expect(results).toContain(10);
  });

  it('should work with empty array', async () => {
    const results = await withProgress([], async () => { }, {
      silent: true,
    });

    expect(results).toEqual([]);
  });

  it('should handle single item', async () => {
    const results = await withProgress(
      [42],
      async (x) => x * 2,
      { silent: true }
    );

    expect(results).toEqual([84]);
  });
});


