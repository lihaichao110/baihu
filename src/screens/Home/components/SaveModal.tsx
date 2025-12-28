/**
 * 保存脚本模态框组件
 * @description 用于保存录制的脚本
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { styles } from '../HomeScreen.styles';

interface SaveModalProps {
  visible: boolean;
  scriptName: string;
  onScriptNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  visible,
  scriptName,
  onScriptNameChange,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>保存脚本</Text>
          <Text style={styles.modalSubtitle}>
            请为录制的操作命名，方便后续查找和使用
          </Text>
          <TextInput
            style={styles.modalInput}
            value={scriptName}
            onChangeText={onScriptNameChange}
            placeholder="请输入脚本名称"
            placeholderTextColor="#999"
            autoFocus={true}
            maxLength={50}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.modalCancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.modalConfirmText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

