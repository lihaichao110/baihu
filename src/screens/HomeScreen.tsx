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

export const HomeScreen = () => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFloatingWindowVisible, setIsFloatingWindowVisible] = useState(false);
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
      const hasPermission = await FloatingWindowModule.checkPermission();
      if (!hasPermission && Platform.OS === 'android') {
        Alert.alert(
          '需要权限',
          '需要悬浮窗权限才能使用此功能，请在设置中开启',
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

      setIsTaskRunning(false);
      setElapsedTime(0);
      setIsFloatingWindowVisible(true);
      FloatingWindowModule.showFloatingWindow('00:00', false);
    } catch (error) {
      console.error('打开悬浮窗失败:', error);
      Alert.alert('错误', '无法打开悬浮窗');
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
        `已记录 ${event.coordinates.length} 个点击位置。请使用“切换控制”功能进行录制。`,
      );
    }

    // 启动计时器
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    // 更新悬浮窗
    FloatingWindowModule.updateFloatingWindow('00:00', true);
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
          />
          <FeatureCard
            title="自动滚动"
            subtitle="auto roll"
            backgroundColor="#80d0c7"
            width="half"
            style={{ backgroundColor: '#43e97b' }} // Override with green gradient-ish
          />
        </View>

        <View style={styles.fullWidthFeature}>
          <FeatureCard
            title="自动刷新"
            subtitle="auto refresh"
            backgroundColor="#a18cd1"
            width="full"
            icon="🔄"
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
