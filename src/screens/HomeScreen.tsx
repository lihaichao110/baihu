import React from 'react';
import { ScrollView, View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { Banner } from '../components/Banner';
import { FeatureCard } from '../components/FeatureCard';
import { ToolGrid } from '../components/ToolGrid';
import { colors } from '../theme/colors';

export const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Banner />

        <View style={styles.featureRow}>
          <FeatureCard
            title="自动任务"
            subtitle="Scheduled tasks"
            backgroundColor="#8EC5FC"
            width="half"
            style={{ backgroundColor: '#a18cd1' }} // Override with purple gradient-ish
          />
          <FeatureCard
            title="自动滚动"
            subtitle="auto roll"
            backgroundColor="#80d0c7"
            width="half"
            style={{ backgroundColor: '#43e97b' }} // Override with green gradient-ish
          />
        </View>

        <View style={styles.fullWidthFeature}>
          <FeatureCard
            title="自动刷新"
            subtitle="auto refresh"
            backgroundColor="#a18cd1"
            width="full"
            icon="🔄"
          />
        </View>

        <ToolGrid />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  fullWidthFeature: {
    paddingHorizontal: 20,
  },
});
