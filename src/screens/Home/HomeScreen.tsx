/**
 * 首页
 * @description 应用主页面，展示功能入口和自动任务控制
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, StatusBar, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header, Banner, ToolGrid } from '../../components';
import { colors } from '../../theme';
import { FloatingWindowService, TouchRecorderService } from '../../services';
import type { RecordingSession } from '../../types';
import { generateDefaultScriptName } from '../../utils';
import { styles } from './HomeScreen.styles';
import { SaveModal, FeatureSection } from './components';
import {
  useAccessibility,
  useScriptExecution,
  usePlayback,
  useFloatingWindow,
} from './hooks';

export const HomeScreen: React.FC = () => {
  // 辅助函数 - 需要在使用前声明
  const setIsFloatingWindowVisible = useCallback(
    (visible: boolean, open: () => void, close: () => void) => {
      if (visible) {
        open();
      } else {
        close();
      }
    },
    [],
  );

  const setIsTaskRunning = useCallback((_running: boolean) => {
    // 由 useFloatingWindow 内部管理
  }, []);

  // 状态管理
  const [lastSession, setLastSession] = useState<RecordingSession | null>(null);
  const [pendingSession, setPendingSession] = useState<RecordingSession | null>(
    null,
  );

  // 创建 ref 以保持 lastSession 的最新引用
  const lastSessionRef = React.useRef<RecordingSession | null>(null);

  // 同步 lastSession 到 ref
  React.useEffect(() => {
    lastSessionRef.current = lastSession;
  }, [lastSession]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scriptName, setScriptName] = useState('');

  // 使用自定义 Hooks
  const isAccessibilityEnabled = useAccessibility(false);

  const {
    startPlayback,
    stopPlayback,
    onPlaybackComplete,
    onPlaybackStopped,
    onPlaybackError,
  } = usePlayback({ lastSessionRef });

  const { isFloatingWindowVisible, openFloatingWindow, closeFloatingWindow } =
    useFloatingWindow({
      setLastSession,
      setPendingSession,
      lastSessionRef,
      startPlayback,
      stopPlayback,
      onPlaybackComplete,
      onPlaybackStopped,
      onPlaybackError,
      onOpenSaveModal: () => {
        console.log('保存按钮被点击');
        setScriptName(generateDefaultScriptName());
        setShowSaveModal(true);
      },
    });

  useScriptExecution(
    setLastSession,
    lastSessionRef,
    (visible: boolean) =>
      setIsFloatingWindowVisible(
        visible,
        openFloatingWindow,
        closeFloatingWindow,
      ),
    setIsTaskRunning,
  );

  // 自动任务按钮处理
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
      }

      openFloatingWindow();
    } catch (error) {
      console.error('打开自动任务失败:', error);
      Alert.alert('错误', '无法启动自动任务，请稍后重试');
    }
  };

  // 保存脚本确认
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
      await TouchRecorderService.saveSessionWithName(
        pendingSession,
        trimmedName,
      );
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

  // 取消保存
  const handleCancelSave = useCallback(() => {
    setShowSaveModal(false);
    setScriptName('');
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

        <FeatureSection isAccessibilityEnabled={isAccessibilityEnabled} />

        <ToolGrid />
      </ScrollView>

      <SaveModal
        visible={showSaveModal}
        scriptName={scriptName}
        onScriptNameChange={setScriptName}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
      />
    </SafeAreaView>
  );
};
