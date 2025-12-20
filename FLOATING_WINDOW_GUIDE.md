# 悬浮窗与触摸记录功能说明

## 功能概述

本应用使用了以下两个插件来实现自定义悬浮窗和触摸记录功能：

1. **rn-android-overlay-permission** - 用于请求和管理 Android 悬浮窗权限
2. **react-native-magic-overlay** - 用于创建和显示自定义悬浮窗界面

## 主要功能

### 1. 自定义悬浮窗 (`CustomOverlay`)

位置：`src/components/CustomOverlay.tsx`

**功能特点：**
- ✅ 可拖动定位 - 用户可以拖动悬浮窗到屏幕任意位置
- ✅ 实时状态显示 - 显示录制状态和经过时间
- ✅ 触摸手势识别 - 区分点击（tap）和滑动（swipe）
- ✅ 边界检测 - 悬浮窗不会超出屏幕范围
- ✅ 视觉反馈 - 拖动时有透明度变化效果

**交互方式：**
- 长按拖动：移动悬浮窗位置
- 点击"开始录制"：开始记录触摸事件
- 点击"停止录制"：结束录制并保存会话
- 点击"✕"按钮：关闭悬浮窗

### 2. 触摸记录系统 (`TouchRecorder`)

位置：`src/utils/TouchRecorder.ts`

**记录的触摸类型：**
- `tap` - 快速点击（< 200ms）
- `swipe_start` - 滑动开始
- `swipe_move` - 滑动过程中的移动
- `swipe_end` - 滑动结束

**记录的信息：**
```typescript
interface TouchRecord {
  x: number;           // 触摸的 X 坐标
  y: number;           // 触摸的 Y 坐标
  timestamp: number;   // 时间戳（毫秒）
  type: string;        // 触摸类型
}
```

**会话信息：**
```typescript
interface RecordingSession {
  id: string;                    // 唯一会话 ID
  startTime: number;             // 开始时间
  endTime?: number;              // 结束时间
  touches: TouchRecord[];        // 所有触摸记录
  deviceInfo: {                  // 设备信息
    width: number;
    height: number;
  };
}
```

### 3. 数据持久化

所有录制会话都会自动保存到本地存储（使用 `@react-native-async-storage/async-storage`）。

**可用操作：**
- `startRecording()` - 开始新的录制会话
- `stopRecording()` - 停止录制并保存
- `getAllSessions()` - 获取所有已保存的会话
- `getSession(id)` - 获取特定会话
- `deleteSession(id)` - 删除指定会话
- `clearAllSessions()` - 清空所有会话
- `exportSessionToJSON()` - 导出会话为 JSON 格式

## 使用流程

### 1. 启动自动任务

```
首页 → 点击"自动任务"横幅
     ↓
检查无障碍服务权限
     ↓
检查悬浮窗权限
     ↓
显示自定义悬浮窗
```

### 2. 录制触摸操作

```
点击"开始录制"按钮
     ↓
在屏幕上进行点击或滑动操作
     ↓
悬浮窗实时显示录制时间和状态
     ↓
所有触摸位置被记录
     ↓
点击"停止录制"按钮
     ↓
显示录制统计信息
```

### 3. 查看和管理会话

```
打开会话列表屏幕
     ↓
查看所有录制会话
     ↓
点击会话查看详细信息
     ↓
导出为 JSON 或删除会话
```

## 权限说明

### Android 权限

1. **悬浮窗权限（SYSTEM_ALERT_WINDOW）**
   - 用途：在其他应用上层显示悬浮窗
   - 请求方式：通过 `rn-android-overlay-permission` 插件
   - 需要用户手动在系统设置中授权

2. **无障碍服务权限**
   - 用途：实现自动化操作（未来功能）
   - 需要用户在无障碍设置中手动开启

### iOS 限制

iOS 系统不支持系统级悬浮窗，该功能仅在 Android 平台可用。

## 技术实现细节

### 手势识别

悬浮窗使用 React Native 的 `PanResponder` 来处理手势：

```typescript
const panResponder = PanResponder.create({
  onPanResponderGrant: (evt) => {
    // 记录触摸开始位置
    if (isRecording) {
      onTouchRecorded({
        x: evt.nativeEvent.pageX,
        y: evt.nativeEvent.pageY,
        timestamp: Date.now(),
        type: 'swipe_start',
      });
    }
  },
  onPanResponderMove: (evt, gestureState) => {
    // 更新悬浮窗位置
    // 记录滑动轨迹
  },
  onPanResponderRelease: (evt) => {
    // 区分点击和拖动
    // 记录触摸结束
  },
});
```

### 防抖和去重

- 点击事件有 300ms 的防抖保护，避免重复记录
- 拖动时间小于 200ms 被识别为点击，而非拖动

### 边界限制

```typescript
const newX = Math.max(0, Math.min(SCREEN_WIDTH - 160, x));
const newY = Math.max(0, Math.min(SCREEN_HEIGHT - 120, y));
```

## 数据格式示例

导出的 JSON 数据格式：

```json
{
  "id": "session_1734707200000",
  "startTime": 1734707200000,
  "endTime": 1734707215000,
  "deviceInfo": {
    "width": 1080,
    "height": 2400
  },
  "touches": [
    {
      "x": 540,
      "y": 1200,
      "timestamp": 1734707201000,
      "type": "tap"
    },
    {
      "x": 300,
      "y": 800,
      "timestamp": 1734707205000,
      "type": "swipe_start"
    },
    {
      "x": 350,
      "y": 750,
      "timestamp": 1734707205100,
      "type": "swipe_move"
    },
    {
      "x": 700,
      "y": 500,
      "timestamp": 1734707206000,
      "type": "swipe_end"
    }
  ]
}
```

## 未来扩展

基于当前的触摸记录系统，可以实现：

1. **回放功能** - 根据记录的触摸位置和时间自动执行
2. **编辑功能** - 编辑、删除或重排触摸事件
3. **循环执行** - 重复执行录制的操作序列
4. **条件判断** - 根据屏幕内容决定执行哪些操作
5. **脚本导出** - 将触摸记录导出为可执行脚本

## 相关文件

- `src/components/CustomOverlay.tsx` - 自定义悬浮窗组件
- `src/utils/TouchRecorder.ts` - 触摸记录管理器
- `src/screens/HomeScreen.tsx` - 主屏幕（集成悬浮窗）
- `src/screens/SessionListScreen.tsx` - 会话列表屏幕

## 依赖项

```json
{
  "rn-android-overlay-permission": "^1.0.6",
  "react-native-magic-overlay": "^0.1.2",
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

## 注意事项

1. 悬浮窗功能仅在 Android 平台可用
2. 首次使用需要授予悬浮窗权限
3. 触摸记录保存在本地，卸载应用会丢失数据
4. 建议定期导出重要的会话数据
5. 录制时悬浮窗本身的触摸也会被记录，使用时注意区分

## 调试

查看控制台日志以了解触摸记录的详细信息：

```bash
# Android
npx react-native log-android

# 查看触摸记录
# 每次触摸都会输出类似：
# 记录触摸: tap at (540, 1200)
# 记录触摸: swipe_start at (300, 800)
```

