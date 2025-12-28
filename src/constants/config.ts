/**
 * 应用配置常量
 */

export const CONFIG = {
  /** 应用名称 */
  APP_NAME: 'baihu',
  
  /** 存储键名前缀 */
  STORAGE_PREFIX: 'touch_session_',
  
  /** 会话列表存储键 */
  SESSIONS_LIST_KEY: 'touch_sessions_list',
  
  /** 动画时长（毫秒） */
  ANIMATION: {
    SHORT: 150,
    MEDIUM: 300,
    LONG: 500,
  },
  
  /** 触摸相关配置 */
  TOUCH: {
    /** 点击判定时间阈值（毫秒） */
    TAP_THRESHOLD: 200,
    /** 双击保护时间（毫秒） */
    DOUBLE_TAP_PROTECTION: 300,
  },
  
  /** 脚本名称最大长度 */
  MAX_SCRIPT_NAME_LENGTH: 50,
} as const;

