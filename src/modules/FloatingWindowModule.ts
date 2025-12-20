import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { FloatingWindowModule } = NativeModules;

export interface FloatingWindowModuleInterface {
  checkPermission(): Promise<boolean>;
  requestPermission(): void;
  showFloatingWindow(timeText: string, isRunning: boolean): void;
  updateFloatingWindow(timeText: string, isRunning: boolean): void;
  hideFloatingWindow(): void;
  onStartButtonClick(): void;
  onEndButtonClick(): void;
  onCloseButtonClick(): void;
}

class FloatingWindow implements FloatingWindowModuleInterface {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    // 只在模块存在时才创建 NativeEventEmitter
    if (FloatingWindowModule) {
      this.eventEmitter = new NativeEventEmitter(FloatingWindowModule);
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!FloatingWindowModule) {
      return false;
    }
    return await FloatingWindowModule.checkPermission();
  }

  requestPermission(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.requestPermission();
    }
  }

  showFloatingWindow(timeText: string, isRunning: boolean): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.showFloatingWindow(timeText, isRunning);
    }
  }

  updateFloatingWindow(timeText: string, isRunning: boolean): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.updateFloatingWindow(timeText, isRunning);
    }
  }

  hideFloatingWindow(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.hideFloatingWindow();
    }
  }

  onStartButtonClick(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.onStartButtonClick();
    }
  }

  onEndButtonClick(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.onEndButtonClick();
    }
  }

  onCloseButtonClick(): void {
    if (FloatingWindowModule) {
      FloatingWindowModule.onCloseButtonClick();
    }
  }

  addEventListener(eventName: string, callback: (data?: any) => void) {
    if (!this.eventEmitter) {
      // 返回一个空的订阅对象，避免崩溃
      return {
        remove: () => { },
      };
    }
    return this.eventEmitter.addListener(eventName, callback);
  }
}

export default new FloatingWindow();

