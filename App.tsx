/**
 * 白虎 - 自动化任务助手
 * @description React Native 应用入口
 * @see https://github.com/facebook/react-native
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MagicOverlayPortal } from 'react-native-magic-overlay';
import { RootNavigator } from './src/navigation';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <RootNavigator />
      <MagicOverlayPortal />
    </SafeAreaProvider>
  );
}

export default App;

// 导出类型供外部使用
export type { RootStackParamList } from './src/types';
