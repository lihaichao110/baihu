import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from 'react-native';

const { FloatingWindowModule } = NativeModules;

// 触摸事件类型
export type TouchEventType = 'tap' | 'swipe_start' | 'swipe_move' | 'swipe_end';

// 指针类型
export type PointerType = 'touch' | 'stylus' | 'mouse';

// 从原生端接收的触摸事件数据
export interface TouchEventData {
  type: TouchEventType;
  x: number;
  y: number;
  timestamp: number;
  // 扩展字段
  pressure?: number;       // 压力值（0-1）
  pointerType?: PointerType; // 指针类型
  velocityX?: number;      // X 方向速度（像素/秒）
  velocityY?: number;      // Y 方向速度（像素/秒）
}

// 设备信息数据
export interface DeviceInfoData {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape'; // 屏幕方向
}

// 回放进度数据
export interface PlaybackProgressData {
  current: number;
  total: number;
  type: TouchEventType;
}

// 回放完成数据
export interface PlaybackCompleteData {
  executedCount: number;
}

// 回放错误数据
export interface PlaybackErrorData {
  error: string;
}

// 执行操作的数据格式
export interface PlaybackAction {
  type: TouchEventType;
  normalizedX: number;
  normalizedY: number;
  timestamp: number;
}

export interface FloatingWindowModuleInterface {
  showFloatingWindow(): void;
  hideFloatingWindow(): void;
  showOverlay(): void;
  hideOverlay(): void;
  updateRecordingState(isRecording: boolean): void;
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  // 回放相关
  setPlayButtonVisible(visible: boolean): void;
  setSaveButtonVisible(visible: boolean): void;
  updatePlayingState(playing: boolean): void;
  executeActions(actions: PlaybackAction[], screenWidth: number, screenHeight: number): void;
  stopPlayback(): void;
  addEventListener(eventName: string, callback: (data?: any) => void): EmitterSubscription | { remove: () => void };
}

class FloatingWindowModuleWrapper implements FloatingWindowModuleInterface {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && FloatingWindowModule) {
      this.eventEmitter = new NativeEventEmitter(FloatingWindowModule);
    }
  }

  showFloatingWindow(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.showFloatingWindow();
    }
  }

  hideFloatingWindow(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.hideFloatingWindow();
    }
  }

  showOverlay(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.showOverlay();
    }
  }

  hideOverlay(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.hideOverlay();
    }
  }

  updateRecordingState(isRecording: boolean): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.updateRecordingState(isRecording);
    }
  }

  async isAccessibilityServiceEnabled(): Promise<boolean> {
    if (FloatingWindowModule) {
      return await FloatingWindowModule.isAccessibilityServiceEnabled();
    }
    return false;
  }

  openAccessibilitySettings(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.openAccessibilitySettings();
    }
  }

  setPlayButtonVisible(visible: boolean): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.setPlayButtonVisible(visible);
    }
  }

  setSaveButtonVisible(visible: boolean): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.setSaveButtonVisible(visible);
    }
  }

  updatePlayingState(playing: boolean): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.updatePlayingState(playing);
    }
  }

  executeActions(actions: PlaybackAction[], screenWidth: number, screenHeight: number): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.executeActions(actions, screenWidth, screenHeight);
    }
  }

  stopPlayback(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.stopPlayback();
    }
  }

  addEventListener(eventName: string, callback: (data?: any) => void): EmitterSubscription | { remove: () => void } {
    if (!this.eventEmitter) {
      // 返回一个空的订阅对象，避免崩溃
      return {
        remove: () => { },
      };
    }
    return this.eventEmitter.addListener(eventName, callback);
  }
}

export default new FloatingWindowModuleWrapper();
