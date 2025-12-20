import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from 'react-native';

const { FloatingWindowModule } = NativeModules;

export interface TouchEventData {
  type: 'tap' | 'swipe_start' | 'swipe_move' | 'swipe_end';
  x: number;
  y: number;
  timestamp: number;
}

export interface DeviceInfoData {
  width: number;
  height: number;
}

export interface FloatingWindowModuleInterface {
  showFloatingWindow(): void;
  hideFloatingWindow(): void;
  showOverlay(): void;
  hideOverlay(): void;
  updateTime(timeText: string): void;
  updateRecordingState(isRecording: boolean): void;
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
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

  updateTime(timeText: string): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.updateTime(timeText);
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
