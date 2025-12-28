export interface SoftwareItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export enum SoftwareKeys {
  /** 仙遇 */
  XY = 'xy',
  /** 支付宝 */
  ZFB = 'zfb',
  /** 微信 */
  VX = 'vx',
}

/** 软件数据 */
export const softwareData: SoftwareItem[] = [
  {
    id: SoftwareKeys.VX,
    name: '微信',
    icon: '📱',
    description: '微信应用模板',
  },
  {
    id: SoftwareKeys.ZFB,
    name: '支付宝',
    icon: '💳',
    description: '支付宝应用模板',
  },
  {
    id: SoftwareKeys.XY,
    name: '仙遇',
    icon: '👻',
    description: '仙遇应用模板',
  },
];