/**
 * 工具网格组件
 * @description 展示常用工具的网格布局
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { DIMENSIONS } from '../../../constants';

interface ToolItemProps {
  title: string;
  icon: string;
  color: string;
  iconBgColor?: string;
  isBarcode?: boolean;
  cardBackground?: string;
  onPress?: () => void;
}

const ToolItem: React.FC<ToolItemProps> = ({
  title,
  icon,
  color,
  iconBgColor,
  isBarcode,
  cardBackground,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor:
            cardBackground || (isBarcode ? '#E6E9F0' : '#F5F7FA'),
        },
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: color }]}>{title}</Text>
        {isBarcode ? (
          <View style={styles.barcodeContainer}>
            <Text style={styles.barcodeLines}>||| |||| || |||</Text>
          </View>
        ) : (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconBgColor || color },
            ]}
          >
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ToolGrid: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleScriptCollectionPress = () => {
    navigation.navigate('SessionList');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>常用工具</Text>

      <View style={styles.grid}>
        <ToolItem
          title="条形码"
          icon=""
          color="#667eea"
          isBarcode={true}
          cardBackground="#E8EAF6"
        />
        <ToolItem
          title="脚本集合"
          icon="📋"
          color="#a855f7"
          iconBgColor="#d8b4fe"
          cardBackground="#F3E8FF"
          onPress={handleScriptCollectionPress}
        />
        <ToolItem
          title="便捷白板"
          icon="📺"
          color="#0d9488"
          iconBgColor="#99f6e4"
          cardBackground="#E0F2F1"
        />
        <ToolItem
          title="随机生成密码"
          icon="🔒"
          color="#16a34a"
          iconBgColor="#86efac"
          cardBackground="#DCFCE7"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: DIMENSIONS.OUTER_MARGIN,
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: DIMENSIONS.INNER_PADDING,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  card: {
    width: DIMENSIONS.TOOL_ITEM_WIDTH,
    height: 100,
    borderRadius: 16,
    padding: 15,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  barcodeContainer: {
    alignItems: 'center',
    opacity: 0.5,
  },
  barcodeLines: {
    fontSize: 24,
    letterSpacing: 2,
    color: '#333',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  icon: {
    fontSize: 18,
    color: '#fff',
  },
});

