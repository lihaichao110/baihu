import { SoftwareKeys } from "../TemplateList/constants";

export enum XYModuleKeys {
  /** 悬赏任务 */
  XUANSHANG = 'xuanshang',
  /** 守卫女神 */
  SHOUWEI = 'shouwei',
  /** 装备秘境 */
  ZHUANGBEI = 'zhuangbei',
}

export interface ModuleItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// 非必填
type ModuleData = Partial<Record<SoftwareKeys, ModuleItem[]>>;

export const moduleData: ModuleData = {
  [SoftwareKeys.XY]: [
    {
      id: XYModuleKeys.XUANSHANG,
      name: '悬赏任务',
      icon: '💰',
      description: '悬赏任务界面匹配规则',
    },
    {
      id: XYModuleKeys.SHOUWEI,
      name: '守卫女神',
      icon: '👸',
      description: '守卫女神界面匹配规则',
    },
    {
      id: XYModuleKeys.ZHUANGBEI,
      name: '装备秘境',
      icon: '🔫',
      description: '装备秘境界面匹配规则',
    },
  ]
}