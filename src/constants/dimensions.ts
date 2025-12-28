/**
 * 尺寸常量定义
 * @description 用于布局计算的尺寸常量
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** 页面外边距 */
const OUTER_MARGIN = 20;

/** 内边距 */
const INNER_PADDING = 15;

/** 卡片间距 */
const GAP = 15;

/** 半宽卡片宽度 */
const HALF_CARD_WIDTH = (SCREEN_WIDTH - OUTER_MARGIN * 2 - GAP) / 2;

/** 工具项宽度（在工具网格中使用） */
const TOOL_ITEM_WIDTH = (SCREEN_WIDTH - OUTER_MARGIN * 2 - INNER_PADDING * 2 - GAP) / 2;

export const DIMENSIONS = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  OUTER_MARGIN,
  INNER_PADDING,
  GAP,
  HALF_CARD_WIDTH,
  TOOL_ITEM_WIDTH,
} as const;

