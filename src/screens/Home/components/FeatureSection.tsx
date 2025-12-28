/**
 * 功能区域组件
 * @description 展示自动连点器、自动滚动、自动刷新、文字匹配等功能卡片
 */

import React, { useState } from 'react';
import {
  Platform,
  Alert,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { FeatureCard } from '../../../components';
import { FloatingWindowService, TextMatchingService } from '../../../services';
import { MatchMode } from '../../../types';
import { styles } from '../HomeScreen.styles';

interface FeatureSectionProps {
  isAccessibilityEnabled: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  isAccessibilityEnabled,
}) => {
  const [showTextMatchingModal, setShowTextMatchingModal] = useState(false);
  const [targetText, setTargetText] = useState('确认');
  const [matchMode, setMatchMode] = useState<MatchMode>(MatchMode.CONTAINS);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

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

  const handleTextMatchingPress = async () => {
    if (Platform.OS === 'android') {
      const accessibilityEnabled =
        await FloatingWindowService.isAccessibilityServiceEnabled();

      if (!accessibilityEnabled) {
        Alert.alert(
          '需要开启无障碍服务',
          '文字匹配需要无障碍服务权限才能正常工作。',
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

    setShowTextMatchingModal(true);
    addLog('打开文字匹配工具');
  };

  const handleFindText = async () => {
    addLog(`查找文字: ${targetText}`);
    const result = await TextMatchingService.findText(targetText, matchMode);
    if (result.matched && result.element) {
      addLog(
        `✅ 找到: ${result.element.text} [${result.element.x.toFixed(
          0,
        )}, ${result.element.y.toFixed(0)}]`,
      );
    } else {
      addLog(`❌ 未找到: ${targetText}`);
    }
  };

  const handleAutoClick = async () => {
    addLog(`自动点击: ${targetText}`);
    const result = await TextMatchingService.autoClickByText(
      targetText,
      matchMode,
    );
    if (result.success) {
      addLog(`✅ 已点击: ${result.element?.text}`);
    } else {
      addLog(`❌ 点击失败`);
    }
  };

  const handleGetAllTexts = async () => {
    addLog('获取屏幕所有文字...');
    const texts = await TextMatchingService.getAllTexts();
    addLog(`✅ 共找到 ${texts.length} 个文字元素`);
    texts.slice(0, 5).forEach(text => {
      addLog(`  - [${text.x.toFixed(0)}, ${text.y.toFixed(0)}] ${text.text}`);
    });
  };

  const clearLogs = () => {
    setLogs([]);
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
          title="文字匹配"
          subtitle="text match"
          backgroundColor="#FF9500"
          width="full"
          icon="🔍"
          onPress={handleTextMatchingPress}
          disabled={Platform.OS === 'android' && !isAccessibilityEnabled}
        />
      </View>

      {/* 文字匹配模态框 */}
      <Modal
        visible={showTextMatchingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTextMatchingModal(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>🔍 文字匹配工具</Text>
              <TouchableOpacity onPress={() => setShowTextMatchingModal(false)}>
                <Text style={modalStyles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={modalStyles.inputSection}>
              <Text style={modalStyles.label}>目标文字:</Text>
              <TextInput
                style={modalStyles.input}
                value={targetText}
                onChangeText={setTargetText}
                placeholder="输入要查找的文字"
              />
            </View>

            <View style={modalStyles.modeSection}>
              <Text style={modalStyles.label}>匹配模式:</Text>
              <View style={modalStyles.modeButtons}>
                {Object.values(MatchMode).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      modalStyles.modeButton,
                      matchMode === mode && modalStyles.modeButtonActive,
                    ]}
                    onPress={() => setMatchMode(mode)}
                  >
                    <Text
                      style={[
                        modalStyles.modeButtonText,
                        matchMode === mode && modalStyles.modeButtonTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={modalStyles.actionButton}
                onPress={handleGetAllTexts}
              >
                <Text style={modalStyles.buttonText}>获取所有文字</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.actionButton}
                onPress={handleFindText}
              >
                <Text style={modalStyles.buttonText}>查找</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.actionButton}
                onPress={handleAutoClick}
              >
                <Text style={modalStyles.buttonText}>自动点击</Text>
              </TouchableOpacity>
            </View>

            <View style={modalStyles.logSection}>
              <View style={modalStyles.logHeader}>
                <Text style={modalStyles.logTitle}>操作日志</Text>
                <TouchableOpacity onPress={clearLogs}>
                  <Text style={modalStyles.clearButton}>清空</Text>
                </TouchableOpacity>
              </View>
              <View style={modalStyles.logContainer}>
                {logs.length === 0 ? (
                  <Text style={modalStyles.emptyLog}>暂无日志</Text>
                ) : (
                  logs.map((log, index) => (
                    <Text key={index} style={modalStyles.logText}>
                      {log}
                    </Text>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 5,
  },
  inputSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  modeSection: {
    marginBottom: 16,
  },
  modeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#FF9500',
  },
  modeButtonText: {
    fontSize: 12,
    color: '#333',
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  actionButton: {
    flex: 1,
    margin: 4,
    paddingVertical: 12,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logSection: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF9500',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    maxHeight: 200,
  },
  emptyLog: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
