/**
 * 自定义悬浮层组件
 * @description 用于录制时的触摸悬浮层
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Dimensions,
  Platform,
} from 'react-native';
import type { TouchRecord } from '../../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CustomOverlayProps {
  isRecording: boolean;
  elapsedTime: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClose: () => void;
  onTouchRecorded: (record: TouchRecord) => void;
}

export const CustomOverlay: React.FC<CustomOverlayProps> = ({
  isRecording,
  elapsedTime,
  onStartRecording,
  onStopRecording,
  onClose,
  onTouchRecorded,
}) => {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTime = useRef<number>(0);
  const lastTapTime = useRef<number>(0);

  // 创建拖拽手势响应器
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        dragStartTime.current = Date.now();

        // 记录触摸开始位置
        if (isRecording) {
          const { pageX, pageY } = evt.nativeEvent;
          const record: TouchRecord = {
            x: pageX,
            y: pageY,
            timestamp: Date.now(),
            type: 'swipe_start',
          };
          onTouchRecorded(record);
        }
      },

      onPanResponderMove: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        // 更新悬浮窗位置
        const newX = Math.max(
          0,
          Math.min(SCREEN_WIDTH - 160, position.x + gestureState.dx),
        );
        const newY = Math.max(
          0,
          Math.min(SCREEN_HEIGHT - 120, position.y + gestureState.dy),
        );

        setPosition({ x: newX, y: newY });

        // 记录滑动轨迹
        if (isRecording) {
          const { pageX, pageY } = evt.nativeEvent;
          const record: TouchRecord = {
            x: pageX,
            y: pageY,
            timestamp: Date.now(),
            type: 'swipe_move',
          };
          onTouchRecorded(record);
        }
      },

      onPanResponderRelease: (evt: GestureResponderEvent) => {
        setIsDragging(false);
        const dragDuration = Date.now() - dragStartTime.current;

        // 记录触摸结束位置
        if (isRecording) {
          const { pageX, pageY } = evt.nativeEvent;
          const record: TouchRecord = {
            x: pageX,
            y: pageY,
            timestamp: Date.now(),
            type: 'swipe_end',
          };
          onTouchRecorded(record);
        }

        // 如果是快速点击（不是拖拽），则视为tap
        if (dragDuration < 200 && isRecording) {
          const { pageX, pageY } = evt.nativeEvent;
          const now = Date.now();

          // 防止重复记录（双击保护）
          if (now - lastTapTime.current > 300) {
            const record: TouchRecord = {
              x: pageX,
              y: pageY,
              timestamp: now,
              type: 'tap',
            };
            onTouchRecorded(record);
            lastTapTime.current = now;
          }
        }
      },
    }),
  ).current;

  return (
    <View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
        },
        isDragging && styles.dragging,
      ]}
      {...panResponder.panHandlers}
    >
      {/* 悬浮窗头部 - 拖拽区域 */}
      <View style={styles.header}>
        <View style={styles.dragIndicator}>
          <View style={styles.dragLine} />
          <View style={styles.dragLine} />
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 时间显示 */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>录制时间</Text>
        <Text style={styles.timeText}>{elapsedTime}</Text>
      </View>

      {/* 状态指示器 */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isRecording && styles.statusDotActive]} />
        <Text style={styles.statusText}>
          {isRecording ? '录制中...' : '等待录制'}
        </Text>
      </View>

      {/* 控制按钮 */}
      <View style={styles.buttonContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={onStartRecording}
          >
            <Text style={styles.buttonText}>▶ 开始录制</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={onStopRecording}
          >
            <Text style={styles.buttonText}>⏹ 停止录制</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 提示文本 */}
      {isRecording && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>📍 正在记录触摸位置</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 160,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragging: {
    opacity: 0.8,
    shadowOpacity: 0.5,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragIndicator: {
    flexDirection: 'column',
    gap: 3,
  },
  dragLine: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginBottom: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#ff4444',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
  },
  buttonContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  hintContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    textAlign: 'center',
  },
});

