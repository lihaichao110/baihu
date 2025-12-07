import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 15;
const OUTER_MARGIN = 20;
const INNER_PADDING = 15;
// Calculate item width based on available space inside the card
// Screen Width - Outer Margins (20*2) - Inner Padding (15*2) - Gap (15)
const ITEM_WIDTH =
  (SCREEN_WIDTH - OUTER_MARGIN * 2 - INNER_PADDING * 2 - GAP) / 2;

interface ToolItemProps {
  title: string;
  icon: string;
  color: string;
  iconBgColor?: string;
  isBarcode?: boolean;
  cardBackground?: string;
}

const ToolItem = ({
  title,
  icon,
  color,
  iconBgColor,
  isBarcode,
  cardBackground,
}: ToolItemProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
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

export const ToolGrid = () => {
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
          title="旋转指针"
          icon="💧"
          color="#a855f7" // Darker purple text
          iconBgColor="#d8b4fe" // Lighter purple icon bg
          cardBackground="#F3E8FF" // Light purple card bg
        />
        <ToolItem
          title="便捷白板"
          icon="📺"
          color="#0d9488" // Teal text
          iconBgColor="#99f6e4" // Light teal icon bg
          cardBackground="#E0F2F1" // Light teal card bg
        />
        <ToolItem
          title="随机生成密码"
          icon="🔒"
          color="#16a34a" // Green text
          iconBgColor="#86efac" // Light green icon bg
          cardBackground="#DCFCE7" // Light green card bg
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: OUTER_MARGIN,
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight transparency for glass feel
    borderRadius: 24,
    padding: INNER_PADDING,
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
