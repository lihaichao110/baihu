import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { Banner } from '../components/Banner';
import { FeatureCard } from '../components/FeatureCard';
import { ToolGrid } from '../components/ToolGrid';
import colors from '../theme/colors';
import FloatingWindowModule from '../modules/FloatingWindowModule';
import AccessibilityServiceModule from '../modules/AccessibilityServiceModule';

export const HomeScreen = () => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFloatingWindowVisible, setIsFloatingWindowVisible] = useState(false);
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleAutoTaskPress = async () => {
    try {
      // 1. 首先检查无障碍服务
      if (Platform.OS === 'android') {
        const accessibilityEnabled =
          await AccessibilityServiceModule.checkAccessibilityService();

        if (!accessibilityEnabled) {
          Alert.alert(
            '需要开启无障碍服务',
            '自动任务需要无障碍服务权限才能正常工作。请在设置中为本应用开启无障碍服务。',
            [
              { text: '取消', style: 'cancel' },
              {
                text: '去设置',
                onPress: async () => {
                  await AccessibilityServiceModule.openAccessibilitySettings();
                  // 给用户提示如何操作
                  setTimeout(() => {
                    Alert.alert(
                      '操作提示',
                      '请在无障碍设置中找到"白虎"应用，并开启服务开关',
                      [{ text: '知道了' }],
                    );
                  }, 1000);
                },
              },
            ],
          );
          return;
        }

        // 无障碍服务已开启，继续检查悬浮窗权限
        setIsAccessibilityEnabled(true);
      }

      // 2. 检查悬浮窗权限
      const hasPermission = await FloatingWindowModule.checkPermission();
      if (!hasPermission && Platform.OS === 'android') {
        Alert.alert(
          '需要悬浮窗权限',
          '需要悬浮窗权限才能显示控制面板，请在设置中开启',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowModule.requestPermission(),
            },
          ],
        );
        return;
      }

      // 3. 所有权限都已具备，显示悬浮窗
      setIsTaskRunning(false);
      setElapsedTime(0);
      setIsFloatingWindowVisible(true);
      FloatingWindowModule.showFloatingWindow('00:00', false);

      // 显示成功提示
      Alert.alert('准备就绪', '点击悬浮窗上的"开始"按钮即可开始录制自动任务', [
        { text: '知道了' },
      ]);
    } catch (error) {
      console.error('打开自动任务失败:', error);
      Alert.alert('错误', '无法启动自动任务，请稍后重试');
    }
  };

  const handleStartTask = useCallback((event?: any) => {
    setIsTaskRunning(true);
    setElapsedTime(0);

    if (Platform.OS === 'ios' && event && event.coordinates) {
      console.log('iOS 记录的点击坐标:', event.coordinates);
      // 这里可以将坐标保存到本地存储，或者用于应用内自动化
      // 由于iOS无法自动执行系统级点击，这里仅作为记录
      Alert.alert(
        '提示',
        `已记录 ${event.coordinates.length} 个点击位置。请使用"切换控制"功能进行录制。`,
      );
    }

    // 启动计时器
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // 更新悬浮窗
    FloatingWindowModule.updateFloatingWindow('00:00', true);

    console.log('任务已开始');
  }, []);

  const handleEndTask = useCallback(() => {
    setIsTaskRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // 可以在这里添加任务结束的逻辑
    setElapsedTime(currentTime => {
      console.log('任务已结束，总时长:', formatTime(currentTime));
      FloatingWindowModule.updateFloatingWindow(formatTime(currentTime), false);
      return currentTime;
    });
  }, []);

  const handleCloseFloatingWindow = useCallback(() => {
    setIsTaskRunning(currentRunning => {
      if (currentRunning) {
        handleEndTask();
      }
      return false;
    });
    FloatingWindowModule.hideFloatingWindow();
    setIsFloatingWindowVisible(false);
    setElapsedTime(0);
  }, [handleEndTask]);

  // 处理自动连点器点击
  const handleAutoClickerPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await AccessibilityServiceModule.checkAccessibilityService();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动连点器需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () =>
                AccessibilityServiceModule.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动连点器功能开发中...');
  };

  // 处理自动滚动点击
  const handleAutoScrollPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await AccessibilityServiceModule.checkAccessibilityService();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动滚动需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () =>
                AccessibilityServiceModule.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动滚动功能开发中...');
  };

  // 处理自动刷新点击
  const handleAutoRefreshPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await AccessibilityServiceModule.checkAccessibilityService();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动刷新需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () =>
                AccessibilityServiceModule.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动刷新功能开发中...');
  };

  // 监听悬浮窗按钮事件
  useEffect(() => {
    const startListener = FloatingWindowModule.addEventListener(
      'onStartButtonClick',
      handleStartTask,
    );

    const endListener = FloatingWindowModule.addEventListener(
      'onEndButtonClick',
      handleEndTask,
    );

    const closeListener = FloatingWindowModule.addEventListener(
      'onCloseButtonClick',
      handleCloseFloatingWindow,
    );

    return () => {
      startListener.remove();
      endListener.remove();
      closeListener.remove();
    };
  }, [handleStartTask, handleEndTask, handleCloseFloatingWindow]);

  // 监听无障碍服务状态变化
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    // 初始检查无障碍服务状态
    const checkInitialStatus = async () => {
      if (Platform.OS === 'android') {
        const enabled =
          await AccessibilityServiceModule.checkAccessibilityService();
        setIsAccessibilityEnabled(enabled);
      }
    };
    checkInitialStatus();

    // 添加状态变化监听
    const setupListener = async () => {
      removeListener =
        await AccessibilityServiceModule.addAccessibilityServiceListener(
          isEnabled => {
            setIsAccessibilityEnabled(isEnabled);

            if (isEnabled) {
              // 无障碍服务被启用
              Alert.alert('无障碍服务已启用', '现在可以使用自动任务功能了！', [
                { text: '知道了' },
              ]);
            } else if (isFloatingWindowVisible) {
              // 无障碍服务被关闭且悬浮窗正在显示
              Alert.alert(
                '无障碍服务已关闭',
                '自动任务功能需要无障碍服务才能正常工作，请重新开启',
                [
                  { text: '稍后', style: 'cancel' },
                  {
                    text: '去设置',
                    onPress: () =>
                      AccessibilityServiceModule.openAccessibilitySettings(),
                  },
                ],
              );
            }
          },
        );
    };
    setupListener();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isFloatingWindowVisible]);

  // 更新悬浮窗时间显示
  useEffect(() => {
    if (isFloatingWindowVisible) {
      updateIntervalRef.current = setInterval(() => {
        FloatingWindowModule.updateFloatingWindow(
          formatTime(elapsedTime),
          isTaskRunning,
        );
      }, 1000);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isFloatingWindowVisible, elapsedTime, isTaskRunning]);

  // 清理计时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Banner onPress={handleAutoTaskPress} />

        <View style={styles.featureRow}>
          <FeatureCard
            title="自动连点器"
            subtitle="auto clicker"
            backgroundColor="#8EC5FC"
            width="half"
            style={{ backgroundColor: '#a18cd1' }} // Override with purple gradient-ish
            onPress={handleAutoClickerPress}
            disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
          />
          <FeatureCard
            title="自动滚动"
            subtitle="auto roll"
            backgroundColor="#80d0c7"
            width="half"
            style={{ backgroundColor: '#43e97b' }} // Override with green gradient-ish
            onPress={handleAutoScrollPress}
            disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
          />
        </View>

        <View style={styles.fullWidthFeature}>
          <FeatureCard
            title="自动刷新"
            subtitle="auto refresh"
            backgroundColor="#a18cd1"
            width="full"
            icon="🔄"
            onPress={handleAutoRefreshPress}
            disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
          />
        </View>

        <ToolGrid />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  fullWidthFeature: {
    paddingHorizontal: 20,
  },
});
