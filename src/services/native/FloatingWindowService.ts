/**
 * 悬浮窗服务模块
 * @description 封装原生悬浮窗相关功能
 */

import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from 'react-native';
import type { PlaybackAction } from '../../types';

const { FloatingWindowModule } = NativeModules;

export interface FloatingWindowServiceInterface {
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

class FloatingWindowServiceWrapper implements FloatingWindowServiceInterface {
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

export default new FloatingWindowServiceWrapper();

