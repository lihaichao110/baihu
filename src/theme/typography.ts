/**
 * 字体排版定义
 */

import { Platform } from 'react-native';

export const typography = {
  /** 字体家族 */
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
    }),
  },
  
  /** 字体大小 */
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  },
  
  /** 字重 */
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  /** 行高 */
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

