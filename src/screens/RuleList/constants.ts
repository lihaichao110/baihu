import { XYModuleKeys } from "../ModuleList/constants";

export enum RuleKeys {
  /** 匹配跳过 */
  MATCH_SKIP = 'match_skip',
  /** 匹配确认 */
  MATCH_CONFIRM = 'match_confirm',
}

export interface RuleItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  matchCount: number;
}

// 非必填
type RuleData = Partial<Record<XYModuleKeys, RuleItem[]>>;

export const ruleData: RuleData = {
  [XYModuleKeys.SHOUWEI]: [
    {
      id: RuleKeys.MATCH_SKIP,
      name: '匹配跳过',
      description: '匹配跳过按钮元素',
      enabled: true,
      matchCount: 12,
    },
    {
      id: RuleKeys.MATCH_CONFIRM,
      name: '匹配确认',
      description: '匹配确认按钮元素',
      enabled: true,
      matchCount: 8,
    },
  ]
}