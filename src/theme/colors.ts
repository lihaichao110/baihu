/**
 * 颜色主题定义
 */

export const colors = {
  /** 主背景色 */
  background: '#E0F7FA',
  
  /** 主色调 */
  primary: '#4facfe',
  
  /** 文本颜色 */
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
    white: '#FFFFFF',
    light: '#F0F0F0',
  },
  
  /** 卡片渐变色 */
  card: {
    blue: ['#4facfe', '#00f2fe'],
    purple: ['#a18cd1', '#fbc2eb'],
    green: ['#43e97b', '#38f9d7'],
    darkPurple: ['#667eea', '#764ba2'],
    white: '#FFFFFF',
  },
  
  /** 功能性颜色 */
  functional: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#f44336',
    info: '#2196F3',
  },
  
  /** 边框颜色 */
  border: {
    light: '#EEEEEE',
    medium: '#DDDDDD',
    dark: '#CCCCCC',
  },
  
  /** 遮罩颜色 */
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export default colors;
