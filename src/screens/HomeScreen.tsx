import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { Banner } from '../components/Banner';
import { FeatureCard } from '../components/FeatureCard';
import { ToolGrid } from '../components/ToolGrid';
import colors from '../theme/colors';
import AccessibilityServiceModule from '../modules/AccessibilityServiceModule';
import FloatingWindowModule, {
  TouchEventData,
  DeviceInfoData,
  PlaybackAction,
  PlaybackProgressData,
  PlaybackCompleteData,
  PlaybackErrorData,
} from '../modules/FloatingWindowModule';
import TouchRecorder, {
  TouchRecord,
  RecordingSession,
} from '../utils/TouchRecorder';

// 导入自定义的悬浮窗权限模块
const { OverlayPermissionModule } = NativeModules;

export const HomeScreen = () => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFloatingWindowVisible, setIsFloatingWindowVisible] = useState(false);
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastSession, setLastSession] = useState<RecordingSession | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleAutoTaskPress = async () => {
    // 如果悬浮窗已经显示，不重复执行
    if (isFloatingWindowVisible) {
      return;
    }

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

      // 2. 检查悬浮窗权限（使用自定义模块）
      if (Platform.OS === 'android') {
        const hasPermission = await OverlayPermissionModule.checkPermission();
        if (!hasPermission) {
          Alert.alert(
            '需要悬浮窗权限',
            '需要悬浮窗权限才能显示控制面板，请在设置中开启',
            [
              { text: '取消', style: 'cancel' },
              {
                text: '去设置',
                onPress: async () => {
                  await OverlayPermissionModule.requestPermission();
                },
              },
            ],
          );
          return;
        }
      }

      // 3. 所有权限都已具备，显示原生悬浮窗
      setIsTaskRunning(false);
      setElapsedTime(0);
      setIsFloatingWindowVisible(true);

      // 显示原生悬浮窗
      FloatingWindowModule.showFloatingWindow();
    } catch (error) {
      console.error('打开自动任务失败:', error);
      Alert.alert('错误', '无法启动自动任务，请稍后重试');
    }
  };

  const startRecordingInternal = useCallback(() => {
    setIsTaskRunning(true);
    setElapsedTime(0);

    // 显示触摸录制浮层
    FloatingWindowModule.showOverlay();

    // 启动计时器
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    console.log('任务已开始，开始记录触摸位置');
  }, []);

  const handleStartTask = useCallback(async () => {
    // 检查无障碍服务是否启用（触摸穿透功能需要）
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowModule.isAccessibilityServiceEnabled();
      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '触摸穿透功能需要无障碍服务权限。开启后，您在蒙层上的操作会同时作用到下层应用。',
          [
            {
              text: '仅录制',
              style: 'cancel',
              onPress: () => {
                // 继续录制，但触摸不会穿透
                startRecordingInternal();
              },
            },
            {
              text: '去设置',
              onPress: () => {
                FloatingWindowModule.openAccessibilitySettings();
              },
            },
          ],
        );
        return;
      }
    }

    startRecordingInternal();
  }, [startRecordingInternal]);

  // 清理计时器的通用函数
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleEndTask = useCallback(async () => {
    setIsTaskRunning(false);
    clearTimer();

    // 隐藏触摸录制浮层
    FloatingWindowModule.hideOverlay();

    // 检查是否正在录制
    const wasRecording = TouchRecorder.isCurrentlyRecording();
    console.log('结束任务时录制状态:', wasRecording);

    // 停止录制并保存会话
    const session = await TouchRecorder.stopRecording();
    console.log(
      '停止录制返回的会话:',
      session ? `${session.id}, 操作数: ${session.actions.length}` : 'null',
    );

    if (session && session.actions.length > 0) {
      // 保存会话用于回放
      setLastSession(session);
      // 显示执行按钮
      FloatingWindowModule.setPlayButtonVisible(true);

      const stats = TouchRecorder.getSessionStats(session);
      const durationText = formatTime(Math.floor(stats.duration / 1000));
      const orientationText =
        stats.orientation === 'landscape' ? '横屏' : '竖屏';

      Alert.alert(
        '录制完成',
        `会话ID: ${session.id}\n` +
          `录制时长: ${durationText}\n` +
          `屏幕方向: ${orientationText}\n` +
          `屏幕尺寸: ${session.deviceInfo.width}x${session.deviceInfo.height}\n` +
          `记录的操作数: ${stats.totalTouches}\n` +
          `点击次数: ${stats.taps}\n` +
          `滑动次数: ${stats.swipes}\n\n` +
          `点击「执行」按钮可回放此操作`,
        [
          {
            text: '查看详情',
            onPress: () => {
              console.log('会话详情:', JSON.stringify(session, null, 2));
            },
          },
          { text: '确定' },
        ],
      );
    } else {
      // 隐藏执行按钮
      FloatingWindowModule.setPlayButtonVisible(false);
      // 当 session 为 null 或没有操作时显示提示
      Alert.alert(
        '录制结束',
        session
          ? '没有记录到任何操作。'
          : '未能获取到录制数据。\n\n可能的原因:\n• 录制未正确启动\n• 录制过程中发生错误\n\n请检查控制台日志获取更多信息。',
        [{ text: '确定' }],
      );
    }

    console.log('任务已结束');
  }, [clearTimer]);

  const handleCloseFloatingWindow = useCallback(() => {
    // 先清理计时器
    clearTimer();

    // 如果正在执行，先停止
    if (isPlaying) {
      FloatingWindowModule.stopPlayback();
      setIsPlaying(false);
    }

    // 重置状态
    setIsTaskRunning(false);
    setElapsedTime(0);

    // 隐藏触摸录制浮层和原生悬浮窗
    FloatingWindowModule.hideOverlay();
    FloatingWindowModule.hideFloatingWindow();
    setIsFloatingWindowVisible(false);
  }, [clearTimer, isPlaying]);

  // 开始执行回放
  const handleStartPlayback = useCallback(() => {
    if (!lastSession || lastSession.actions.length === 0) {
      Alert.alert('提示', '没有可执行的操作记录');
      return;
    }

    console.log('开始执行回放，操作数:', lastSession.actions.length);

    // 将操作转换为回放格式
    const playbackActions: PlaybackAction[] = lastSession.actions.map(
      action => ({
        type: action.type,
        normalizedX: action.coordinates.normalizedX,
        normalizedY: action.coordinates.normalizedY,
        timestamp: action.timestamp,
      }),
    );

    setIsPlaying(true);
    setElapsedTime(0);
    FloatingWindowModule.updatePlayingState(true);

    // 启动计时器
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // 执行操作
    FloatingWindowModule.executeActions(
      playbackActions,
      lastSession.deviceInfo.width,
      lastSession.deviceInfo.height,
    );
  }, [lastSession]);

  // 停止执行回放
  const handleStopPlayback = useCallback(() => {
    console.log('停止回放');
    clearTimer();
    setIsPlaying(false);
    FloatingWindowModule.stopPlayback();
    FloatingWindowModule.updatePlayingState(false);
  }, [clearTimer]);

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

  // 更新悬浮窗状态
  useEffect(() => {
    if (isFloatingWindowVisible) {
      FloatingWindowModule.updateTime(formatTime(elapsedTime));
      // 只有在非执行状态时才更新录制状态
      if (!isPlaying) {
        FloatingWindowModule.updateRecordingState(isTaskRunning);
      }
    }
  }, [isFloatingWindowVisible, isTaskRunning, elapsedTime, isPlaying]);

  // 监听悬浮窗按钮事件
  useEffect(() => {
    if (!isFloatingWindowVisible) {
      return;
    }

    const startListener = FloatingWindowModule.addEventListener(
      'onStartRecording',
      handleStartTask,
    );

    const stopListener = FloatingWindowModule.addEventListener(
      'onStopRecording',
      handleEndTask,
    );

    const closeListener = FloatingWindowModule.addEventListener(
      'onClose',
      handleCloseFloatingWindow,
    );

    // 监听设备信息（录制开始时获取屏幕尺寸和方向）
    const deviceInfoListener = FloatingWindowModule.addEventListener(
      'onDeviceInfo',
      (data: DeviceInfoData) => {
        console.log(
          `设备信息: ${data.width}x${data.height}, 方向: ${data.orientation}`,
        );
        // 开始录制，使用原生端获取的屏幕尺寸和方向
        TouchRecorder.startRecording(data.width, data.height, data.orientation);
      },
    );

    // 监听触摸事件
    const touchListener = FloatingWindowModule.addEventListener(
      'onTouchRecorded',
      (data: TouchEventData) => {
        const touchRecord: TouchRecord = {
          x: data.x,
          y: data.y,
          timestamp: data.timestamp,
          type: data.type,
          pressure: data.pressure,
          pointerType: data.pointerType,
          velocityX: data.velocityX,
          velocityY: data.velocityY,
        };
        TouchRecorder.recordTouch(touchRecord);
        console.log(
          `触摸事件: ${data.type} at (${data.x.toFixed(0)}, ${data.y.toFixed(
            0,
          )}) ` +
            `pressure: ${(data.pressure ?? 0).toFixed(2)}, ` +
            `velocity: (${(data.velocityX ?? 0).toFixed(0)}, ${(
              data.velocityY ?? 0
            ).toFixed(0)})`,
        );
      },
    );

    // 监听开始执行事件
    const startPlaybackListener = FloatingWindowModule.addEventListener(
      'onStartPlayback',
      handleStartPlayback,
    );

    // 监听停止执行事件
    const stopPlaybackListener = FloatingWindowModule.addEventListener(
      'onStopPlayback',
      handleStopPlayback,
    );

    // 监听执行进度事件
    const playbackProgressListener = FloatingWindowModule.addEventListener(
      'onPlaybackProgress',
      (data: PlaybackProgressData) => {
        console.log(
          `执行进度: ${data.current}/${data.total}, 类型: ${data.type}`,
        );
      },
    );

    // 监听执行完成事件
    const playbackCompleteListener = FloatingWindowModule.addEventListener(
      'onPlaybackComplete',
      (data: PlaybackCompleteData) => {
        console.log(`执行完成，共执行 ${data.executedCount} 个操作`);
        clearTimer();
        setIsPlaying(false);
        FloatingWindowModule.updatePlayingState(false);
        Alert.alert('执行完成', `成功执行了 ${data.executedCount} 个操作`);
      },
    );

    // 监听执行停止事件
    const playbackStoppedListener = FloatingWindowModule.addEventListener(
      'onPlaybackStopped',
      () => {
        console.log('执行已停止');
        clearTimer();
        setIsPlaying(false);
        FloatingWindowModule.updatePlayingState(false);
      },
    );

    // 监听执行错误事件
    const playbackErrorListener = FloatingWindowModule.addEventListener(
      'onPlaybackError',
      (data: PlaybackErrorData) => {
        console.error('执行错误:', data.error);
        clearTimer();
        setIsPlaying(false);
        FloatingWindowModule.updatePlayingState(false);
        Alert.alert('执行错误', data.error);
      },
    );

    return () => {
      startListener.remove();
      stopListener.remove();
      closeListener.remove();
      deviceInfoListener.remove();
      touchListener.remove();
      startPlaybackListener.remove();
      stopPlaybackListener.remove();
      playbackProgressListener.remove();
      playbackCompleteListener.remove();
      playbackStoppedListener.remove();
      playbackErrorListener.remove();
    };
  }, [
    isFloatingWindowVisible,
    handleStartTask,
    handleEndTask,
    handleCloseFloatingWindow,
    handleStartPlayback,
    handleStopPlayback,
    clearTimer,
  ]);

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

  // 清理计时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
            style={styles.purpleCard}
            onPress={handleAutoClickerPress}
            disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
          />
          <FeatureCard
            title="自动滚动"
            subtitle="auto roll"
            backgroundColor="#80d0c7"
            width="half"
            style={styles.greenCard}
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
  purpleCard: {
    backgroundColor: '#a18cd1',
  },
  greenCard: {
    backgroundColor: '#43e97b',
  },
});
