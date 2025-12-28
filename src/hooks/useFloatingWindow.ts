/**
 * 悬浮窗管理 Hook
 * @description 管理悬浮窗的显示、录制和回放状态
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { FloatingWindowService, TouchRecorderService } from '../services';
import type {
  RecordingSession,
  TouchRecord,
  PlaybackAction,
  TouchEventData,
  DeviceInfoData,
  PlaybackProgressData,
  PlaybackCompleteData,
  PlaybackErrorData,
} from '../types';
import { generateDefaultScriptName } from '../utils';

interface UseFloatingWindowReturn {
  /** 悬浮窗是否可见 */
  isVisible: boolean;
  /** 是否正在录制 */
  isRecording: boolean;
  /** 是否正在回放 */
  isPlaying: boolean;
  /** 最后一次的录制会话 */
  lastSession: RecordingSession | null;
  /** 待保存的会话 */
  pendingSession: RecordingSession | null;
  /** 显示悬浮窗 */
  show: () => void;
  /** 隐藏悬浮窗 */
  hide: () => void;
  /** 开始录制 */
  startRecording: () => void;
  /** 停止录制 */
  stopRecording: () => void;
  /** 开始回放 */
  startPlayback: () => void;
  /** 停止回放 */
  stopPlayback: () => void;
  /** 设置待执行的会话 */
  setSessionToExecute: (session: RecordingSession) => void;
  /** 保存会话 */
  saveSession: (name: string) => Promise<void>;
  /** 清除待保存的会话 */
  clearPendingSession: () => void;
  /** 生成默认脚本名称 */
  getDefaultScriptName: () => string;
}

export function useFloatingWindow(): UseFloatingWindowReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastSession, setLastSession] = useState<RecordingSession | null>(null);
  const [pendingSession, setPendingSession] = useState<RecordingSession | null>(null);

  // 使用 ref 避免闭包陷阱
  const lastSessionRef = useRef<RecordingSession | null>(null);
  const isPlayingRef = useRef(false);

  // 同步 ref
  useEffect(() => {
    lastSessionRef.current = lastSession;
  }, [lastSession]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 显示悬浮窗
  const show = useCallback(() => {
    setIsVisible(true);
    FloatingWindowService.showFloatingWindow();
  }, []);

  // 隐藏悬浮窗
  const hide = useCallback(() => {
    if (isPlayingRef.current) {
      FloatingWindowService.stopPlayback();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
    
    setIsRecording(false);
    FloatingWindowService.hideOverlay();
    FloatingWindowService.hideFloatingWindow();
    setIsVisible(false);
  }, []);

  // 开始录制
  const startRecording = useCallback(() => {
    setIsRecording(true);
    FloatingWindowService.showOverlay();
    console.log('任务已开始，开始记录触摸位置');
  }, []);

  // 停止录制
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    FloatingWindowService.hideOverlay();

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
          : '未能获取到录制数据。',
        [{ text: '确定' }],
      );
    }
  }, []);

  // 开始回放
  const startPlayback = useCallback(() => {
    const currentSession = lastSessionRef.current;
    
    if (isPlayingRef.current) {
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

  // 停止回放
  const stopPlayback = useCallback(() => {
    console.log('停止回放');
    setIsPlaying(false);
    isPlayingRef.current = false;
    FloatingWindowService.stopPlayback();
    FloatingWindowService.updatePlayingState(false);
  }, []);

  // 设置待执行的会话
  const setSessionToExecute = useCallback((session: RecordingSession) => {
    // 停止可能正在进行的回放
    FloatingWindowService.stopPlayback();
    setIsPlaying(false);
    isPlayingRef.current = false;

    // 如果正在录制，先停止
    if (isRecording) {
      FloatingWindowService.hideOverlay();
      TouchRecorderService.stopRecording();
      setIsRecording(false);
    }

    // 清除待保存会话
    setPendingSession(null);

    // 更新会话
    lastSessionRef.current = session;
    setLastSession(session);

    // 显示悬浮窗
    setIsVisible(true);
    FloatingWindowService.showFloatingWindow();
    FloatingWindowService.setPlayButtonVisible(true);
    FloatingWindowService.setSaveButtonVisible(false);
  }, [isRecording]);

  // 保存会话
  const saveSession = useCallback(async (name: string) => {
    if (!pendingSession) {
      throw new Error('没有待保存的录制数据');
    }

    await TouchRecorderService.saveSessionWithName(pendingSession, name);
    console.log(`脚本已保存: ${name}`);
    
    FloatingWindowService.setSaveButtonVisible(false);
    setPendingSession(null);
  }, [pendingSession]);

  // 清除待保存会话
  const clearPendingSession = useCallback(() => {
    setPendingSession(null);
  }, []);

  // 生成默认脚本名称
  const getDefaultScriptName = useCallback(() => {
    return generateDefaultScriptName();
  }, []);

  // 更新悬浮窗状态
  useEffect(() => {
    if (isVisible && !isPlaying) {
      FloatingWindowService.updateRecordingState(isRecording);
    }
  }, [isVisible, isRecording, isPlaying]);

  return {
    isVisible,
    isRecording,
    isPlaying,
    lastSession,
    pendingSession,
    show,
    hide,
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    setSessionToExecute,
    saveSession,
    clearPendingSession,
    getDefaultScriptName,
  };
}

