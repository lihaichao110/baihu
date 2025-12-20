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

class FloatingWindowModuleWrapper implements FloatingWindowModuleInterface {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && FloatingWindowModule) {
      this.eventEmitter = new NativeEventEmitter(FloatingWindowModule);
    }
  }

  checkPermission(): Promise<boolean> {
    if (FloatingWindowModule) {
      return FloatingWindowModule.checkPermission();
    }
    return Promise.resolve(false);
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

export default new FloatingWindowModuleWrapper();
