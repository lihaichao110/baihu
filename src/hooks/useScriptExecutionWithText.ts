/**
 * 脚本自动化执行 Hook（基于文字匹配）
 * @description 使用文字匹配实现脚本自动化执行
 */

import { useState, useCallback, useRef } from 'react';
import { TextMatchingService } from '../services';
import type {
  ScriptStep,
  ScriptExecutionState,
  MatchMode,
  ScreenTextElement,
} from '../types';

interface UseScriptExecutionOptions {
  /** 执行完成回调 */
  onComplete?: (success: boolean, executedSteps: number) => void;
  /** 步骤执行回调 */
  onStepStart?: (step: ScriptStep, index: number) => void;
  /** 步骤完成回调 */
  onStepComplete?: (step: ScriptStep, index: number, success: boolean) => void;
  /** 错误回调 */
  onError?: (error: string, step: ScriptStep, index: number) => void;
}

interface ScriptExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 已执行步骤数 */
  executedSteps: number;
  /** 最后匹配到的元素 */
  lastMatchedElement?: ScreenTextElement;
}

/**
 * 脚本自动化执行 Hook
 */
export function useScriptExecution(options: UseScriptExecutionOptions = {}) {
  const {
    onComplete,
    onStepStart,
    onStepComplete,
    onError,
  } = options;

  const [executionState, setExecutionState] = useState<ScriptExecutionState>({
    isRunning: false,
    currentStepIndex: 0,
    progress: 0,
    startTime: 0,
  });

  const [result, setResult] = useState<ScriptExecutionResult>({
    success: false,
    executedSteps: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 执行单个步骤
   */
  const executeStep = useCallback(
    async (
      step: ScriptStep,
      index: number
    ): Promise<ScriptExecutionResult> => {
      const startTime = Date.now();
      const timeout = step.timeout || 30000;
      const waitAfterAction = step.waitAfterAction || 1000;
      const nextStepDelay = step.nextStepDelay || 500;

      onStepStart?.(step, index);

      // 等待目标文字出现
      let matchedElement: ScreenTextElement | null = null;
      let attempts = 0;
      const maxAttempts = Math.ceil(timeout / 500);

      while (
        !matchedElement &&
        attempts < maxAttempts &&
        !abortControllerRef.current?.signal.aborted
      ) {
        const matchResult = await TextMatchingService.findText(
          step.targetText,
          step.matchMode
        );

        if (matchResult.matched && matchResult.element) {
          matchedElement = matchResult.element;
          break;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!matchedElement) {
        const error = `超时：未找到 "${step.targetText}"`;
        onError?.(error, step, index);
        return {
          success: false,
          executedSteps: index + 1,
        };
      }

      // 计算点击位置
      const centerX = matchedElement.x + matchedElement.width / 2;
      const centerY = matchedElement.y + matchedElement.height / 2;

      // 执行操作
      let actionSuccess = false;

      switch (step.action) {
        case 'tap':
          const tapResult = await TextMatchingService.autoClickByText(
            step.targetText,
            step.matchMode
          );
          actionSuccess = tapResult.success;
          break;

        case 'longPress':
          // TODO: 实现长按功能
          actionSuccess = await TextMatchingService.autoClickByText(
            step.targetText,
            step.matchMode
          );
          break;

        case 'swipe':
          if (step.swipeParams) {
            // TODO: 实现滑动功能
            const swipeResult = await TextMatchingService.autoClickByText(
              step.targetText,
              step.matchMode
            );
            actionSuccess = swipeResult.success;
          }
          break;
      }

      if (!actionSuccess) {
        const error = `操作失败：${step.action}`;
        onError?.(error, step, index);
        onStepComplete?.(step, index, false);
        return {
          success: false,
          executedSteps: index + 1,
          lastMatchedElement: matchedElement,
        };
      }

      console.log(`✅ 步骤 ${index + 1} 完成: ${step.description}`);

      // 等待操作完成
      await new Promise((resolve) => setTimeout(resolve, waitAfterAction));

      // 等待下一步延迟
      await new Promise((resolve) => setTimeout(resolve, nextStepDelay));

      onStepComplete?.(step, index, true);

      return {
        success: true,
        executedSteps: index + 1,
        lastMatchedElement: matchedElement,
      };
    },
    [onStepStart, onStepComplete, onError]
  );

  /**
   * 执行脚本
   */
  const executeScript = useCallback(async (steps: ScriptStep[]) => {
    if (steps.length === 0) {
      console.warn('脚本为空');
      return;
    }

    if (executionState.isRunning) {
      console.warn('脚本正在执行中');
      return;
    }

    // 重置状态
    abortControllerRef.current = new AbortController();
    setExecutionState({
      isRunning: true,
      currentStepIndex: 0,
      progress: 0,
      startTime: Date.now(),
    });

    setResult({
      success: false,
      executedSteps: 0,
    });

    console.log(`🚀 开始执行脚本，共 ${steps.length} 个步骤`);

    try {
      let currentResult: ScriptExecutionResult = {
        success: true,
        executedSteps: 0,
      };

      for (let i = 0; i < steps.length; i++) {
        // 检查是否已取消
        if (abortControllerRef.current?.signal.aborted) {
          console.log('⚠️ 脚本执行已取消');
          currentResult = {
            success: false,
            executedSteps: i,
          };
          break;
        }

        // 更新当前步骤
        setExecutionState((prev) => ({
          ...prev,
          currentStepIndex: i,
          progress: i / steps.length,
        }));

        // 执行步骤
        currentResult = await executeStep(steps[i], i);

        if (!currentResult.success) {
          break;
        }

        setResult(currentResult);
      }

      // 设置最终状态
      setExecutionState((prev) => ({
        ...prev,
        isRunning: false,
        progress: 1,
      }));

      onComplete?.(currentResult.success, currentResult.executedSteps);

      if (currentResult.success) {
        console.log('🎉 脚本执行完成！');
      } else {
        console.log(`❌ 脚本执行失败，执行了 ${currentResult.executedSteps} 个步骤`);
      }

    } catch (error) {
      console.error('脚本执行异常:', error);
      setExecutionState((prev) => ({
        ...prev,
        isRunning: false,
        progress: 0,
      }));

      setResult({
        success: false,
        executedSteps: executionState.currentStepIndex,
      });

      onError?.(error instanceof Error ? error.message : String(error), steps[executionState.currentStepIndex], executionState.currentStepIndex);
      onComplete?.(false, executionState.currentStepIndex);
    } finally {
      abortControllerRef.current = null;
    }
  }, [executionState, executeStep, onComplete, onError]);

  /**
   * 停止执行
   */
  const stopExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('⏸️ 停止脚本执行');
    }

    setExecutionState((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  /**
   * 重置状态
   */
  const resetState = useCallback(() => {
    setExecutionState({
      isRunning: false,
      currentStepIndex: 0,
      progress: 0,
      startTime: 0,
    });

    setResult({
      success: false,
      executedSteps: 0,
    });
  }, []);

  /**
   * 获取执行进度百分比
   */
  const getProgressPercent = useCallback(() => {
    return Math.round(executionState.progress * 100);
  }, [executionState.progress]);

  /**
   * 获取执行时长
   */
  const getExecutionDuration = useCallback(() => {
    if (executionState.startTime === 0) {
      return 0;
    }
    return Date.now() - executionState.startTime;
  }, [executionState.startTime]);

  return {
    // 状态
    executionState,
    result,

    // 方法
    executeScript,
    stopExecution,
    resetState,
    getProgressPercent,
    getExecutionDuration,
  };
}

export default useScriptExecution;

