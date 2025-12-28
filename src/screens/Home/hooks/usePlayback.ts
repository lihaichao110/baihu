/**
 * 播放控制相关 Hook
 * @description 管理脚本的播放、停止和播放状态
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { FloatingWindowService } from '../../../services';
import type { RecordingSession, PlaybackAction } from '../../../types';

interface UsePlaybackProps {
  lastSessionRef?: React.MutableRefObject<RecordingSession | null>;
}

export const usePlayback = (props?: UsePlaybackProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const internalLastSessionRef = useRef<RecordingSession | null>(null);

  // 使用外部传入的 ref，如果没有则使用内部 ref
  const lastSessionRef = props?.lastSessionRef || internalLastSessionRef;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const setLastSession = useCallback((session: RecordingSession | null) => {
    internalLastSessionRef.current = session;
  }, [internalLastSessionRef]);

  const startPlayback = useCallback(() => {
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
  }, [lastSessionRef]);

  const stopPlayback = useCallback(() => {
    console.log('停止回放');
    setIsPlaying(false);
    isPlayingRef.current = false;
    FloatingWindowService.stopPlayback();
    FloatingWindowService.updatePlayingState(false);
  }, []);

  const onPlaybackComplete = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    FloatingWindowService.updatePlayingState(false);
  }, []);

  const onPlaybackStopped = useCallback(() => {
    console.log('执行已停止');
    setIsPlaying(false);
    isPlayingRef.current = false;
    FloatingWindowService.updatePlayingState(false);
  }, []);

  const onPlaybackError = useCallback((error: string) => {
    console.error('执行错误:', error);
    setIsPlaying(false);
    isPlayingRef.current = false;
    FloatingWindowService.updatePlayingState(false);
    Alert.alert('执行错误', error);
  }, []);

  return {
    isPlaying,
    setLastSession,
    startPlayback,
    stopPlayback,
    onPlaybackComplete,
    onPlaybackStopped,
    onPlaybackError,
    isPlayingRef,
  };
};

