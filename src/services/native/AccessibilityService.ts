/**
 * 无障碍服务管理模块
 * @description 封装 Android 无障碍服务相关功能
 */

import { Platform } from 'react-native';
import AccessibilityServicesDetector from 'react-native-accessibility-services-detector';
import type { EmitterSubscription } from 'react-native';

class AccessibilityServiceManager {
  private subscription: EmitterSubscription | null = null;

  /**
   * 检查无障碍服务是否已启用
   * @returns Promise<boolean>
   */
  async checkAccessibilityService(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('无障碍服务仅在 Android 平台可用');
      return true; // iOS 不需要无障碍服务
    }

    try {
      const isEnabled = await AccessibilityServicesDetector.hasEnabledAccessibilityServices();
      console.log('无障碍服务状态:', isEnabled);
      return isEnabled;
    } catch (error) {
      console.error('检查无障碍服务失败:', error);
      return false;
    }
  }

  /**
   * 获取已启用的无障碍服务列表
   * @returns Promise<AccessibilityServiceInfo[]>
   */
  async getEnabledServices() {
    if (Platform.OS !== 'android') {
      return [];
    }

    try {
      const services = await AccessibilityServicesDetector.getEnabledAccessibilityServices();
      console.log('已启用的无障碍服务:', services);
      return services;
    } catch (error) {
      console.error('获取无障碍服务列表失败:', error);
      return [];
    }
  }

  /**
   * 打开无障碍服务设置页面
   */
  openAccessibilitySettings(): void {
    if (Platform.OS !== 'android') {
      console.log('无障碍服务设置仅在 Android 平台可用');
      return;
    }

    try {
      AccessibilityServicesDetector.openAccessibilitySettings();
      console.log('已打开无障碍服务设置');
    } catch (error) {
      console.error('打开无障碍服务设置失败:', error);
    }
  }

  /**
   * 监听无障碍服务状态变化
   * @param callback 状态变化回调函数
   * @returns 移除监听器的函数
   */
  async addAccessibilityServiceListener(
    callback: (isEnabled: boolean) => void
  ): Promise<() => void> {
    if (Platform.OS !== 'android') {
      return () => { }; // iOS 不需要监听
    }

    try {
      // 添加监听器
      this.subscription = await AccessibilityServicesDetector.addAccessibilityServicesListener(
        (enabledServices) => {
          const isEnabled = enabledServices.length > 0;
          console.log('无障碍服务状态变化:', isEnabled, '启用数量:', enabledServices.length);
          callback(isEnabled);
        }
      );

      // 返回移除监听器的函数
      return () => {
        if (this.subscription) {
          AccessibilityServicesDetector.removeAccessibilityServicesListener(this.subscription);
          this.subscription = null;
        }
      };
    } catch (error) {
      console.error('添加无障碍服务监听器失败:', error);
      return () => { };
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(): void {
    if (this.subscription) {
      AccessibilityServicesDetector.removeAccessibilityServicesListener(this.subscription);
      this.subscription = null;
    }
  }

  /**
   * 获取已安装的远程访问应用
   */
  async getInstalledRemoteAccessApps() {
    if (Platform.OS !== 'android') {
      return [];
    }

    try {
      const apps = await AccessibilityServicesDetector.getInstalledRemoteAccessApps();
      console.log('已安装的远程访问应用:', apps);
      return apps;
    } catch (error) {
      console.error('获取远程访问应用失败:', error);
      return [];
    }
  }
}

export default new AccessibilityServiceManager();

