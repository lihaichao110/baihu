/**
 * 规则列表页面
 * @description 显示定义的匹配规则
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors } from '../../theme';
import { DIMENSIONS } from '../../constants';
import { XYModuleKeys } from '../ModuleList/constants';
import { ruleData } from './constants';

interface RuleItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  matchCount: number;
}

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Image
      source={require('../../assets/empty-state.png')}
      style={styles.emptyImage}
      resizeMode="contain"
    />
    <Text style={styles.emptyTitle}>暂无匹配规则</Text>
    <Text style={styles.emptyDescription}>
      当前模块没有配置任何规则，请点击"添加规则"按钮创建新规则
    </Text>
  </View>
);

export const RuleListScreen: React.FC = () => {
  const route = useRoute();

  const { moduleId, moduleName } = route.params as {
    moduleId: XYModuleKeys;
    moduleName: string;
  };

  const currentRules = ruleData?.[moduleId] ?? [];
  const isEmpty = currentRules.length === 0;

  const handleRuleToggle = (ruleId: string) => {
    // 实际应用中这里会更新规则状态
    console.log(`Toggle rule ${ruleId}`);
  };

  const handleRulePress = (ruleId: string) => {
    // 可以添加编辑规则的功能
    console.log(`Edit rule ${ruleId}`);
  };

  const renderRuleItem = ({ item }: { item: RuleItem }) => (
    <TouchableOpacity
      style={styles.ruleItem}
      onPress={() => handleRulePress(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.ruleInfo}>
        <View style={styles.ruleHeader}>
          <Text style={styles.ruleName}>{item.name}</Text>
          <Switch
            value={item.enabled}
            onValueChange={() => handleRuleToggle(item.id)}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor={item.enabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.ruleDescription}>{item.description}</Text>
        <View style={styles.ruleFooter}>
          <Text style={styles.ruleCount}>{item.matchCount} 个匹配项</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.softwareName}>{moduleName}</Text>
        <Text style={styles.softwareSubtitle}>配置匹配规则</Text>
      </View>

      {isEmpty ? (
        <View style={styles.listContent}>
          <EmptyState />
        </View>
      ) : (
        <FlatList
          data={currentRules}
          renderItem={renderRuleItem}
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
    width: '100%',
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    width: '100%',
    padding: DIMENSIONS.INNER_PADDING,
    paddingTop: 20,
    minHeight: 200,
  },
  ruleItem: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ruleInfo: {
    width: '100%',
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ruleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ruleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
