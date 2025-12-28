/**
 * 触摸事件相关类型定义
 */

import type { ActionType, PointerType, Orientation } from './recording';

/** 触摸记录（供外部调用时使用） */
export interface TouchRecord {
  x: number;
  y: number;
  timestamp: number;
  type: ActionType;
  pressure?: number;
  pointerType?: PointerType;
  velocityX?: number;
  velocityY?: number;
}

/** 从原生端接收的触摸事件数据 */
export interface TouchEventData {
  type: ActionType;
  x: number;
  y: number;
  timestamp: number;
  /** 压力值（0-1） */
  pressure?: number;
  /** 指针类型 */
  pointerType?: PointerType;
  /** X 方向速度（像素/秒） */
  velocityX?: number;
  /** Y 方向速度（像素/秒） */
  velocityY?: number;
}

/** 设备信息数据 */
export interface DeviceInfoData {
  width: number;
  height: number;
  orientation: Orientation;
}

/** 回放进度数据 */
export interface PlaybackProgressData {
  current: number;
  total: number;
  type: ActionType;
}

/** 回放完成数据 */
export interface PlaybackCompleteData {
  executedCount: number;
}

/** 回放错误数据 */
export interface PlaybackErrorData {
  error: string;
}

/** 执行操作的数据格式 */
export interface PlaybackAction {
  type: ActionType;
  normalizedX: number;
  normalizedY: number;
  timestamp: number;
}

