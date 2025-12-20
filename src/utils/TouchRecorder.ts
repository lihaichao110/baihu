import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TouchRecord {
  x: number;
  y: number;
  timestamp: number;
  type: 'tap' | 'swipe_start' | 'swipe_move' | 'swipe_end';
}

export interface RecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  touches: TouchRecord[];
  deviceInfo: {
    width: number;
    height: number;
  };
}

class TouchRecorder {
  private currentSession: RecordingSession | null = null;
  private isRecording: boolean = false;

  /**
   * 开始新的录制会话
   */
  startRecording(deviceWidth: number, deviceHeight: number): void {
    const sessionId = `session_${Date.now()}`;
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      touches: [],
      deviceInfo: {
        width: deviceWidth,
        height: deviceHeight,
      },
    };
    this.isRecording = true;
    console.log(`开始录制会话: ${sessionId}`);
  }

  /**
   * 记录触摸事件
   */
  recordTouch(record: TouchRecord): void {
    if (!this.isRecording || !this.currentSession) {
      console.warn('当前没有进行中的录制会话');
      return;
    }

    this.currentSession.touches.push(record);
    console.log(`记录触摸事件: ${record.type} at (${record.x.toFixed(0)}, ${record.y.toFixed(0)})`);
  }

  /**
   * 停止录制并保存会话
   */
  async stopRecording(): Promise<RecordingSession | null> {
    if (!this.isRecording || !this.currentSession) {
      console.warn('当前没有进行中的录制会话');
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.isRecording = false;

    // 保存到本地存储
    await this.saveSession(this.currentSession);

    const session = this.currentSession;
    this.currentSession = null;

    console.log(`停止录制会话: ${session.id}, 共记录 ${session.touches.length} 个触摸事件`);
    return session;
  }

  /**
   * 保存会话到本地存储
   */
  private async saveSession(session: RecordingSession): Promise<void> {
    try {
      // 保存当前会话
      await AsyncStorage.setItem(
        `touch_session_${session.id}`,
        JSON.stringify(session),
      );

      // 更新会话列表
      const sessionsListJson = await AsyncStorage.getItem('touch_sessions_list');
      const sessionsList: string[] = sessionsListJson
        ? JSON.parse(sessionsListJson)
        : [];
      sessionsList.push(session.id);
      await AsyncStorage.setItem(
        'touch_sessions_list',
        JSON.stringify(sessionsList),
      );

      console.log(`会话已保存: ${session.id}`);
    } catch (error) {
      console.error('保存会话失败:', error);
    }
  }

  /**
   * 获取所有已保存的会话
   */
  async getAllSessions(): Promise<RecordingSession[]> {
    try {
      const sessionsListJson = await AsyncStorage.getItem('touch_sessions_list');
      if (!sessionsListJson) {
        return [];
      }

      const sessionsList: string[] = JSON.parse(sessionsListJson);
      const sessions: RecordingSession[] = [];

      for (const sessionId of sessionsList) {
        const sessionJson = await AsyncStorage.getItem(
          `touch_session_${sessionId}`,
        );
        if (sessionJson) {
          sessions.push(JSON.parse(sessionJson));
        }
      }

      return sessions;
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  /**
   * 获取指定会话
   */
  async getSession(sessionId: string): Promise<RecordingSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(
        `touch_session_${sessionId}`,
      );
      if (sessionJson) {
        return JSON.parse(sessionJson);
      }
      return null;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  }

  /**
   * 删除指定会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`touch_session_${sessionId}`);

      // 更新会话列表
      const sessionsListJson = await AsyncStorage.getItem('touch_sessions_list');
      if (sessionsListJson) {
        const sessionsList: string[] = JSON.parse(sessionsListJson);
        const updatedList = sessionsList.filter(id => id !== sessionId);
        await AsyncStorage.setItem(
          'touch_sessions_list',
          JSON.stringify(updatedList),
        );
      }

      console.log(`会话已删除: ${sessionId}`);
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  }

  /**
   * 清空所有会话
   */
  async clearAllSessions(): Promise<void> {
    try {
      const sessionsListJson = await AsyncStorage.getItem('touch_sessions_list');
      if (sessionsListJson) {
        const sessionsList: string[] = JSON.parse(sessionsListJson);
        for (const sessionId of sessionsList) {
          await AsyncStorage.removeItem(`touch_session_${sessionId}`);
        }
      }
      await AsyncStorage.removeItem('touch_sessions_list');
      console.log('所有会话已清空');
    } catch (error) {
      console.error('清空会话失败:', error);
    }
  }

  /**
   * 导出会话数据为JSON
   */
  exportSessionToJSON(session: RecordingSession): string {
    return JSON.stringify(session, null, 2);
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(session: RecordingSession): {
    totalTouches: number;
    taps: number;
    swipes: number;
    duration: number;
  } {
    const taps = session.touches.filter(t => t.type === 'tap').length;
    const swipeStarts = session.touches.filter(
      t => t.type === 'swipe_start',
    ).length;
    const duration = session.endTime
      ? session.endTime - session.startTime
      : Date.now() - session.startTime;

    return {
      totalTouches: session.touches.length,
      taps,
      swipes: swipeStarts,
      duration,
    };
  }

  /**
   * 检查是否正在录制
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }
}

export default new TouchRecorder();

