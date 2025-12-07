import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const Banner = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>自动连点器</Text>
        <Text style={styles.subtitle}>解放你的双手，你的手机管家</Text>

        <View style={styles.iconRow}>
          {/* Placeholders for icons */}
          <View style={styles.iconPlaceholder}>
            <Text style={styles.iconText}>↕️</Text>
          </View>
          <View style={styles.iconPlaceholder}>
            <Text style={styles.iconText}>🔄</Text>
          </View>
          <View style={styles.iconPlaceholder}>
            <Text style={styles.iconText}>○</Text>
          </View>
          <View style={styles.iconPlaceholder}>
            <Text style={styles.iconText}>::</Text>
          </View>
        </View>
      </View>
      <Image
        source={{
          uri: 'https://via.placeholder.com/100x100/4facfe/ffffff?text=Gift',
        }}
        style={styles.image}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4facfe', // Fallback for gradient
    margin: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 180,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 15,
  },
  iconPlaceholder: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: colors.text.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
});
