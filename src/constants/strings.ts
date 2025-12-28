/**
 * 字符串常量（用于国际化预备）
 */

export const STRINGS = {
  /** 通用文本 */
  COMMON: {
    CONFIRM: '确定',
    CANCEL: '取消',
    DELETE: '删除',
    SAVE: '保存',
    CLOSE: '关闭',
  },
  
  /** 首页相关 */
  HOME: {
    TITLE: '自动连点器',
    BANNER_TITLE: '自动任务',
    BANNER_SUBTITLE: '解放你的双手，你的手机管家',
    AUTO_CLICKER: '自动连点器',
    AUTO_SCROLL: '自动滚动',
    AUTO_REFRESH: '自动刷新',
  },
  
  /** 录制相关 */
  RECORDING: {
    START: '开始录制',
    STOP: '停止录制',
    RECORDING: '录制中...',
    WAITING: '等待录制',
    RECORDING_TIME: '录制时间',
    TRACKING_TOUCH: '📍 正在记录触摸位置',
  },
  
  /** 会话列表相关 */
  SESSION_LIST: {
    TITLE: '脚本集合',
    EMPTY_TITLE: '还没有录制脚本',
    EMPTY_SUBTITLE: '点击首页 Banner 开始录制自动化脚本',
    CLEAR_ALL: '清空全部',
    SCRIPT_COUNT: (count: number) => `共 ${count} 个脚本`,
  },
  
  /** 弹窗文本 */
  ALERT: {
    ACCESSIBILITY_REQUIRED_TITLE: '需要开启无障碍服务',
    ACCESSIBILITY_REQUIRED_MESSAGE: '自动任务需要无障碍服务权限才能正常工作。\n\n请在设置中为本应用开启无障碍服务。',
    GO_SETTINGS: '去设置',
    SAVE_SCRIPT_TITLE: '保存脚本',
    SAVE_SCRIPT_SUBTITLE: '请为录制的操作命名，方便后续查找和使用',
    ENTER_SCRIPT_NAME: '请输入脚本名称',
    SAVE_SUCCESS: '保存成功',
    SAVE_FAILED: '保存失败',
    CONFIRM_DELETE: '确认删除',
    CONFIRM_DELETE_MESSAGE: '确定要删除这个会话吗？',
    CONFIRM_CLEAR: '确认清空',
    CONFIRM_CLEAR_MESSAGE: '确定要删除所有会话吗？此操作无法撤销。',
    CONFIRM_EXECUTE: '确认执行',
  },
  
  /** 无障碍服务相关 */
  ACCESSIBILITY: {
    ENABLED: '无障碍服务已启用',
    ENABLED_MESSAGE: '现在可以使用自动任务功能了！',
    DISABLED: '无障碍服务已关闭',
    DISABLED_MESSAGE: '自动任务功能需要无障碍服务才能正常工作，请重新开启',
  },
  
  /** 错误信息 */
  ERROR: {
    NO_RECORDING_DATA: '没有待保存的录制数据',
    SAVE_ERROR: '保存脚本时发生错误，请重试',
    PLAYBACK_ERROR: '执行错误',
    NO_ACTIONS: '没有可执行的操作记录',
  },
} as const;

