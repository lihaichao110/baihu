/**
 * 模版列表页面
 * @description 显示软件级别的模版列表
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { colors } from '../../theme';
import { DIMENSIONS } from '../../constants';
import { useFloatingWindow } from '../../hooks';
import { softwareData, SoftwareItem } from './constants';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ModuleList'
>;

export const TemplateListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { show: openFloatingWindow } = useFloatingWindow();

  const handleSoftwarePress = (softwareId: string, softwareName: string) => {
    // 导航到模块列表页面
    navigation.navigate('ModuleList', {
      softwareId,
      softwareName,
    });

    // 显示悬浮窗
    openFloatingWindow();
  };

  const renderSoftwareItem = ({ item }: { item: SoftwareItem }) => (
    <TouchableOpacity
      style={styles.softwareItem}
      onPress={() => handleSoftwarePress(item.id, item.name)}
      activeOpacity={0.8}
    >
      <View style={styles.softwareIconContainer}>
        <Text style={styles.softwareIcon}>{item.icon}</Text>
      </View>
      <View style={styles.softwareInfo}>
        <Text style={styles.softwareName}>{item.name}</Text>
        <Text style={styles.softwareDescription}>{item.description}</Text>
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>匹配模版</Text>
        <Text style={styles.headerSubtitle}>选择软件以配置匹配规则</Text>
      </View>

      <FlatList
        data={softwareData}
        renderItem={renderSoftwareItem}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: DIMENSIONS.INNER_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: DIMENSIONS.INNER_PADDING,
    paddingTop: 20,
  },
  softwareItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  softwareIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  softwareIcon: {
    fontSize: 24,
    color: '#fff',
  },
  softwareInfo: {
    flex: 1,
  },
  softwareName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  softwareDescription: {
    fontSize: 14,
    color: '#666',
  },
  arrowContainer: {
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 20,
    color: '#999',
  },
});
