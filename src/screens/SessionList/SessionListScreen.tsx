/**
 * 脚本列表页面
 * @description 展示已保存的录制脚本列表
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TouchRecorderService, FloatingWindowService } from '../../services';
import { formatDateTime, formatDuration } from '../../utils';
import type { RootStackParamList, RecordingSession } from '../../types';
import { styles } from './SessionListScreen.styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SessionItemProps {
  session: RecordingSession;
  onPress: () => void;
  onDelete: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  onPress,
  onDelete,
}) => {
  const stats = TouchRecorderService.getSessionStats(session);
  const startDate = new Date(session.startTime);
  const duration = Math.floor(stats.duration / 1000);
  const durationStr = formatDuration(duration);

  const displayName = session.name || formatDateTime(startDate);
  const hasName = !!session.name;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.sessionItem,
        pressed && styles.sessionItemPressed,
      ]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(102, 126, 234, 0.15)', borderless: false }}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTitleContainer}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {displayName}
          </Text>
          {hasName && (
            <Text style={styles.sessionSubtitle}>
              {formatDateTime(startDate)}
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          android_ripple={{ color: 'rgba(255, 71, 87, 0.2)', borderless: true }}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </Pressable>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{durationStr}</Text>
          <Text style={styles.statLabel}>时长</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalTouches}</Text>
          <Text style={styles.statLabel}>总触摸</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.taps}</Text>
          <Text style={styles.statLabel}>点击</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.swipes}</Text>
          <Text style={styles.statLabel}>滑动</Text>
        </View>
      </View>
    </Pressable>
  );
};

export const SessionListScreen: React.FC = () => {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const loadSessions = useCallback(async () => {
    setRefreshing(true);
    const allSessions = await TouchRecorderService.getAllSessions();
    allSessions.sort((a, b) => b.startTime - a.startTime);
    setSessions(allSessions);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const executeScript = useCallback(
    async (session: RecordingSession) => {
      if (Platform.OS === 'android') {
        const accessibilityEnabled =
          await FloatingWindowService.isAccessibilityServiceEnabled();

        if (!accessibilityEnabled) {
          Alert.alert(
            '需要开启无障碍服务',
            '执行脚本需要无障碍服务权限才能正常工作。\n\n请在设置中为本应用开启无障碍服务。',
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

      navigation.navigate('Home', { sessionToExecute: session });
    },
    [navigation],
  );

  const handleSessionPress = (session: RecordingSession) => {
    const displayName =
      session.name || formatDateTime(new Date(session.startTime));
    const stats = TouchRecorderService.getSessionStats(session);
    const duration = Math.floor(stats.duration / 1000);

    Alert.alert(
      '确认执行',
      `是否确认执行【${displayName}】脚本？\n\n` +
        `该脚本包含 ${stats.totalTouches} 个操作\n` +
        `时长: ${formatDuration(duration)}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认执行',
          onPress: () => executeScript(session),
        },
      ],
    );
  };

  const handleDeleteSession = (session: RecordingSession) => {
    Alert.alert('确认删除', '确定要删除这个会话吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await TouchRecorderService.deleteSession(session.id);
          loadSessions();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (sessions.length === 0) {
      Alert.alert('提示', '没有会话可以清空');
      return;
    }

    Alert.alert('确认清空', '确定要删除所有会话吗？此操作无法撤销。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          await TouchRecorderService.clearAllSessions();
          loadSessions();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {sessions.length > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.sessionCount}>共 {sessions.length} 个脚本</Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearButtonText}>清空全部</Text>
          </TouchableOpacity>
        </View>
      )}

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>还没有录制脚本</Text>
          <Text style={styles.emptySubtext}>
            点击首页 Banner 开始录制自动化脚本
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <SessionItem
              session={item}
              onPress={() => handleSessionPress(item)}
              onDelete={() => handleDeleteSession(item)}
            />
          )}
          refreshing={refreshing}
          onRefresh={loadSessions}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 16 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

