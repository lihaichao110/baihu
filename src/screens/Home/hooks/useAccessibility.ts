/**
 * 无障碍服务相关 Hook
 * @description 管理无障碍服务的启用状态和监听
 */

import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { AccessibilityService, FloatingWindowService } from '../../../services';

export const useAccessibility = (isFloatingWindowVisible: boolean) => {
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  useEffect(() => {
    const checkInitialStatus = async () => {
      if (Platform.OS === 'android') {
        const enabled =
          await FloatingWindowService.isAccessibilityServiceEnabled();
        setIsAccessibilityEnabled(enabled);
      }
    };
    checkInitialStatus();

    const setupListener = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      const removeListener =
        await AccessibilityService.addAccessibilityServiceListener(
          async () => {
            const ourServiceEnabled =
              await FloatingWindowService.isAccessibilityServiceEnabled();
            setIsAccessibilityEnabled(ourServiceEnabled);

            if (ourServiceEnabled) {
              Alert.alert('无障碍服务已启用', '现在可以使用自动任务功能了！', [
                { text: '知道了' },
              ]);
            } else if (isFloatingWindowVisible) {
              Alert.alert(
                '无障碍服务已关闭',
                '自动任务功能需要无障碍服务才能正常工作，请重新开启',
                [
                  { text: '稍后', style: 'cancel' },
                  {
                    text: '去设置',
                    onPress: () =>
                      FloatingWindowService.openAccessibilitySettings(),
                  },
                ],
              );
            }
          },
        );

      return removeListener;
    };

    let removeListener: (() => void) | null = null;
    setupListener().then(listener => {
      removeListener = listener;
    });

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isFloatingWindowVisible]);

  return isAccessibilityEnabled;
};

