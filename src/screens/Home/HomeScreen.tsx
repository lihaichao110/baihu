/**
 * 首页
 * @description 应用主页面，展示功能入口和自动任务控制
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  View,
  StatusBar,
  Alert,
  Platform,
  NativeModules,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header, Banner, FeatureCard, ToolGrid } from '../../components';
import { colors } from '../../theme';
import { AccessibilityService, FloatingWindowService, TouchRecorderService } from '../../services';
import type {
  RootStackParamList,
  RecordingSession,
  TouchRecord,
  PlaybackAction,
  TouchEventData,
  DeviceInfoData,
  PlaybackProgressData,
  PlaybackCompleteData,
  PlaybackErrorData,
} from '../../types';
import { generateDefaultScriptName } from '../../utils';
import { styles } from './HomeScreen.styles';

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;
type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

// 导入自定义的悬浮窗权限模块
const { OverlayPermissionModule } = NativeModules;

export const HomeScreen: React.FC = () => {
  const route = useRoute<HomeScreenRouteProp>();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [isFloatingWindowVisible, setIsFloatingWindowVisible] = useState(false);
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastSession, setLastSession] = useState<RecordingSession | null>(null);
  const [pendingSession, setPendingSession] = useState<RecordingSession | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scriptName, setScriptName] = useState('');

  const lastSessionRef = useRef<RecordingSession | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    lastSessionRef.current = lastSession;
  }, [lastSession]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 处理从脚本列表页面传来的待执行脚本
  useEffect(() => {
    const sessionToExecute = route.params?.sessionToExecute;
    if (sessionToExecute) {
      console.log(
        '从脚本列表加载待执行脚本:',
        sessionToExecute.name || sessionToExecute.id,
        '操作数:',
        sessionToExecute.actions?.length || 0,
      );

      FloatingWindowService.stopPlayback();
      setIsPlaying(false);
      isPlayingRef.current = false;

      if (isTaskRunning) {
        FloatingWindowService.hideOverlay();
        TouchRecorderService.stopRecording();
        setIsTaskRunning(false);
      }

      setPendingSession(null);
      lastSessionRef.current = sessionToExecute;
      setLastSession(sessionToExecute);

      console.log(
        '脚本数据已更新，准备执行:',
        sessionToExecute.name || sessionToExecute.id,
      );

      setIsFloatingWindowVisible(true);
      FloatingWindowService.showFloatingWindow();
      FloatingWindowService.setPlayButtonVisible(true);
      FloatingWindowService.setSaveButtonVisible(false);

      navigation.setParams({ sessionToExecute: undefined });
    }
  }, [route.params?.sessionToExecute, navigation, isTaskRunning]);

  const handleAutoTaskPress = async () => {
    if (isFloatingWindowVisible) {
      return;
    }

    try {
      if (Platform.OS === 'android') {
        const accessibilityEnabled =
          await FloatingWindowService.isAccessibilityServiceEnabled();

        if (!accessibilityEnabled) {
          Alert.alert(
            '需要开启无障碍服务',
            '自动任务需要无障碍服务权限才能正常工作。\n\n请在设置中为本应用开启无障碍服务。',
            [
              { text: '取消', style: 'cancel' },
              {
                text: '去设置',
                onPress: () => {
                  FloatingWindowService.openAccessibilitySettings();
                },
              },
            ],
          );
          return;
        }

        setIsAccessibilityEnabled(true);
      }

      setIsTaskRunning(false);
      setIsFloatingWindowVisible(true);
      FloatingWindowService.showFloatingWindow();
    } catch (error) {
      console.error('打开自动任务失败:', error);
      Alert.alert('错误', '无法启动自动任务，请稍后重试');
    }
  };

  const startRecordingInternal = useCallback(() => {
    setIsTaskRunning(true);
    FloatingWindowService.showOverlay();
    console.log('任务已开始，开始记录触摸位置');
  }, []);

  const handleStartTask = useCallback(async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();
      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '触摸穿透功能需要无障碍服务权限。开启后，您在蒙层上的操作会同时作用到下层应用。',
          [
            {
              text: '仅录制',
              style: 'cancel',
              onPress: () => {
                startRecordingInternal();
              },
            },
            {
              text: '去设置',
              onPress: () => {
                FloatingWindowService.openAccessibilitySettings();
              },
            },
          ],
        );
        return;
      }
    }

    startRecordingInternal();
  }, [startRecordingInternal]);

  const handleEndTask = useCallback(() => {
    setIsTaskRunning(false);
    FloatingWindowService.hideOverlay();

    const wasRecording = TouchRecorderService.isCurrentlyRecording();
    console.log('结束任务时录制状态:', wasRecording);

    const session = TouchRecorderService.stopRecording();
    console.log(
      '停止录制返回的会话:',
      session ? `${session.id}, 操作数: ${session.actions.length}` : 'null',
    );

    if (session && session.actions.length > 0) {
      setPendingSession(session);
      lastSessionRef.current = session;
      setLastSession(session);
      FloatingWindowService.setPlayButtonVisible(true);
      FloatingWindowService.setSaveButtonVisible(true);
      console.log('录制完成，等待用户保存或执行');
    } else {
      FloatingWindowService.setPlayButtonVisible(false);
      FloatingWindowService.setSaveButtonVisible(false);
      setPendingSession(null);
      lastSessionRef.current = null;
      Alert.alert(
        '录制结束',
        session
          ? '没有记录到任何操作。'
          : '未能获取到录制数据。\n\n可能的原因:\n• 录制未正确启动\n• 录制过程中发生错误\n\n请检查控制台日志获取更多信息。',
        [{ text: '确定' }],
      );
    }

    console.log('任务已结束');
  }, []);

  const handleCloseFloatingWindow = useCallback(() => {
    if (isPlayingRef.current) {
      FloatingWindowService.stopPlayback();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }

    setIsTaskRunning(false);
    FloatingWindowService.hideOverlay();
    FloatingWindowService.hideFloatingWindow();
    setIsFloatingWindowVisible(false);
  }, []);

  const handleStartPlayback = useCallback(() => {
    const currentSession = lastSessionRef.current;
    const currentlyPlaying = isPlayingRef.current;

    if (currentlyPlaying) {
      console.log('已经在执行中，忽略重复调用');
      return;
    }

    if (!currentSession || currentSession.actions.length === 0) {
      Alert.alert('提示', '没有可执行的操作记录');
      return;
    }

    console.log(
      '开始执行回放，脚本:',
      currentSession.name || currentSession.id,
      '操作数:',
      currentSession.actions.length,
    );

    const playbackActions: PlaybackAction[] = currentSession.actions.map(
      action => ({
        type: action.type,
        normalizedX: action.coordinates.normalizedX,
        normalizedY: action.coordinates.normalizedY,
        timestamp: action.timestamp,
      }),
    );

    setIsPlaying(true);
    isPlayingRef.current = true;
    FloatingWindowService.updatePlayingState(true);

    FloatingWindowService.executeActions(
      playbackActions,
      currentSession.deviceInfo.width,
      currentSession.deviceInfo.height,
    );
  }, []);

  const handleStopPlayback = useCallback(() => {
    console.log('停止回放');
    setIsPlaying(false);
    isPlayingRef.current = false;
    FloatingWindowService.stopPlayback();
    FloatingWindowService.updatePlayingState(false);
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (!pendingSession) {
      Alert.alert('错误', '没有待保存的录制数据');
      setShowSaveModal(false);
      return;
    }

    const trimmedName = scriptName.trim();
    if (!trimmedName) {
      Alert.alert('提示', '请输入脚本名称');
      return;
    }

    try {
      await TouchRecorderService.saveSessionWithName(pendingSession, trimmedName);
      console.log(`脚本已保存: ${trimmedName}`);

      setShowSaveModal(false);
      setScriptName('');
      FloatingWindowService.setSaveButtonVisible(false);
      setPendingSession(null);

      Alert.alert('保存成功', `脚本「${trimmedName}」已保存到本地`);
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('保存失败', '保存脚本时发生错误，请重试');
    }
  }, [pendingSession, scriptName]);

  const handleCancelSave = useCallback(() => {
    setShowSaveModal(false);
    setScriptName('');
  }, []);

  const handleAutoClickerPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动连点器需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowService.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动连点器功能开发中...');
  };

  const handleAutoScrollPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动滚动需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowService.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动滚动功能开发中...');
  };

  const handleAutoRefreshPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动刷新需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowService.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动刷新功能开发中...');
  };

  useEffect(() => {
    if (isFloatingWindowVisible) {
      if (!isPlaying) {
        FloatingWindowService.updateRecordingState(isTaskRunning);
      }
    }
  }, [isFloatingWindowVisible, isTaskRunning, isPlaying]);

  useEffect(() => {
    if (!isFloatingWindowVisible) {
      return;
    }

    const startListener = FloatingWindowService.addEventListener(
      'onStartRecording',
      handleStartTask,
    );

    const stopListener = FloatingWindowService.addEventListener(
      'onStopRecording',
      handleEndTask,
    );

    const closeListener = FloatingWindowService.addEventListener(
      'onClose',
      handleCloseFloatingWindow,
    );

    const deviceInfoListener = FloatingWindowService.addEventListener(
      'onDeviceInfo',
      (data: DeviceInfoData) => {
        console.log(
          `设备信息: ${data.width}x${data.height}, 方向: ${data.orientation}`,
        );
        TouchRecorderService.startRecording(data.width, data.height, data.orientation);
      },
    );

    const touchListener = FloatingWindowService.addEventListener(
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
        TouchRecorderService.recordTouch(touchRecord);
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

    const startPlaybackListener = FloatingWindowService.addEventListener(
      'onStartPlayback',
      handleStartPlayback,
    );

    const stopPlaybackListener = FloatingWindowService.addEventListener(
      'onStopPlayback',
      handleStopPlayback,
    );

    const playbackProgressListener = FloatingWindowService.addEventListener(
      'onPlaybackProgress',
      (data: PlaybackProgressData) => {
        console.log(
          `执行进度: ${data.current}/${data.total}, 类型: ${data.type}`,
        );
      },
    );

    const playbackCompleteListener = FloatingWindowService.addEventListener(
      'onPlaybackComplete',
      (data: PlaybackCompleteData) => {
        console.log(`执行完成，共执行 ${data.executedCount} 个操作`);
        setIsPlaying(false);
        isPlayingRef.current = false;
        FloatingWindowService.updatePlayingState(false);
      },
    );

    const playbackStoppedListener = FloatingWindowService.addEventListener(
      'onPlaybackStopped',
      () => {
        console.log('执行已停止');
        setIsPlaying(false);
        isPlayingRef.current = false;
        FloatingWindowService.updatePlayingState(false);
      },
    );

    const playbackErrorListener = FloatingWindowService.addEventListener(
      'onPlaybackError',
      (data: PlaybackErrorData) => {
        console.error('执行错误:', data.error);
        setIsPlaying(false);
        isPlayingRef.current = false;
        FloatingWindowService.updatePlayingState(false);
        Alert.alert('执行错误', data.error);
      },
    );

    const saveRecordingListener = FloatingWindowService.addEventListener(
      'onSaveRecording',
      () => {
        console.log('保存按钮被点击');
        setScriptName(generateDefaultScriptName());
        setShowSaveModal(true);
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
      saveRecordingListener.remove();
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
  ]);

  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const checkInitialStatus = async () => {
      if (Platform.OS === 'android') {
        const enabled =
          await FloatingWindowService.isAccessibilityServiceEnabled();
        setIsAccessibilityEnabled(enabled);
      }
    };
    checkInitialStatus();

    const setupListener = async () => {
      removeListener =
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
    };
    setupListener();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isFloatingWindowVisible]);

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

      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelSave}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>保存脚本</Text>
            <Text style={styles.modalSubtitle}>
              请为录制的操作命名，方便后续查找和使用
            </Text>
            <TextInput
              style={styles.modalInput}
              value={scriptName}
              onChangeText={setScriptName}
              placeholder="请输入脚本名称"
              placeholderTextColor="#999"
              autoFocus={true}
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancelSave}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleConfirmSave}
              >
                <Text style={styles.modalConfirmText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

