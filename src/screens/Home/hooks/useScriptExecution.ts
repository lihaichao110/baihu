/**
 * 脚本执行相关 Hook
 * @description 处理从脚本列表页面传来的待执行脚本
 */

import { useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FloatingWindowService, TouchRecorderService } from '../../../services';
import type { RootStackParamList, RecordingSession } from '../../../types';

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;
type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export const useScriptExecution = (
  setLastSession: (session: RecordingSession | null) => void,
  lastSessionRef: React.MutableRefObject<RecordingSession | null>,
  setIsFloatingWindowVisible: (visible: boolean) => void,
  setIsTaskRunning: (running: boolean) => void,
) => {
  const route = useRoute<HomeScreenRouteProp>();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleSessionToExecute = useCallback(
    (sessionToExecute: RecordingSession | null) => {
      if (!sessionToExecute) {
        return;
      }

      console.log(
        '从脚本列表加载待执行脚本:',
        sessionToExecute.name || sessionToExecute.id,
        '操作数:',
        sessionToExecute.actions?.length || 0,
      );

      FloatingWindowService.stopPlayback();

      setLastSession(sessionToExecute);
      lastSessionRef.current = sessionToExecute;

      console.log(
        '脚本数据已更新，准备执行:',
        sessionToExecute.name || sessionToExecute.id,
      );

      setIsFloatingWindowVisible(true);
      FloatingWindowService.showFloatingWindow();
      FloatingWindowService.setPlayButtonVisible(true);
      FloatingWindowService.setSaveButtonVisible(false);

      navigation.setParams({ sessionToExecute: undefined });
    },
    [navigation, setIsFloatingWindowVisible, setLastSession, lastSessionRef],
  );

  // 处理从脚本列表页面传来的待执行脚本
  useEffect(() => {
    handleSessionToExecute(route.params?.sessionToExecute || null);
  }, [route.params?.sessionToExecute, handleSessionToExecute]);
};

