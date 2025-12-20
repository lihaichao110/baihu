/**
 * TouchRecorder 使用示例
 * 
 * 本文件展示了如何使用 TouchRecorder 进行触摸记录的各种操作
 */

import TouchRecorder, { RecordingSession, TouchRecord } from '../utils/TouchRecorder';
import { Dimensions } from 'react-native';

export class TouchRecorderExample {
  
  /**
   * 示例 1: 基本录制流程
   */
  static async basicRecordingExample() {
    const { width, height } = Dimensions.get('window');
    
    // 开始录制
    TouchRecorder.startRecording(width, height);
    console.log('✅ 开始录制');
    
    // 模拟一些触摸事件
    const touchRecords: TouchRecord[] = [
      { x: 540, y: 1200, timestamp: Date.now(), type: 'tap' },
      { x: 300, y: 800, timestamp: Date.now() + 1000, type: 'swipe_start' },
      { x: 700, y: 500, timestamp: Date.now() + 2000, type: 'swipe_end' },
    ];
    
    touchRecords.forEach(record => {
      TouchRecorder.recordTouch(record);
    });
    
    // 停止录制
    const session = await TouchRecorder.stopRecording();
    console.log('✅ 停止录制，会话 ID:', session?.id);
    
    return session;
  }
  
  /**
   * 示例 2: 查看所有会话
   */
  static async viewAllSessionsExample() {
    const sessions = await TouchRecorder.getAllSessions();
    
    console.log(`📋 共有 ${sessions.length} 个会话`);
    
    sessions.forEach((session, index) => {
      const stats = TouchRecorder.getSessionStats(session);
      const date = new Date(session.startTime);
      
      console.log(`\n会话 ${index + 1}:`);
      console.log(`  ID: ${session.id}`);
      console.log(`  时间: ${date.toLocaleString()}`);
      console.log(`  时长: ${Math.floor(stats.duration / 1000)}秒`);
      console.log(`  触摸事件: ${stats.totalTouches}`);
      console.log(`  点击: ${stats.taps}`);
      console.log(`  滑动: ${stats.swipes}`);
    });
    
    return sessions;
  }
  
  /**
   * 示例 3: 导出会话数据
   */
  static async exportSessionExample(sessionId?: string) {
    const sessions = await TouchRecorder.getAllSessions();
    
    if (sessions.length === 0) {
      console.log('❌ 没有可导出的会话');
      return null;
    }
    
    // 如果没有指定 ID，导出最新的会话
    const session = sessionId 
      ? await TouchRecorder.getSession(sessionId)
      : sessions[sessions.length - 1];
    
    if (!session) {
      console.log('❌ 找不到会话');
      return null;
    }
    
    const json = TouchRecorder.exportSessionToJSON(session);
    console.log('📤 导出的 JSON 数据:');
    console.log(json);
    
    // 在实际应用中，可以：
    // 1. 保存到文件
    // 2. 发送到服务器
    // 3. 分享给其他用户
    
    return json;
  }
  
  /**
   * 示例 4: 分析触摸模式
   */
  static async analyzeTouchPatternExample() {
    const sessions = await TouchRecorder.getAllSessions();
    
    if (sessions.length === 0) {
      console.log('❌ 没有会话可分析');
      return;
    }
    
    let totalTaps = 0;
    let totalSwipes = 0;
    let totalDuration = 0;
    
    sessions.forEach(session => {
      const stats = TouchRecorder.getSessionStats(session);
      totalTaps += stats.taps;
      totalSwipes += stats.swipes;
      totalDuration += stats.duration;
    });
    
    console.log('\n📊 触摸模式分析:');
    console.log(`  总会话数: ${sessions.length}`);
    console.log(`  总点击次数: ${totalTaps}`);
    console.log(`  总滑动次数: ${totalSwipes}`);
    console.log(`  平均每次会话点击: ${(totalTaps / sessions.length).toFixed(1)}`);
    console.log(`  平均每次会话滑动: ${(totalSwipes / sessions.length).toFixed(1)}`);
    console.log(`  总录制时长: ${Math.floor(totalDuration / 1000)}秒`);
  }
  
  /**
   * 示例 5: 查找特定区域的触摸
   */
  static async findTouchesInAreaExample(
    x: number, 
    y: number, 
    radius: number = 50
  ) {
    const sessions = await TouchRecorder.getAllSessions();
    const touchesInArea: Array<{
      session: RecordingSession;
      touch: TouchRecord;
    }> = [];
    
    sessions.forEach(session => {
      session.touches.forEach(touch => {
        const distance = Math.sqrt(
          Math.pow(touch.x - x, 2) + Math.pow(touch.y - y, 2)
        );
        
        if (distance <= radius) {
          touchesInArea.push({ session, touch });
        }
      });
    });
    
    console.log(`\n🎯 在 (${x}, ${y}) 半径 ${radius} 内找到 ${touchesInArea.length} 个触摸`);
    
    touchesInArea.forEach(({ session, touch }, index) => {
      console.log(`  ${index + 1}. ${touch.type} at (${touch.x}, ${touch.y})`);
    });
    
    return touchesInArea;
  }
  
  /**
   * 示例 6: 计算触摸速度（适用于滑动）
   */
  static calculateSwipeVelocity(session: RecordingSession) {
    const swipes: Array<{
      startTime: number;
      endTime: number;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      distance: number;
      duration: number;
      velocity: number;
    }> = [];
    
    let currentSwipe: any = null;
    
    session.touches.forEach(touch => {
      if (touch.type === 'swipe_start') {
        currentSwipe = {
          startTime: touch.timestamp,
          startX: touch.x,
          startY: touch.y,
        };
      } else if (touch.type === 'swipe_end' && currentSwipe) {
        const distance = Math.sqrt(
          Math.pow(touch.x - currentSwipe.startX, 2) +
          Math.pow(touch.y - currentSwipe.startY, 2)
        );
        const duration = touch.timestamp - currentSwipe.startTime;
        const velocity = distance / duration * 1000; // 像素/秒
        
        swipes.push({
          ...currentSwipe,
          endTime: touch.timestamp,
          endX: touch.x,
          endY: touch.y,
          distance,
          duration,
          velocity,
        });
        
        currentSwipe = null;
      }
    });
    
    console.log(`\n⚡ 滑动速度分析 (共 ${swipes.length} 次滑动):`);
    swipes.forEach((swipe, index) => {
      console.log(
        `  ${index + 1}. 距离: ${swipe.distance.toFixed(0)}px, ` +
        `时长: ${swipe.duration}ms, ` +
        `速度: ${swipe.velocity.toFixed(0)}px/s`
      );
    });
    
    return swipes;
  }
  
  /**
   * 示例 7: 清理旧会话
   */
  static async cleanOldSessionsExample(daysOld: number = 7) {
    const sessions = await TouchRecorder.getAllSessions();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const session of sessions) {
      if (session.startTime < cutoffTime) {
        await TouchRecorder.deleteSession(session.id);
        deletedCount++;
      }
    }
    
    console.log(`🗑️ 删除了 ${deletedCount} 个 ${daysOld} 天前的会话`);
  }
  
  /**
   * 示例 8: 生成热力图数据
   */
  static generateHeatmapData(sessions: RecordingSession[]) {
    const heatmapData: Map<string, number> = new Map();
    const gridSize = 50; // 每个网格 50x50 像素
    
    sessions.forEach(session => {
      session.touches.forEach(touch => {
        // 将坐标转换为网格位置
        const gridX = Math.floor(touch.x / gridSize);
        const gridY = Math.floor(touch.y / gridSize);
        const key = `${gridX},${gridY}`;
        
        heatmapData.set(key, (heatmapData.get(key) || 0) + 1);
      });
    });
    
    // 找出最热的区域
    const sortedAreas = Array.from(heatmapData.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('\n🔥 触摸热力图 (Top 5 热门区域):');
    sortedAreas.forEach(([key, count], index) => {
      const [gridX, gridY] = key.split(',').map(Number);
      const x = gridX * gridSize;
      const y = gridY * gridSize;
      console.log(
        `  ${index + 1}. 区域 (${x}-${x + gridSize}, ${y}-${y + gridSize}): ${count} 次触摸`
      );
    });
    
    return heatmapData;
  }
}

// 使用示例：
// 
// import { TouchRecorderExample } from './path/to/TouchRecorderExample';
//
// // 运行基本录制示例
// const session = await TouchRecorderExample.basicRecordingExample();
//
// // 查看所有会话
// await TouchRecorderExample.viewAllSessionsExample();
//
// // 导出最新会话
// await TouchRecorderExample.exportSessionExample();
//
// // 分析触摸模式
// await TouchRecorderExample.analyzeTouchPatternExample();
//
// // 查找特定区域的触摸
// await TouchRecorderExample.findTouchesInAreaExample(540, 1200, 100);
//
// // 计算滑动速度
// if (session) {
//   TouchRecorderExample.calculateSwipeVelocity(session);
// }
//
// // 清理 7 天前的会话
// await TouchRecorderExample.cleanOldSessionsExample(7);
//
// // 生成热力图
// const sessions = await TouchRecorder.getAllSessions();
// TouchRecorderExample.generateHeatmapData(sessions);

