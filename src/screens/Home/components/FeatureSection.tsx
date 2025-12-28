/**
 * 功能区域组件
 * @description 展示自动连点器、自动滚动、自动刷新等功能卡片
 */

import React from 'react';
import { Platform, Alert, View } from 'react-native';
import { FeatureCard } from '../../../components';
import { FloatingWindowService } from '../../../services';
import { styles } from '../HomeScreen.styles';

interface FeatureSectionProps {
  isAccessibilityEnabled: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  isAccessibilityEnabled,
}) => {
  const handleAutoClickerPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动连点器需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowService.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动连点器功能开发中...');
  };

  const handleAutoScrollPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动滚动需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowService.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动滚动功能开发中...');
  };

  const handleAutoRefreshPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '自动刷新需要无障碍服务权限才能正常工作。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => FloatingWindowService.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
    }

    Alert.alert('功能提示', '自动刷新功能开发中...');
  };

  return (
    <>
      <View style={styles.featureRow}>
        <FeatureCard
          title="自动连点器"
          subtitle="auto clicker"
          backgroundColor="#8EC5FC"
          width="half"
          style={styles.purpleCard}
          onPress={handleAutoClickerPress}
          disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
        />
        <FeatureCard
          title="自动滚动"
          subtitle="auto roll"
          backgroundColor="#80d0c7"
          width="half"
          style={styles.greenCard}
          onPress={handleAutoScrollPress}
          disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
        />
      </View>

      <View style={styles.fullWidthFeature}>
        <FeatureCard
          title="自动刷新"
          subtitle="auto refresh"
          backgroundColor="#a18cd1"
          width="full"
          icon="🔄"
          onPress={handleAutoRefreshPress}
          disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
        />
      </View>
    </>
  );
};
