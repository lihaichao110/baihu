/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MagicOverlayPortal } from 'react-native-magic-overlay';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from './src/screens/HomeScreen';
import { SessionListScreen } from './src/screens/SessionListScreen';
import type { RecordingSession } from './src/utils/TouchRecorder';

// 定义导航参数类型
export type RootStackParamList = {
  Home: { sessionToExecute?: RecordingSession } | undefined;
  SessionList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="SessionList"
            component={SessionListScreen}
            options={{
              headerShown: true,
              title: '脚本集合',
              headerStyle: {
                backgroundColor: '#667eea',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <MagicOverlayPortal />
    </SafeAreaProvider>
  );
}

export default App;
