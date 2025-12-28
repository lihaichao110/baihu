/**
 * 文字匹配演示组件
 * @description 演示如何使用文字匹配功能
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTextMatching, useScriptExecution, MatchMode } from '../hooks';
import { TextMatchingUtils } from '../utils';
import type { ScriptStep } from '../types';

export default function TextMatchingDemo() {
  const [logs, setLogs] = useState<string[]>([]);
  const [targetText, setTargetText] = useState('确认');
  const [matchMode, setMatchMode] = useState<MatchMode>(MatchMode.CONTAINS);

  const textMatching = useTextMatching({
    enabled: true,
    checkInterval: 500,
    onMatched: (element, target) => {
      addLog(`✅ 找到匹配: ${element.text}`);
    },
    onNotFound: text => {
      addLog(`❌ 未找到: ${text}`);
    },
    onError: error => {
      addLog(`⚠️ 错误: ${error.message}`);
    },
  });

  const scriptExecution = useScriptExecution({
    onComplete: (success, executedSteps) => {
      addLog(success ? '🎉 脚本执行完成' : '❌ 脚本执行失败');
      addLog(`执行了 ${executedSteps} 个步骤`);
    },
    onStepStart: (step, index) => {
      addLog(`📍 步骤 ${index + 1}: ${step.description}`);
    },
    onStepComplete: (step, index, success) => {
      addLog(
        success ? `✅ 步骤 ${index + 1} 完成` : `❌ 步骤 ${index + 1} 失败`,
      );
    },
    onError: (error, step, index) => {
      addLog(`❌ 步骤 ${index + 1} 错误: ${error}`);
    },
  });

  const addLog = (message: string) => {
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // 示例脚本
  const exampleScript: ScriptStep[] = [
    {
      id: '1',
      description: '点击设置',
      targetText: '设置',
      matchMode: MatchMode.CONTAINS,
      action: 'tap',
      timeout: 10000,
      waitAfterAction: 1000,
      nextStepDelay: 500,
    },
    {
      id: '2',
      description: '点击通用',
      targetText: '通用',
      matchMode: MatchMode.CONTAINS,
      action: 'tap',
      timeout: 10000,
      waitAfterAction: 1000,
      nextStepDelay: 500,
    },
    {
      id: '3',
      description: '点击关于',
      targetText: '关于',
      matchMode: MatchMode.CONTAINS,
      action: 'tap',
      timeout: 10000,
      waitAfterAction: 1000,
      nextStepDelay: 500,
    },
  ];

  // 测试基础文字查找
  const testFindText = async () => {
    addLog(`🔍 开始查找文字: ${targetText}`);
    const result = await textMatching.findText(targetText, matchMode);
    if (result.matched && result.element) {
      addLog(
        `✅ 找到文字: ${result.element.text} 在 (${result.element.x.toFixed(
          0,
        )}, ${result.element.y.toFixed(0)})`,
      );
    } else {
      addLog(`❌ 未找到文字: ${targetText}`);
    }
  };

  // 测试自动点击
  const testAutoClick = async () => {
    addLog(`👆 开始自动点击: ${targetText}`);
    const result = await textMatching.autoClickByText(targetText, matchMode);
    if (result.success) {
      addLog(`✅ 已点击: ${result.element?.text}`);
    } else {
      addLog(`❌ 点击失败`);
    }
  };

  // 测试等待并点击
  const testWaitAndClick = async () => {
    addLog(`⏳ 等待文字出现: ${targetText}`);
    const result = await textMatching.waitAndClick(
      targetText,
      matchMode,
      30000,
    );
    if (result.success) {
      addLog(`✅ 已点击: ${result.element?.text}`);
    } else {
      addLog(`❌ 超时：未找到 ${targetText}`);
    }
  };

  // 获取所有屏幕文字
  const testGetAllTexts = async () => {
    addLog(`📱 获取所有屏幕文字...`);
    const texts = await textMatching.getAllTexts();
    addLog(`✅ 找到 ${texts.length} 个文字元素`);

    // 显示前 10 个
    texts.slice(0, 10).forEach(text => {
      addLog(`  - [${text.x.toFixed(0)}, ${text.y.toFixed(0)}] ${text.text}`);
    });
  };

  // 测试脚本执行
  const testScriptExecution = async () => {
    addLog(`🚀 开始执行脚本...`);
    await scriptExecution.executeScript(exampleScript);
  };

  // 测试智能查找
  const testSmartFind = async () => {
    addLog(`🔍 智能查找: ${targetText}`);
    const result = await textMatching.findTextWithContext(
      targetText,
      matchMode,
      {
        region: {
          x: 0,
          y: 0,
          width: 1080,
          height: 500,
        },
        minScore: 0.8,
      },
    );
    if (result.matched && result.element) {
      addLog(
        `✅ 智能匹配成功: ${result.element.text} (得分: ${(
          result.score || 0
        ).toFixed(2)})`,
      );
    } else {
      addLog(`❌ 智能匹配失败`);
    }
  };

  // 停止监听
  const stopListening = () => {
    textMatching.stopMatching();
    addLog(`⏹️ 已停止监听`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 文字匹配演示</Text>

      {/* 基础功能 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基础功能</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>目标文字:</Text>
          <Text
            style={styles.input}
            onPress={() => {
              Alert.prompt(
                '输入目标文字',
                '',
                text => setTargetText(text || '确认'),
                'plain',
                targetText,
              );
            }}
          >
            {targetText}
          </Text>
        </View>

        <View style={styles.row}>
          {Object.values(MatchMode).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeButton,
                matchMode === mode && styles.modeButtonActive,
              ]}
              onPress={() => setMatchMode(mode)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  matchMode === mode && styles.modeButtonTextActive,
                ]}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.button} onPress={testGetAllTexts}>
            <Text style={styles.buttonText}>获取所有文字</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={testFindText}>
            <Text style={styles.buttonText}>查找文字</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={testAutoClick}>
            <Text style={styles.buttonText}>自动点击</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={testWaitAndClick}>
            <Text style={styles.buttonText}>等待并点击</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={testSmartFind}>
            <Text style={styles.buttonText}>智能查找</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopListening}
          >
            <Text style={styles.buttonText}>停止监听</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 脚本执行 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>脚本执行</Text>

        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={[
              styles.button,
              scriptExecution.executionState.isRunning && styles.buttonDisabled,
            ]}
            onPress={testScriptExecution}
            disabled={scriptExecution.executionState.isRunning}
          >
            <Text style={styles.buttonText}>
              {scriptExecution.executionState.isRunning
                ? '执行中...'
                : '执行脚本'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              !scriptExecution.executionState.isRunning &&
                styles.buttonDisabled,
            ]}
            onPress={scriptExecution.stopExecution}
            disabled={!scriptExecution.executionState.isRunning}
          >
            <Text style={styles.buttonText}>停止执行</Text>
          </TouchableOpacity>
        </View>

        {scriptExecution.executionState.isRunning && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              步骤 {scriptExecution.executionState.currentStepIndex + 1} 进度:
              {scriptExecution.getProgressPercent()}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${scriptExecution.getProgressPercent()}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* 日志 */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>执行日志</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>清空</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    width: 80,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  button: {
    flex: 1,
    minWidth: 140,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearButton: {
    fontSize: 14,
    color: '#007AFF',
  },
  logContainer: {
    maxHeight: 300,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
