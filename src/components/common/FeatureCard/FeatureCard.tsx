/**
 * 功能卡片组件
 * @description 用于展示功能入口的卡片组件
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { colors } from '../../../theme';
import { DIMENSIONS } from '../../../constants';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  backgroundColor: string;
  width?: 'full' | 'half';
  icon?: string;
  imageUri?: string;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  subtitle,
  backgroundColor,
  width = 'half',
  imageUri,
  style,
  onPress,
  disabled = false,
}) => {
  const cardStyle = [
    styles.container,
    {
      backgroundColor,
      width: width === 'full' ? '100%' : DIMENSIONS.HALF_CARD_WIDTH,
      opacity: disabled ? 0.6 : 1,
    },
    style,
  ];

  return (
    <TouchableOpacity
      style={cardStyle as ViewStyle[]}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {!imageUri && (
        <View style={styles.fingerIcon}>
          <Text style={{ fontSize: 40 }}>👆</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 100,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  textContainer: {
    flex: 1,
    zIndex: 2,
  },
  title: {
    color: colors.text.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  image: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    position: 'absolute',
    right: 10,
    bottom: 0,
    zIndex: 1,
  },
  fingerIcon: {
    position: 'absolute',
    right: 10,
    bottom: -10,
    opacity: 0.8,
  },
});

