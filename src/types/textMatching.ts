/**
 * 文字匹配类型定义
 * @description 定义屏幕文字匹配相关的数据结构
 */

/**
 * 匹配模式
 */
export enum MatchMode {
  /** 精确匹配 */
  EXACT = 'exact',
  /** 包含匹配 */
  CONTAINS = 'contains',
  /** 开头匹配 */
  STARTS_WITH = 'starts_with',
  /** 结尾匹配 */
  ENDS_WITH = 'ends_with',
  /** 正则表达式匹配 */
  REGEX = 'regex',
}

/**
 * 屏幕文字元素
 */
export interface ScreenTextElement {
  /** 文字内容 */
  text: string;
  /** 屏幕X坐标 */
  x: number;
  /** 屏幕Y坐标 */
  y: number;
  /** 元素宽度 */
  width: number;
  /** 元素高度 */
  height: number;
}

/**
 * 匹配结果
 */
export interface MatchResult {
  /** 是否匹配成功 */
  matched: boolean;
  /** 匹配到的元素（如果成功） */
  element?: ScreenTextElement;
  /** 匹配得分（0-1） */
  score?: number;
}

/**
 * 文字匹配目标
 */
export interface TextMatchTarget {
  /** 目标ID */
  id: string;
  /** 目标文字 */
  text: string;
  /** 匹配模式 */
  matchMode: MatchMode;
  /** 优先级（数字越小优先级越高） */
  priority?: number;
  /** 是否自动点击 */
  autoClick?: boolean;
  /** 点击后延迟（毫秒） */
  delayAfterClick?: number;
  /** 回调函数 */
  onMatched?: (element: ScreenTextElement) => void;
}

/**
 * 匹配上下文（用于智能匹配）
 */
export interface MatchContext {
  /** 区域限制 */
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** 父节点类名 */
  parentClassName?: string;
  /** 最小匹配得分 */
  minScore?: number;
}

/**
 * 脚本步骤
 */
export interface ScriptStep {
  /** 步骤ID */
  id: string;
  /** 步骤描述 */
  description: string;
  /** 目标文字 */
  targetText: string;
  /** 匹配模式 */
  matchMode: MatchMode;
  /** 操作类型 */
  action: 'tap' | 'longPress' | 'swipe';
  /** 等待超时时间（毫秒） */
  timeout?: number;
  /** 操作后等待时间（毫秒） */
  waitAfterAction?: number;
  /** 下一步延迟（毫秒） */
  nextStepDelay?: number;
  /** 滑动参数（仅当 action 为 swipe 时） */
  swipeParams?: {
    endX: number;
    endY: number;
    duration: number;
  };
}

/**
 * 脚本执行状态
 */
export interface ScriptExecutionState {
  /** 是否正在执行 */
  isRunning: boolean;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 执行进度 (0-1) */
  progress: number;
  /** 开始时间 */
  startTime: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 文字匹配配置
 */
export interface TextMatchingConfig {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存时长（毫秒） */
  cacheDuration?: number;
  /** 监听间隔（毫秒） */
  checkInterval?: number;
  /** 是否启用性能日志 */
  enablePerformanceLog?: boolean;
}

