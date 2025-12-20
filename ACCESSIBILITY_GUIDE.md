# 无障碍服务集成说明

## 功能概述

本项目已集成 `react-native-accessibility-services-detector` 包，用于检测和管理 Android 平台上的无障碍服务。

## 主要功能

### 1. 自动检测无障碍服务状态
- 在点击任何需要无障碍权限的功能卡片时，自动检测是否已开启无障碍服务
- 如果未开启，会弹出提示对话框，引导用户前往设置

### 2. 实时监控无障碍服务状态
- 应用会实时监控无障碍服务的开启/关闭状态
- 当状态变化时，会自动更新UI并给出相应提示

### 3. 快捷跳转设置
- 提供快捷按钮直接跳转到系统无障碍服务设置页面
- 自动弹出操作提示，指导用户如何开启服务

## 使用流程

### 用户操作流程

1. **点击功能卡片**（如"自动任务"、"自动连点器"等）
2. **检查无障碍服务**
   - 如果已开启：直接进入功能
   - 如果未开启：显示提示对话框
3. **前往设置**
   - 点击"去设置"按钮
   - 系统自动跳转到无障碍服务设置页面
4. **开启服务**
   - 在设置中找到"白虎"应用
   - 开启无障碍服务开关
5. **返回应用**
   - 应用会自动检测到服务已开启
   - 显示成功提示
   - 功能卡片自动启用

### 受无障碍服务保护的功能

以下功能需要先开启无障碍服务才能使用：

- ✅ 自动任务
- ✅ 自动连点器
- ✅ 自动滚动
- ✅ 自动刷新

## 技术实现

### AccessibilityServiceModule

核心模块位于 `src/modules/AccessibilityServiceModule.ts`

#### 主要方法

```typescript
// 检查无障碍服务是否已启用
await AccessibilityServiceModule.checkAccessibilityService(): Promise<boolean>

// 打开无障碍服务设置页面
AccessibilityServiceModule.openAccessibilitySettings(): void

// 添加状态变化监听器
const removeListener = await AccessibilityServiceModule.addAccessibilityServiceListener(
  (isEnabled: boolean) => {
    console.log('无障碍服务状态:', isEnabled);
  }
);

// 获取已启用的无障碍服务列表
await AccessibilityServiceModule.getEnabledServices()

// 获取已安装的远程访问应用
await AccessibilityServiceModule.getInstalledRemoteAccessApps()

// 移除监听器
removeListener();
```

### 在组件中使用

```typescript
import AccessibilityServiceModule from '../modules/AccessibilityServiceModule';

const handleFeaturePress = async () => {
  // 检查无障碍服务
  const isEnabled = await AccessibilityServiceModule.checkAccessibilityService();
  
  if (!isEnabled) {
    Alert.alert(
      '需要开启无障碍服务',
      '此功能需要无障碍服务权限才能正常工作。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '去设置',
          onPress: () => AccessibilityServiceModule.openAccessibilitySettings(),
        },
      ],
    );
    return;
  }
  
  // 继续执行功能逻辑
  // ...
};
```

## Android 配置

### 权限配置

确保 `android/app/src/main/AndroidManifest.xml` 中已添加必要的权限：

```xml
<uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE" />
```

### 无障碍服务声明

在 `android/app/src/main/res/xml/` 目录下创建 `accessibility_service.xml`：

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canPerformGestures="true"
    android:canRequestTouchExplorationMode="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100"
    android:packageNames="com.baihu"
    android:settingsActivity="com.baihu.MainActivity" />
```

## 注意事项

1. **平台限制**：此功能仅在 Android 平台可用，iOS 平台会自动跳过检查
2. **用户体验**：首次使用时需要用户手动开启无障碍服务
3. **权限敏感**：无障碍服务是敏感权限，需要向用户清晰说明用途
4. **实时监控**：应用会持续监控无障碍服务状态，确保功能正常运行

## 测试

### 手动测试步骤

1. 确保无障碍服务处于关闭状态
2. 打开应用，点击"自动任务"卡片
3. 应该看到提示对话框
4. 点击"去设置"
5. 在设置中开启"白虎"的无障碍服务
6. 返回应用
7. 应该看到"无障碍服务已启用"的提示
8. 功能卡片应该变为可用状态

### 自动化测试

```typescript
// 测试无障碍服务检测
test('检查无障碍服务状态', async () => {
  const isEnabled = await AccessibilityServiceModule.checkAccessibilityService();
  expect(typeof isEnabled).toBe('boolean');
});

// 测试监听器
test('无障碍服务状态变化监听', async () => {
  const callback = jest.fn();
  const removeListener = await AccessibilityServiceModule.addAccessibilityServiceListener(callback);
  
  // 模拟状态变化
  // ...
  
  expect(callback).toHaveBeenCalled();
  removeListener();
});
```

## 未来优化方向

1. **优化提示文案**：根据用户反馈调整提示内容
2. **添加视频教程**：提供可视化的开启指南
3. **优化跳转逻辑**：尝试直接跳转到应用的无障碍服务设置页面
4. **离线检测**：优化检测逻辑，减少系统调用次数
5. **错误处理**：完善异常情况的处理和提示

## 相关资源

- [react-native-accessibility-services-detector](https://github.com/example/react-native-accessibility-services-detector)
- [Android 无障碍服务开发指南](https://developer.android.com/guide/topics/ui/accessibility/service)

