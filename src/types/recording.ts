/**
 * 录制相关类型定义
 */

/** 操作类型 */
export type ActionType = 'tap' | 'swipe_start' | 'swipe_move' | 'swipe_end';

/** 指针类型 */
export type PointerType = 'touch' | 'stylus' | 'mouse';

/** 屏幕方向 */
export type Orientation = 'portrait' | 'landscape';

/** 坐标信息（包含原始坐标和归一化坐标） */
export interface Coordinates {
  /** 原始 X 坐标（像素） */
  x: number;
  /** 原始 Y 坐标（像素） */
  y: number;
  /** 归一化 X 坐标（0-1） */
  normalizedX: number;
  /** 归一化 Y 坐标（0-1） */
  normalizedY: number;
}

/** 触摸元数据 */
export interface TouchMeta {
  /** 指针类型 */
  pointerType: PointerType;
  /** 压力值（0-1） */
  pressure: number;
  /** X 方向速度（像素/秒） */
  velocityX: number;
  /** Y 方向速度（像素/秒） */
  velocityY: number;
}

/** 单个动作记录 */
export interface ActionRecord {
  type: ActionType;
  /** 毫秒时间戳 */
  timestamp: number;
  coordinates: Coordinates;
  meta: TouchMeta;
}

/** 设备信息 */
export interface DeviceInfo {
  /** 屏幕宽度（像素） */
  width: number;
  /** 屏幕高度（像素） */
  height: number;
  /** 屏幕方向 */
  orientation: Orientation;
}

/** 录制会话 */
export interface RecordingSession {
  id: string;
  /** 脚本名称（用户自定义） */
  name?: string;
  startTime: number;
  endTime?: number;
  actions: ActionRecord[];
  deviceInfo: DeviceInfo;
}

/** 会话统计信息 */
export interface SessionStats {
  totalTouches: number;
  taps: number;
  swipes: number;
  /** 持续时间（毫秒） */
  duration: number;
  orientation: Orientation;
}

