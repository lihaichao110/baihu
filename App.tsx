/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MagicOverlayPortal } from 'react-native-magic-overlay';
import { HomeScreen } from './src/screens/HomeScreen';

function App() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
      <MagicOverlayPortal />
    </SafeAreaProvider>
  );
}

export default App;
