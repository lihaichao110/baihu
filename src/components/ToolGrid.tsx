import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 15;
const PADDING = 20;
const ITEM_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

interface ToolItemProps {
  title: string;
  icon: string; // Emoji for now
  color: string;
  iconBgColor?: string;
  isBarcode?: boolean; // Special styling for the barcode one
}

const ToolItem = ({
  title,
  icon,
  color,
  iconBgColor,
  isBarcode,
}: ToolItemProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: isBarcode ? '#E6E9F0' : '#F5F7FA' },
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

export const ToolGrid = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>常用工具</Text>

      <View style={styles.grid}>
        <ToolItem title="条形码" icon="" color="#667eea" isBarcode={true} />
        <ToolItem
          title="旋转指针"
          icon="💧"
          color="#dba4f9"
          iconBgColor="#e0c3fc"
        />
        <ToolItem
          title="便捷白板"
          icon="📺"
          color="#38f9d7"
          iconBgColor="#baffed"
        />
        <ToolItem
          title="随机生成密码"
          icon="🔒"
          color="#43e97b"
          iconBgColor="#a8ffc6"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
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
    width: ITEM_WIDTH,
    height: 100,
    borderRadius: 16,
    padding: 15,
    justifyContent: 'center',
    backgroundColor: '#fff', // Default white
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
