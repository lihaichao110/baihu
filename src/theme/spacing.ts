/**
 * 间距定义
 */

export const spacing = {
  /** 基础间距单位 */
  unit: 4,
  
  /** 预设间距 */
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  
  /** 页面边距 */
  page: {
    horizontal: 20,
    vertical: 16,
  },
  
  /** 卡片间距 */
  card: {
    padding: 16,
    gap: 15,
  },
} as const;

