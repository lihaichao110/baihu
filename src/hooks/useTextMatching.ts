/**
 * 屏幕文字匹配 Hook
 * @description 提供屏幕文字匹配的 React Hook 接口
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { TextMatchingService } from '../services';
import type {
  ScreenTextElement,
  MatchResult,
  TextMatchTarget,
  MatchMode,
  MatchContext,
} from '../types';

interface UseTextMatchingOptions {
  /** 是否启用 */
  enabled?: boolean;
  /** 检查间隔（毫秒） */
  checkInterval?: number;
  /** 匹配失败时的回调 */
  onNotFound?: (targetText: string) => void;
  /** 匹配成功时的回调 */
  onMatched?: (element: ScreenTextElement, target: TextMatchTarget) => void;
  /** 错误处理 */
  onError?: (error: Error) => void;
}

interface TextMatchingState {
  /** 是否正在监听 */
  isListening: boolean;
  /** 是否正在查找 */
  isSearching: boolean;
  /** 最后匹配到的元素 */
  lastMatchedElement: ScreenTextElement | null;
  /** 最后匹配到的目标 */
  lastMatchedTarget: TextMatchTarget | null;
  /** 匹配次数 */
  matchCount: number;
}

/**
 * 屏幕文字匹配 Hook
 */
export function useTextMatching(options: UseTextMatchingOptions = {}) {
  const {
    enabled = false,
    checkInterval = 500,
    onNotFound,
    onMatched,
    onError,
  } = options;

  const [state, setState] = useState<TextMatchingState>({
    isListening: false,
    isSearching: false,
    lastMatchedElement: null,
    lastMatchedTarget: null,
    matchCount: 0,
  });

  const targetsRef = useRef<TextMatchTarget[]>([]);
  const searchAttemptsRef = useRef<Map<string, number>>(new Map());

  /**
   * 获取屏幕所有文字
   */
  const getAllTexts = useCallback(async () => {
    setState((prev) => ({ ...prev, isSearching: true }));

    try {
      const texts = await TextMatchingService.getAllTexts();
      return texts;
    } catch (error) {
      console.error('获取屏幕文字失败:', error);
      onError?.(error as Error);
      return [];
    } finally {
      setState((prev) => ({ ...prev, isSearching: false }));
    }
  }, [onError]);

  /**
   * 查找单个文字
   */
  const findText = useCallback(
    async (targetText: string, matchMode: MatchMode = MatchMode.CONTAINS) => {
      setState((prev) => ({ ...prev, isSearching: true }));

      try {
        const result = await TextMatchingService.findText(targetText, matchMode);

        if (result.matched && result.element) {
          setState((prev) => ({
            ...prev,
            lastMatchedElement: result.element,
            matchCount: prev.matchCount + 1,
          }));
          return result;
        } else {
          onNotFound?.(targetText);
          return { matched: false };
        }
      } catch (error) {
        console.error('查找文字失败:', error);
        onError?.(error as Error);
        return { matched: false };
      } finally {
        setState((prev) => ({ ...prev, isSearching: false }));
      }
    },
    [onNotFound, onError]
  );

  /**
   * 智能查找（带上下文）
   */
  const findTextWithContext = useCallback(
    async (
      targetText: string,
      matchMode: MatchMode = MatchMode.CONTAINS,
      context?: MatchContext
    ) => {
      setState((prev) => ({ ...prev, isSearching: true }));

      try {
        const result = await TextMatchingService.findTextWithContext(
          targetText,
          matchMode,
          context
        );

        if (result.matched && result.element) {
          setState((prev) => ({
            ...prev,
            lastMatchedElement: result.element,
            matchCount: prev.matchCount + 1,
          }));
          return result;
        } else {
          onNotFound?.(targetText);
          return { matched: false };
        }
      } catch (error) {
        console.error('智能查找失败:', error);
        onError?.(error as Error);
        return { matched: false };
      } finally {
        setState((prev) => ({ ...prev, isSearching: false }));
      }
    },
    [onNotFound, onError]
  );

  /**
   * 自动点击文字
   */
  const autoClickByText = useCallback(
    async (targetText: string, matchMode: MatchMode = MatchMode.CONTAINS) => {
      setState((prev) => ({ ...prev, isSearching: true }));

      try {
        const result = await TextMatchingService.autoClickByText(
          targetText,
          matchMode
        );

        if (result.success && result.element) {
          setState((prev) => ({
            ...prev,
            lastMatchedElement: result.element,
            matchCount: prev.matchCount + 1,
          }));
          return result;
        } else {
          onNotFound?.(targetText);
          return { success: false };
        }
      } catch (error) {
        console.error('自动点击失败:', error);
        onError?.(error as Error);
        return { success: false };
      } finally {
        setState((prev) => ({ ...prev, isSearching: false }));
      }
    },
    [onNotFound, onError]
  );

  /**
   * 批量查找
   */
  const findMultipleTexts = useCallback(
    async (targetTexts: string[], matchMode: MatchMode = MatchMode.CONTAINS) => {
      setState((prev) => ({ ...prev, isSearching: true }));

      try {
        const results = await TextMatchingService.findMultipleTexts(
          targetTexts,
          matchMode
        );

        // 找到第一个匹配的
        for (const [text, element] of results.entries()) {
          if (element) {
            setState((prev) => ({
              ...prev,
              lastMatchedElement: element,
              matchCount: prev.matchCount + 1,
            }));
            return { found: true, text, element };
          }
        }

        return { found: false };
      } catch (error) {
        console.error('批量查找失败:', error);
        onError?.(error as Error);
        return { found: false };
      } finally {
        setState((prev) => ({ ...prev, isSearching: false }));
      }
    },
    [onError]
  );

  /**
   * 等待文字出现并点击
   */
  const waitAndClick = useCallback(
    async (
      targetText: string,
      matchMode: MatchMode = MatchMode.CONTAINS,
      timeout: number = 30000,
      interval: number = 500
    ) => {
      setState((prev) => ({ ...prev, isSearching: true }));

      try {
        const result = await TextMatchingService.waitAndClick(
          targetText,
          matchMode,
          timeout,
          interval
        );

        if (result.success && result.element) {
          setState((prev) => ({
            ...prev,
            lastMatchedElement: result.element,
            matchCount: prev.matchCount + 1,
          }));
          return result;
        } else {
          onNotFound?.(targetText);
          return { success: false };
        }
      } catch (error) {
        console.error('等待并点击失败:', error);
        onError?.(error as Error);
        return { success: false };
      } finally {
        setState((prev) => ({ ...prev, isSearching: false }));
      }
    },
    [onNotFound, onError]
  );

  /**
   * 开始监听匹配
   */
  const startMatching = useCallback(
    (targets: TextMatchTarget[]) => {
      if (!enabled) {
        console.warn('文字匹配未启用');
        return;
      }

      targetsRef.current = targets;
      TextMatchingService.startTextMatching(targets, checkInterval);
      setState((prev) => ({ ...prev, isListening: true }));

      // 设置事件监听
      const handleMatched = (data: any) => {
        const matchedTarget = targets.find((t) => t.id === data.targetId);
        
        if (matchedTarget) {
          setState((prev) => ({
            ...prev,
            lastMatchedElement: data.element,
            lastMatchedTarget: matchedTarget,
            matchCount: prev.matchCount + 1,
          }));
          
          onMatched?.(data.element, matchedTarget);
        }
      };

      TextMatchingService.addEventListener('onTextMatched', handleMatched);
    },
    [enabled, checkInterval, onMatched, targets]
  );

  /**
   * 停止监听
   */
  const stopMatching = useCallback(() => {
    TextMatchingService.stopTextMatching();
    TextMatchingService.removeEventListener('onTextMatched');
    setState((prev) => ({
      ...prev,
      isListening: false,
      lastMatchedElement: null,
      lastMatchedTarget: null,
    }));
  }, []);

  /**
   * 清理
   */
  useEffect(() => {
    return () => {
      stopMatching();
    };
  }, [stopMatching]);

  return {
    // 状态
    ...state,

    // 方法
    getAllTexts,
    findText,
    findTextWithContext,
    autoClickByText,
    findMultipleTexts,
    waitAndClick,
    startMatching,
    stopMatching,
  };
}

export default useTextMatching;

