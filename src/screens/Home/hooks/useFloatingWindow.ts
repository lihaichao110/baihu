/**
 * 悬浮窗相关 Hook
 * @description 管理悬浮窗、录制、触摸事件等功能
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { FloatingWindowService, TouchRecorderService } from '../../../services';
import type {
  DeviceInfoData,
  TouchEventData,
  PlaybackProgressData,
  PlaybackCompleteData,
  RecordingSession,
  TouchRecord,
} from '../../../types';

interface UseFloatingWindowProps {
  setLastSession: (session: RecordingSession | null) => void;
  setPendingSession: (session: RecordingSession | null) => void;
  lastSessionRef: React.MutableRefObject<RecordingSession | null>;
  startPlayback: () => void;
  stopPlayback: () => void;
  onPlaybackComplete: () => void;
  onPlaybackStopped: () => void;
  onPlaybackError: (error: string) => void;
  onOpenSaveModal?: () => void;
}

export const useFloatingWindow = ({
  setLastSession,
  setPendingSession,
  lastSessionRef,
  startPlayback,
  stopPlayback,
  onPlaybackComplete,
  onPlaybackStopped,
  onPlaybackError,
  onOpenSaveModal,
}: UseFloatingWindowProps) => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [isFloatingWindowVisible, setIsFloatingWindowVisible] = useState(false);

  const startRecordingInternal = useCallback(() => {
    setIsTaskRunning(true);
    // 等待一小段时间，确保事件监听器已经注册
    setTimeout(() => {
      FloatingWindowService.showOverlay();
      console.log('任务已开始，开始记录触摸位置');
    }, 100);
  }, []);

  const handleStartTask = useCallback(async () => {
    // 开始录制时，清除之前加载的脚本数据（包括从脚本集合加载的待执行数据）
    console.log('🎬 开始新录制，清除之前的脚本数据');
    setLastSession(null);
    setPendingSession(null);
    lastSessionRef.current = null;

    // 隐藏播放和保存按钮，因为这是新的录制
    FloatingWindowService.setPlayButtonVisible(false);
    FloatingWindowService.setSaveButtonVisible(false);

    startRecordingInternal();

    console.log('🎬 开始按钮已点击，等待 onDeviceInfo 事件来启动录制');
  }, [startRecordingInternal, setLastSession, setPendingSession, lastSessionRef]);

  const handleEndTask = useCallback(() => {
    setIsTaskRunning(false);
    FloatingWindowService.hideOverlay();

    // 检查录制状态
    const isRecording = TouchRecorderService.isCurrentlyRecording();
    console.log('停止录制时，isRecording 状态:', isRecording);

    // 获取当前会话
    const currentSession = TouchRecorderService.getCurrentSession();
    console.log('当前会话:', currentSession ? `${currentSession.id}, 操作数: ${currentSession.actions.length}` : 'null');

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
      console.log('✅ 录制完成，等待用户保存或执行');
    } else {
      FloatingWindowService.setPlayButtonVisible(false);
      FloatingWindowService.setSaveButtonVisible(false);
      setPendingSession(null);
      lastSessionRef.current = null;

      const errorMessage = session
        ? '没有记录到任何操作。\n\n可能的原因:\n• 屏幕上没有进行触摸操作\n• 触摸事件被系统拦截\n\n请重新尝试录制。'
        : '未能获取到录制数据。\n\n可能的原因:\n• 录制未正确启动（未收到设备信息）\n• 录制过程中发生错误\n• 停止按钮点击太快\n\n请检查控制台日志获取更多信息，并确保:\n• 等待悬浮窗出现后再进行触摸\n• 在蒙层上进行至少一次点击或滑动';

      Alert.alert(
        '录制结束',
        errorMessage,
        [{ text: '确定' }],
      );
    }

    console.log('任务已结束');
  }, [setLastSession, setPendingSession, lastSessionRef]);

  const handleCloseFloatingWindow = useCallback(() => {
    stopPlayback();
    setIsTaskRunning(false);
    FloatingWindowService.hideOverlay();
    FloatingWindowService.hideFloatingWindow();
    setIsFloatingWindowVisible(false);
  }, [stopPlayback]);

  const handleDeviceInfo = useCallback((data: DeviceInfoData) => {
    console.log(
      `设备信息: ${data.width}x${data.height}, 方向: ${data.orientation}`,
    );
    try {
      TouchRecorderService.startRecording(data.width, data.height, data.orientation);
      console.log('✅ 录制已启动，可以开始记录触摸事件');
    } catch (error) {
      console.error('❌ 启动录制失败:', error);
    }
  }, []);

  const handleTouchRecorded = useCallback((data: TouchEventData) => {
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
  }, []);

  const handlePlaybackProgress = useCallback((data: PlaybackProgressData) => {
    console.log(`执行进度: ${data.current}/${data.total}, 类型: ${data.type}`);
  }, []);

  const handlePlaybackComplete = useCallback((data: PlaybackCompleteData) => {
    console.log(`执行完成，共执行 ${data.executedCount} 个操作`);
    onPlaybackComplete();
  }, [onPlaybackComplete]);

  const openFloatingWindow = useCallback(() => {
    setIsFloatingWindowVisible(true);
    FloatingWindowService.showFloatingWindow();
  }, []);

  const closeFloatingWindow = useCallback(() => {
    setIsFloatingWindowVisible(false);
    FloatingWindowService.hideFloatingWindow();
  }, []);

  // 监听悬浮窗事件
  useEffect(() => {
    if (!isFloatingWindowVisible) {
      return;
    }

    const listeners = [
      FloatingWindowService.addEventListener('onStartRecording', handleStartTask),
      FloatingWindowService.addEventListener('onStopRecording', handleEndTask),
      FloatingWindowService.addEventListener('onClose', handleCloseFloatingWindow),
      FloatingWindowService.addEventListener('onDeviceInfo', handleDeviceInfo),
      FloatingWindowService.addEventListener('onTouchRecorded', handleTouchRecorded),
      FloatingWindowService.addEventListener('onStartPlayback', startPlayback),
      FloatingWindowService.addEventListener('onStopPlayback', stopPlayback),
      FloatingWindowService.addEventListener('onPlaybackProgress', handlePlaybackProgress),
      FloatingWindowService.addEventListener('onPlaybackComplete', handlePlaybackComplete),
      FloatingWindowService.addEventListener('onPlaybackStopped', onPlaybackStopped),
      FloatingWindowService.addEventListener('onPlaybackError', (data: { error: string }) => {
        onPlaybackError(data.error);
      }),
    ];

    if (onOpenSaveModal) {
      listeners.push(
        FloatingWindowService.addEventListener('onSaveRecording', onOpenSaveModal),
      );
    }

    return () => {
      listeners.forEach(listener => listener.remove());
    };
  }, [
    isFloatingWindowVisible,
    handleStartTask,
    handleEndTask,
    handleCloseFloatingWindow,
    handleDeviceInfo,
    handleTouchRecorded,
    startPlayback,
    stopPlayback,
    handlePlaybackProgress,
    handlePlaybackComplete,
    onPlaybackStopped,
    onPlaybackError,
    onOpenSaveModal,
  ]);

  // 更新录制状态
  useEffect(() => {
    if (isFloatingWindowVisible) {
      FloatingWindowService.updateRecordingState(isTaskRunning);
    }
  }, [isFloatingWindowVisible, isTaskRunning]);

  return {
    isTaskRunning,
    isFloatingWindowVisible,
    openFloatingWindow,
    closeFloatingWindow,
  };
};

