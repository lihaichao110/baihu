import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import TouchRecorder, { RecordingSession } from '../utils/TouchRecorder';
import colors from '../theme/colors';

interface SessionItemProps {
  session: RecordingSession;
  onPress: () => void;
  onDelete: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, onPress, onDelete }) => {
  const stats = TouchRecorder.getSessionStats(session);
  const startDate = new Date(session.startTime);
  const duration = Math.floor(stats.duration / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <TouchableOpacity style={styles.sessionItem} onPress={onPress}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>
          {startDate.toLocaleDateString()} {startDate.toLocaleTimeString()}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{minutes}:{seconds.toString().padStart(2, '0')}</Text>
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
    </TouchableOpacity>
  );
};

export const SessionListScreen: React.FC = () => {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    setRefreshing(true);
    const allSessions = await TouchRecorder.getAllSessions();
    // 按时间倒序排列
    allSessions.sort((a, b) => b.startTime - a.startTime);
    setSessions(allSessions);
    setRefreshing(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSessionPress = (session: RecordingSession) => {
    const stats = TouchRecorder.getSessionStats(session);
    const startDate = new Date(session.startTime);
    const duration = Math.floor(stats.duration / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    Alert.alert(
      '会话详情',
      `开始时间: ${startDate.toLocaleString()}\n` +
      `时长: ${minutes}:${seconds.toString().padStart(2, '0')}\n` +
      `总触摸事件: ${stats.totalTouches}\n` +
      `点击次数: ${stats.taps}\n` +
      `滑动次数: ${stats.swipes}\n` +
      `设备分辨率: ${session.deviceInfo.width}x${session.deviceInfo.height}`,
      [
        {
          text: '导出JSON',
          onPress: () => {
            const json = TouchRecorder.exportSessionToJSON(session);
            console.log('导出的会话数据:', json);
            Alert.alert('导出成功', '会话数据已输出到控制台');
          },
        },
        { text: '关闭' },
      ],
    );
  };

  const handleDeleteSession = (session: RecordingSession) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个会话吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await TouchRecorder.deleteSession(session.id);
            loadSessions();
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    if (sessions.length === 0) {
      Alert.alert('提示', '没有会话可以清空');
      return;
    }

    Alert.alert(
      '确认清空',
      '确定要删除所有会话吗？此操作无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            await TouchRecorder.clearAllSessions();
            loadSessions();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>录制会话</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAll}
          disabled={sessions.length === 0}
        >
          <Text style={[
            styles.clearButtonText,
            sessions.length === 0 && styles.clearButtonTextDisabled,
          ]}>
            清空全部
          </Text>
        </TouchableOpacity>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>还没有录制会话</Text>
          <Text style={styles.emptySubtext}>开始录制自动任务来创建会话</Text>
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
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonTextDisabled: {
    opacity: 0.5,
  },
  listContent: {
    padding: 16,
  },
  sessionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

