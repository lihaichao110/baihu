/**
 * 屏幕文字匹配服务
 * @description 提供屏幕文字获取、匹配和自动点击功能
 */

import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import type {
  ScreenTextElement,
  MatchResult,
  TextMatchTarget,
  MatchMode,
  MatchContext,
} from '../../types';

const { FloatingWindowModule } = NativeModules;

/**
 * 文字匹配服务类
 */
class TextMatchingServiceClass {
  private isListening: boolean = false;
  private listeners: Map<string, any> = new Map();

  /**
   * 获取屏幕所有文字元素
   */
  async getAllTexts(): Promise<ScreenTextElement[]> {
    if (Platform.OS !== 'android') {
      console.warn('文字匹配仅在 Android 平台可用');
      return [];
    }

    try {
      const result = await FloatingWindowModule.getScreenTexts();
      
      if (!result.success) {
        console.error('获取屏幕文字失败:', result.error);
        return [];
      }

      return (result.texts || []).map((item: any) => ({
        text: item.text,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      }));
    } catch (error) {
      console.error('获取屏幕文字异常:', error);
      return [];
    }
  }

  /**
   * 查找屏幕上的文字
   */
  async findText(
    targetText: string,
    matchMode: MatchMode = MatchMode.CONTAINS
  ): Promise<MatchResult> {
    if (Platform.OS !== 'android') {
      return { matched: false };
    }

    try {
      const result = await FloatingWindowModule.findTextOnScreen(
        targetText,
        matchMode
      );

      if (!result.success) {
        return { matched: false };
      }

      const element: ScreenTextElement = {
        text: result.text,
        x: result.x,
        y: result.y,
        width: result.width,
        height: result.height,
      };

      return {
        matched: true,
        element,
        score: 1.0,
      };
    } catch (error) {
      console.error('查找文字异常:', error);
      return { matched: false };
    }
  }

  /**
   * 根据文字自动点击
   */
  async autoClickByText(
    targetText: string,
    matchMode: MatchMode = MatchMode.CONTAINS
  ): Promise<{ success: boolean; element?: ScreenTextElement }> {
    if (Platform.OS !== 'android') {
      return { success: false };
    }

    try {
      const result = await FloatingWindowModule.autoClickByText(
        targetText,
        matchMode
      );

      if (!result.success) {
        console.error('自动点击失败:', result.error);
        return { success: false };
      }

      const element: ScreenTextElement = {
        text: result.text,
        x: result.x,
        y: result.y,
        width: result.width,
        height: result.height,
      };

      return { success: true, element };
    } catch (error) {
      console.error('自动点击异常:', error);
      return { success: false };
    }
  }

  /**
   * 批量查找文字
   */
  async findMultipleTexts(
    targetTexts: string[],
    matchMode: MatchMode = MatchMode.CONTAINS
  ): Promise<Map<string, ScreenTextElement | null>> {
    if (Platform.OS !== 'android') {
      return new Map();
    }

    try {
      const result = await FloatingWindowModule.findMultipleTexts(
        targetTexts,
        matchMode
      );

      if (!result.success) {
        console.error('批量查找文字失败:', result.error);
        return new Map();
      }

      const map = new Map<string, ScreenTextElement | null>();
      for (const [key, value] of Object.entries(result.results || {})) {
        if (value) {
          map.set(key, {
            text: value.text,
            x: value.x,
            y: value.y,
            width: value.width,
            height: value.height,
          });
        } else {
          map.set(key, null);
        }
      }

      return map;
    } catch (error) {
      console.error('批量查找文字异常:', error);
      return new Map();
    }
  }

  /**
   * 智能匹配（带上下文）
   */
  async findTextWithContext(
    targetText: string,
    matchMode: MatchMode = MatchMode.CONTAINS,
    context?: MatchContext
  ): Promise<MatchResult> {
    const allTexts = await this.getAllTexts();

    // 如果没有上下文，使用普通查找
    if (!context) {
      return this.findText(targetText, matchMode);
    }

    // 筛选符合条件的文字元素
    const candidates = allTexts.filter((element) => {
      // 检查是否匹配
      const matched = this.isTextMatched(element.text, targetText, matchMode);
      if (!matched) {
        return false;
      }

      // 检查区域限制
      if (context.region) {
        const inRegion =
          element.x >= context.region.x &&
          element.y >= context.region.y &&
          element.x <= context.region.x + context.region.width &&
          element.y <= context.region.y + context.region.height;
        if (!inRegion) {
          return false;
        }
      }

      return true;
    });

    if (candidates.length === 0) {
      return { matched: false };
    }

    // 如果只有一个匹配，直接返回
    if (candidates.length === 1) {
      return { matched: true, element: candidates[0], score: 1.0 };
    }

    // 如果有多个匹配，使用相似度排序
    const bestMatch = candidates
      .map((element) => ({
        element,
        score: this.calculateSimilarity(element.text, targetText),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (bestMatch && (bestMatch.score || 0) >= (context.minScore || 0.8)) {
      return { matched: true, element: bestMatch.element, score: bestMatch.score };
    }

    return { matched: false };
  }

  /**
   * 判断文字是否匹配
   */
  private isTextMatched(
    text: string,
    target: string,
    mode: MatchMode
  ): boolean {
    switch (mode) {
      case MatchMode.EXACT:
        return text === target;
      case MatchMode.CONTAINS:
        return text.toLowerCase().includes(target.toLowerCase());
      case MatchMode.STARTS_WITH:
        return text.toLowerCase().startsWith(target.toLowerCase());
      case MatchMode.ENDS_WITH:
        return text.toLowerCase().endsWith(target.toLowerCase());
      case MatchMode.REGEX:
        try {
          const regex = new RegExp(target, 'i');
          return regex.test(text);
        } catch {
          return false;
        }
      default:
        return text.toLowerCase().includes(target.toLowerCase());
    }
  }

  /**
   * 计算两个字符串的相似度（0-1）
   */
  private calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }

    const distance = this.editDistance(longer, shorter);
    return (longerLength - distance) / longerLength;
  }

  /**
   * 计算编辑距离（Levenshtein 距离）
   */
  private editDistance(s1: string, s2: string): number {
    const costs = new Array(s2.length + 1).fill(0);
    for (let i = 0; i < s2.length + 1; i++) {
      costs[i] = i;
    }

    for (let i = 1; i < s1.length + 1; i++) {
      let nw = i - 1;
      costs[0] = i;

      for (let j = 1; j < s2.length + 1; j++) {
        const cj =
          Math.min(
            1 + Math.min(costs[j], costs[j - 1]),
            s1[i - 1] === s2[j - 1] ? nw : nw + 1
          );
        nw = costs[j];
        costs[j] = cj;
      }
    }

    return costs[s2.length];
  }

  /**
   * 按优先级匹配多个目标
   */
  async matchByPriority(
    targets: TextMatchTarget[]
  ): Promise<{ matched: boolean; element?: ScreenTextElement; target?: TextMatchTarget }> {
    // 按优先级排序
    const sortedTargets = [...targets].sort(
      (a, b) => (a.priority || 999) - (b.priority || 999)
    );

    // 获取所有屏幕文字
    const allTexts = await this.getAllTexts();

    // 按优先级查找
    for (const target of sortedTargets) {
      const matched = allTexts.find((element) =>
        this.isTextMatched(element.text, target.text, target.matchMode)
      );

      if (matched) {
        return {
          matched: true,
          element: matched,
          target,
        };
      }
    }

    return { matched: false };
  }

  /**
   * 等待文字出现并点击
   */
  async waitAndClick(
    targetText: string,
    matchMode: MatchMode = MatchMode.CONTAINS,
    timeout: number = 30000,
    interval: number = 500
  ): Promise<{ success: boolean; element?: ScreenTextElement }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.findText(targetText, matchMode);

      if (result.matched && result.element) {
        // 执行点击
        const clickResult = await this.autoClickByText(targetText, matchMode);
        return clickResult;
      }

      await this.sleep(interval);
    }

    console.error(`等待文字超时: ${targetText}`);
    return { success: false };
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 开始监听屏幕文字变化
   */
  startTextMatching(
    targets: TextMatchTarget[],
    checkInterval: number = 500
  ): void {
    if (this.isListening) {
      console.warn('文字匹配已在监听中');
      return;
    }

    this.isListening = true;

    const intervalId = setInterval(async () => {
      try {
        const result = await this.matchByPriority(targets);

        if (result.matched && result.element && result.target) {
          console.log(`找到匹配: ${result.element.text}`);

          // 执行回调
          if (result.target.onMatched) {
            result.target.onMatched(result.element);
          }

          // 自动点击
          if (result.target.autoClick) {
            const centerX = result.element.x + result.element.width / 2;
            const centerY = result.element.y + result.element.height / 2;

            await FloatingWindowModule.performTap(centerX, centerY);
          }

          // 如果设置了延迟，延迟后继续监听
          if (result.target.delayAfterClick) {
            await this.sleep(result.target.delayAfterClick);
          }
        }
      } catch (error) {
        console.error('文字匹配监听错误:', error);
      }
    }, checkInterval);

    this.listeners.set('matching', intervalId);
  }

  /**
   * 停止监听
   */
  stopTextMatching(): void {
    const intervalId = this.listeners.get('matching');
    if (intervalId) {
      clearInterval(intervalId);
      this.listeners.delete('matching');
    }
    this.isListening = false;
  }

  /**
   * 添加事件监听
   */
  addEventListener(event: string, callback: (data: any) => void): void {
    const listener = DeviceEventEmitter.addListener(event, callback);
    this.listeners.set(event, listener);
  }

  /**
   * 移除事件监听
   */
  removeEventListener(event: string): void {
    const listener = this.listeners.get(event);
    if (listener) {
      listener.remove();
      this.listeners.delete(event);
    }
  }

  /**
   * 移除所有监听
   */
  removeAllListeners(): void {
    this.stopTextMatching();
    for (const [event, listener] of this.listeners.entries()) {
      if (typeof listener.remove === 'function') {
        listener.remove();
      }
      this.listeners.delete(event);
    }
  }
}

// 导出单例
const TextMatchingService = new TextMatchingServiceClass();

export default TextMatchingService;

