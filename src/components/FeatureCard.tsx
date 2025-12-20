import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import colors from '../theme/colors';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  backgroundColor: string; // Simplification: pass main color
  width?: 'full' | 'half';
  icon?: string; // URL or emoji
  imageUri?: string;
  style?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 15;
const PADDING = 20;
const HALF_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

export const FeatureCard = ({
  title,
  subtitle,
  backgroundColor,
  width = 'half',
  imageUri,
  style,
}: FeatureCardProps) => {
  const cardStyle = [
    styles.container,
    {
      backgroundColor,
      width: width === 'full' ? '100%' : HALF_WIDTH,
    },
    style,
  ];

  return (
    <TouchableOpacity style={cardStyle} activeOpacity={0.9}>
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
