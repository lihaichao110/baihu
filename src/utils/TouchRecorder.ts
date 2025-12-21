import AsyncStorage from '@react-native-async-storage/async-storage';

// 操作类型
export type ActionType = 'tap' | 'swipe_start' | 'swipe_move' | 'swipe_end';

// 坐标信息（包含原始坐标和归一化坐标）
export interface Coordinates {
  x: number;           // 原始 X 坐标（像素）
  y: number;           // 原始 Y 坐标（像素）
  normalizedX: number; // 归一化 X 坐标（0-1）
  normalizedY: number; // 归一化 Y 坐标（0-1）
}

// 触摸元数据
export interface TouchMeta {
  pointerType: 'touch' | 'stylus' | 'mouse'; // 指针类型
  pressure: number;    // 压力值（0-1）
  velocityX: number;   // X 方向速度（像素/秒）
  velocityY: number;   // Y 方向速度（像素/秒）
}

// 单个动作记录
export interface ActionRecord {
  type: ActionType;
  timestamp: number;   // 毫秒时间戳
  coordinates: Coordinates;
  meta: TouchMeta;
}

// 设备信息（支持横屏）
export interface DeviceInfo {
  width: number;       // 屏幕宽度（像素）
  height: number;      // 屏幕高度（像素）
  orientation: 'portrait' | 'landscape'; // 屏幕方向
}

// 录制会话
export interface RecordingSession {
  id: string;
  name?: string;          // 脚本名称（用户自定义）
  startTime: number;
  endTime?: number;
  actions: ActionRecord[];
  deviceInfo: DeviceInfo;
}

// 兼容旧的 TouchRecord 接口（供外部调用时使用）
export interface TouchRecord {
  x: number;
  y: number;
  timestamp: number;
  type: ActionType;
  pressure?: number;
  pointerType?: 'touch' | 'stylus' | 'mouse';
  velocityX?: number;
  velocityY?: number;
}

class TouchRecorder {
  private currentSession: RecordingSession | null = null;
  private isRecording: boolean = false;
  private lastTouchTime: number = 0;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  /**
   * 开始新的录制会话
   * @param deviceWidth 设备屏幕宽度
   * @param deviceHeight 设备屏幕高度
   * @param orientation 屏幕方向（可选，默认根据宽高比自动判断）
   */
  startRecording(
    deviceWidth: number,
    deviceHeight: number,
    orientation?: 'portrait' | 'landscape',
  ): void {
    const sessionId = `session_${Date.now()}`;
    // 自动判断屏幕方向
    const screenOrientation =
      orientation || (deviceWidth > deviceHeight ? 'landscape' : 'portrait');

    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      actions: [],
      deviceInfo: {
        width: deviceWidth,
        height: deviceHeight,
        orientation: screenOrientation,
      },
    };
    this.isRecording = true;
    this.lastTouchTime = 0;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    console.log(
      `开始录制会话: ${sessionId}, 屏幕方向: ${screenOrientation}, 尺寸: ${deviceWidth}x${deviceHeight}`,
    );
  }

  /**
   * 记录触摸事件
   */
  recordTouch(record: TouchRecord): void {
    if (!this.isRecording || !this.currentSession) {
      console.warn('当前没有进行中的录制会话');
      return;
    }

    const { width, height } = this.currentSession.deviceInfo;

    // 计算速度（像素/秒）
    const timeDelta = record.timestamp - this.lastTouchTime;
    let velocityX = record.velocityX ?? 0;
    let velocityY = record.velocityY ?? 0;

    // 如果没有提供速度，根据位置变化计算
    if (
      velocityX === 0 &&
      velocityY === 0 &&
      this.lastTouchTime > 0 &&
      timeDelta > 0
    ) {
      velocityX = ((record.x - this.lastTouchX) / timeDelta) * 1000;
      velocityY = ((record.y - this.lastTouchY) / timeDelta) * 1000;
    }

    // 构建 ActionRecord
    const actionRecord: ActionRecord = {
      type: record.type,
      timestamp: record.timestamp,
      coordinates: {
        x: record.x,
        y: record.y,
        normalizedX: width > 0 ? record.x / width : 0,
        normalizedY: height > 0 ? record.y / height : 0,
      },
      meta: {
        pointerType: record.pointerType ?? 'touch',
        pressure: record.pressure ?? 0,
        velocityX: velocityX,
        velocityY: velocityY,
      },
    };

    this.currentSession.actions.push(actionRecord);

    // 更新上次触摸信息
    this.lastTouchTime = record.timestamp;
    this.lastTouchX = record.x;
    this.lastTouchY = record.y;

    console.log(
      `记录触摸事件: ${record.type} at (${record.x.toFixed(0)}, ${record.y.toFixed(0)}) ` +
      `normalized: (${actionRecord.coordinates.normalizedX.toFixed(3)}, ${actionRecord.coordinates.normalizedY.toFixed(3)})`,
    );
  }

  /**
   * 停止录制（不保存，返回会话供后续处理）
   */
  stopRecording(): RecordingSession | null {
    if (!this.isRecording || !this.currentSession) {
      console.warn('当前没有进行中的录制会话');
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.isRecording = false;

    const session = this.currentSession;
    this.currentSession = null;

    console.log(
      `停止录制会话: ${session.id}, 共记录 ${session.actions.length} 个操作`,
    );
    return session;
  }

  /**
   * 保存会话（带脚本名称）
   */
  async saveSessionWithName(session: RecordingSession, name: string): Promise<void> {
    session.name = name;
    await this.saveSession(session);
  }

  /**
   * 保存会话到本地存储
   */
  async saveSession(session: RecordingSession): Promise<void> {
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
          const session = JSON.parse(sessionJson);
          // 确保会话数据有效（包含必要字段）
          if (session && session.id && Array.isArray(session.actions)) {
            sessions.push(session);
          } else {
            console.warn(`会话数据无效，跳过: ${sessionId}`);
          }
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
    orientation: 'portrait' | 'landscape';
  } {
    // 确保 actions 存在且为数组
    const actions = session.actions || [];
    const taps = actions.filter(a => a.type === 'tap').length;
    const swipeStarts = actions.filter(a => a.type === 'swipe_start').length;
    const duration = session.endTime
      ? session.endTime - session.startTime
      : Date.now() - session.startTime;

    return {
      totalTouches: actions.length,
      taps,
      swipes: swipeStarts,
      duration,
      orientation: session.deviceInfo?.orientation || 'portrait',
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

