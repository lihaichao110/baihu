/**
 * 服务层统一导出
 * @description 集中管理所有业务服务和原生模块封装
 */

// 原生模块服务
export { default as AccessibilityService } from './native/AccessibilityService';
export { default as FloatingWindowService } from './native/FloatingWindowService';

// 业务服务
export { default as TouchRecorderService } from './storage/TouchRecorderService';

