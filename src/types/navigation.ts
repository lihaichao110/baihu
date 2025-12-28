/**
 * 导航相关类型定义
 */

import type { RecordingSession } from './recording';

/** 根导航参数列表 */
export type RootStackParamList = {
  Home: { sessionToExecute?: RecordingSession } | undefined;
  SessionList: undefined;
  TemplateList: undefined;
  ModuleList: { softwareId: string; softwareName: string } | undefined;
  RuleList: { moduleId: string; moduleName: string } | undefined;
};

