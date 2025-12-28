/**
 * 无障碍服务 Hook
 * @description 管理无障碍服务状态和监听
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { AccessibilityService, FloatingWindowService } from '../services';
import { STRINGS } from '../constants';

interface UseAccessibilityReturn {
  /** 无障碍服务是否已启用 */
  isEnabled: boolean;
  /** 检查无障碍服务状态 */
  checkStatus: () => Promise<boolean>;
  /** 打开无障碍设置 */
  openSettings: () => void;
  /** 提示用户开启无障碍服务 */
  promptEnable: (onCancel?: () => void) => void;
}

export function useAccessibility(): UseAccessibilityReturn {
  const [isEnabled, setIsEnabled] = useState(false);

  // 检查无障碍服务状态
  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    
    const enabled = await FloatingWindowService.isAccessibilityServiceEnabled();
    setIsEnabled(enabled);
    return enabled;
  }, []);

  // 打开无障碍设置
  const openSettings = useCallback(() => {
    FloatingWindowService.openAccessibilitySettings();
  }, []);

  // 提示用户开启无障碍服务
  const promptEnable = useCallback((onCancel?: () => void) => {
    Alert.alert(
      STRINGS.ALERT.ACCESSIBILITY_REQUIRED_TITLE,
      STRINGS.ALERT.ACCESSIBILITY_REQUIRED_MESSAGE,
      [
        { 
          text: STRINGS.COMMON.CANCEL, 
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: STRINGS.ALERT.GO_SETTINGS,
          onPress: openSettings,
        },
      ],
    );
  }, [openSettings]);

  // 初始检查和监听
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const init = async () => {
      // 初始检查
      await checkStatus();

      // 添加状态变化监听
      if (Platform.OS === 'android') {
        removeListener = await AccessibilityService.addAccessibilityServiceListener(
          async () => {
            await checkStatus();
          },
        );
      }
    };

    init();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [checkStatus]);

  return {
    isEnabled,
    checkStatus,
    openSettings,
    promptEnable,
  };
}

