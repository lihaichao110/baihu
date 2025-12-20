# 快速开始 - 悬浮窗与触摸记录

## 安装依赖

所有必要的依赖已经安装：

```json
{
  "rn-android-overlay-permission": "^1.0.6",
  "react-native-magic-overlay": "^0.1.2",
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

## 运行应用

```bash
# 启动 Metro bundler
yarn start

# 在另一个终端运行 Android
yarn android
```

## 使用步骤

### 1️⃣ 启动应用并授予权限

1. 打开应用后，点击首页的"**自动任务**"横幅
2. 如果是首次使用，会提示需要以下权限：
   - **无障碍服务权限**：点击"去设置"，在设置中找到"白虎"应用并开启
   - **悬浮窗权限**：点击"去设置"，允许应用显示悬浮窗

### 2️⃣ 开始录制触摸

1. 授权完成后，屏幕上会出现一个**可拖动的悬浮窗**
2. 悬浮窗显示：
   - 📍 当前录制时间
   - 🔴 录制状态指示器
   - ▶️ 开始/停止按钮
3. 点击"**开始录制**"按钮
4. 在屏幕上**随意点击和滑动**
5. 悬浮窗会实时记录您的所有触摸操作

### 3️⃣ 停止录制并查看结果

1. 点击悬浮窗上的"**停止录制**"按钮
2. 会弹出统计信息，显示：
   - 录制时长
   - 总触摸事件数
   - 点击次数
   - 滑动次数
3. 点击"**查看详情**"可以在控制台看到完整的 JSON 数据

### 4️⃣ 管理录制会话（可选）

虽然目前没有直接入口，但您可以通过以下方式查看所有会话：

```typescript
import TouchRecorder from './src/utils/TouchRecorder';

// 获取所有会话
const sessions = await TouchRecorder.getAllSessions();
console.log('所有会话:', sessions);

// 导出某个会话
const json = TouchRecorder.exportSessionToJSON(sessions[0]);
console.log('导出的 JSON:', json);
```

## 悬浮窗功能说明

### 可拖动定位
- **长按并拖动**悬浮窗的头部区域（有两条横线的地方）
- 悬浮窗会自动限制在屏幕范围内
- 拖动时悬浮窗会变得半透明，提供视觉反馈

### 触摸识别
- **点击（Tap）**：快速触摸屏幕（< 200ms）
- **滑动（Swipe）**：
  - `swipe_start` - 手指按下
  - `swipe_move` - 手指移动（会记录轨迹）
  - `swipe_end` - 手指抬起

### 防误触
- 连续点击有 300ms 防抖保护
- 拖动悬浮窗不会被误记录为滑动

## 记录的数据格式

每个触摸事件记录以下信息：

```typescript
{
  x: 540,              // X 坐标（相对于屏幕）
  y: 1200,             // Y 坐标（相对于屏幕）
  timestamp: 1734707201000,  // UNIX 时间戳（毫秒）
  type: "tap"          // 触摸类型：tap | swipe_start | swipe_move | swipe_end
}
```

完整会话数据：

```typescript
{
  id: "session_1734707200000",
  startTime: 1734707200000,
  endTime: 1734707215000,
  deviceInfo: {
    width: 1080,       // 设备屏幕宽度
    height: 2400       // 设备屏幕高度
  },
  touches: [...]       // 所有触摸事件数组
}
```

## 查看日志

在录制过程中，控制台会实时输出触摸记录：

```bash
# Android 日志
npx react-native log-android

# 输出示例：
记录触摸: tap at (540, 1200)
记录触摸: swipe_start at (300, 800)
记录触摸: swipe_move at (350, 750)
记录触摸: swipe_move at (400, 700)
记录触摸: swipe_end at (700, 500)
```

## 常见问题

### Q: 悬浮窗不显示？
A: 确保已经授予"悬浮窗权限"（SYSTEM_ALERT_WINDOW）。在设置中找到应用，允许"显示在其他应用上层"。

### Q: 录制的数据保存在哪里？
A: 所有数据保存在应用的本地存储中（AsyncStorage），卸载应用会丢失。建议重要数据及时导出为 JSON。

### Q: 可以在其他应用中使用悬浮窗吗？
A: 悬浮窗目前只在应用内显示。如需在其他应用上层显示，需要额外的原生开发工作。

### Q: iOS 支持吗？
A: iOS 系统不支持系统级悬浮窗，此功能仅限 Android。

### Q: 触摸坐标是相对于什么的？
A: 坐标是相对于整个屏幕的，原点(0,0)在屏幕左上角。

## 代码示例

### 在您的代码中访问触摸记录

```typescript
import TouchRecorder from './src/utils/TouchRecorder';

// 获取所有会话
const sessions = await TouchRecorder.getAllSessions();

// 获取特定会话
const session = await TouchRecorder.getSession('session_1734707200000');

// 获取统计信息
const stats = TouchRecorder.getSessionStats(session);
console.log(`总触摸: ${stats.totalTouches}`);
console.log(`点击: ${stats.taps}`);
console.log(`滑动: ${stats.swipes}`);
console.log(`时长: ${stats.duration}ms`);

// 导出为 JSON
const json = TouchRecorder.exportSessionToJSON(session);
// 可以保存到文件或发送到服务器

// 删除会话
await TouchRecorder.deleteSession(session.id);

// 清空所有会话
await TouchRecorder.clearAllSessions();
```

### 自定义悬浮窗样式

编辑 `src/components/CustomOverlay.tsx` 中的样式：

```typescript
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 160,  // 修改宽度
    backgroundColor: 'rgba(30, 30, 30, 0.95)',  // 修改背景色
    borderRadius: 16,  // 修改圆角
    // ... 其他样式
  },
  // ... 更多样式
});
```

## 下一步

基于当前的触摸记录功能，您可以：

1. ✅ 实现**回放功能** - 根据记录的坐标和时间自动执行触摸
2. ✅ 添加**编辑器** - 可视化编辑触摸序列
3. ✅ 创建**脚本库** - 保存和管理多个自动化脚本
4. ✅ 实现**循环执行** - 重复执行录制的操作
5. ✅ 添加**条件判断** - 根据屏幕内容决定执行路径

## 技术支持

- 查看详细文档：`FLOATING_WINDOW_GUIDE.md`
- GitHub Issues：报告问题和建议
- 控制台日志：使用 `npx react-native log-android` 查看详细日志

---

**祝您使用愉快！🎉**

