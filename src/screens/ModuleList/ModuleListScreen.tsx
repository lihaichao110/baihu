/**
 * 模块列表页面
 * @description 显示软件中的使用模块级别
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { colors } from '../../theme';
import { DIMENSIONS } from '../../constants';
import { moduleData, ModuleItem } from './constants';
import { SoftwareKeys } from '../TemplateList/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RuleList'>;

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Image
      source={require('../../assets/empty-state.png')}
      style={styles.emptyImage}
      resizeMode="contain"
    />
    <Text style={styles.emptyTitle}>暂无可用模块</Text>
    <Text style={styles.emptyDescription}>
      当前软件没有配置任何模块，请检查软件配置或联系管理员
    </Text>
  </View>
);

export const ModuleListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { softwareId, softwareName } = route.params as {
    softwareId: SoftwareKeys;
    softwareName: string;
  };

  const handleModulePress = (moduleId: string, moduleName: string) => {
    navigation.navigate('RuleList', {
      moduleId,
      moduleName,
    });
  };

  const renderModuleItem = ({ item }: { item: ModuleItem }) => (
    <TouchableOpacity
      style={styles.moduleItem}
      onPress={() => handleModulePress(item.id, item.name)}
      activeOpacity={0.8}
    >
      <View style={styles.moduleIconContainer}>
        <Text style={styles.moduleIcon}>{item.icon}</Text>
      </View>
      <View style={styles.moduleInfo}>
        <Text style={styles.moduleName}>{item.name}</Text>
        <Text style={styles.moduleDescription}>{item.description}</Text>
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const modules = moduleData?.[softwareId] ?? [];
  const isEmpty = modules.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.softwareName}>{softwareName}</Text>
        <Text style={styles.softwareSubtitle}>选择要配置的模块</Text>
      </View>

      {isEmpty ? (
        <View style={styles.listContent}>
          <EmptyState />
        </View>
      ) : (
        <FlatList
          data={modules}
          renderItem={renderModuleItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  emptySpace: {
    width: 40,
  },
  content: {
    padding: DIMENSIONS.INNER_PADDING,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  softwareName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  softwareSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: DIMENSIONS.INNER_PADDING,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  moduleItem: {
    width: '100%',
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
  moduleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleIcon: {
    fontSize: 24,
    color: '#fff',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  moduleDescription: {
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: DIMENSIONS.INNER_PADDING,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
