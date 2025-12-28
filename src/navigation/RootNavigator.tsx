/**
 * 根导航器
 * @description 应用的主导航配置
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { HomeScreen } from '../screens/Home';
import { SessionListScreen } from '../screens/SessionList';
import { TemplateListScreen } from '../screens/TemplateList';
import { ModuleListScreen } from '../screens/ModuleList';
import { RuleListScreen } from '../screens/RuleList';
// import { colors } from '../theme'; // colors 未使用，暂时注释掉

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
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
        <Stack.Screen
          name="TemplateList"
          component={TemplateListScreen}
          options={{
            headerShown: true,
            title: '匹配模版',
            headerStyle: {
              backgroundColor: '#667eea',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="ModuleList"
          component={ModuleListScreen}
          options={{
            headerShown: true,
            title: '选择模块',
            headerStyle: {
              backgroundColor: '#667eea',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="RuleList"
          component={RuleListScreen}
          options={{
            headerShown: true,
            title: '匹配规则',
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
  );
};
