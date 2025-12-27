package com.baihu

import android.content.Intent
import android.provider.Settings
import android.util.DisplayMetrics
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native 模块 - 悬浮窗控制
 * 实际的 UI 创建由 TouchAccessibilityService 处理
 * 使用 TYPE_ACCESSIBILITY_OVERLAY，不需要悬浮窗权限！
 */
class FloatingWindowModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    
    // 用于跟踪和取消回放任务的 Handler
    private var playbackHandler: android.os.Handler? = null
    // 标记当前是否正在执行
    private var isExecuting = false
    // 当前执行的唯一 ID，用于区分不同的执行
    private var currentExecutionId = 0L

    override fun getName(): String {
        return "FloatingWindowModule"
    }
    
    override fun initialize() {
        super.initialize()
        // 将 React Context 传递给无障碍服务
        TouchAccessibilityService.setReactContext(reactContext)
    }
    
    override fun invalidate() {
        super.invalidate()
        TouchAccessibilityService.setReactContext(null)
    }

    @ReactMethod
    fun showFloatingWindow() {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            android.util.Log.w("FloatingWindowModule", "无障碍服务未启用，请先开启服务")
            sendEvent("onAccessibilityWarning", Arguments.createMap().apply {
                putString("message", "无障碍服务未启用，请先在设置中开启")
            })
            return
        }
        
        TouchAccessibilityService.showFloatingWindow()
    }

    @ReactMethod
    fun hideFloatingWindow() {
        TouchAccessibilityService.hideFloatingWindow()
    }

    @ReactMethod
    fun showOverlay() {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            android.util.Log.w("FloatingWindowModule", "无障碍服务未启用")
            sendEvent("onAccessibilityWarning", Arguments.createMap().apply {
                putString("message", "无障碍服务未启用，无法录制")
            })
            return
        }
        
        TouchAccessibilityService.showOverlay()
    }

    @ReactMethod
    fun hideOverlay() {
        TouchAccessibilityService.hideOverlay()
    }

    @ReactMethod
    fun updateRecordingState(isRecording: Boolean) {
        TouchAccessibilityService.updateRecordingState(isRecording)
    }
    
    @ReactMethod
    fun setPlayButtonVisible(visible: Boolean) {
        TouchAccessibilityService.setPlayButtonVisible(visible)
    }
    
    @ReactMethod
    fun setSaveButtonVisible(visible: Boolean) {
        TouchAccessibilityService.setSaveButtonVisible(visible)
    }
    
    @ReactMethod
    fun updatePlayingState(playing: Boolean) {
        TouchAccessibilityService.updatePlayingState(playing)
    }
    
    /**
     * 执行录制的操作序列
     */
    @ReactMethod
    fun executeActions(actions: ReadableArray, screenWidth: Int, screenHeight: Int) {
        if (actions.size() == 0) {
            android.util.Log.w("FloatingWindowModule", "没有可执行的操作")
            return
        }
        
        if (!TouchAccessibilityService.isServiceEnabled()) {
            android.util.Log.w("FloatingWindowModule", "无障碍服务未启用")
            sendEvent("onPlaybackError", Arguments.createMap().apply {
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        // 关键：无论之前是否在执行，都先清除可能存在的任务和状态
        // 确保同一时间只有一个脚本在执行
        android.util.Log.d("FloatingWindowModule", "开始新执行前清除旧状态，isExecuting=$isExecuting")
        playbackHandler?.removeCallbacksAndMessages(null)
        playbackHandler = null
        // 重置 Service 层的状态（不发送事件，避免 JS 端状态混乱）
        TouchAccessibilityService.resetPlaybackState()
        
        // 获取当前屏幕尺寸
        val windowManager = reactContext.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager
        val displayMetrics = DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        val currentWidth = displayMetrics.widthPixels
        val currentHeight = displayMetrics.heightPixels
        
        android.util.Log.d("FloatingWindowModule", "开始执行 ${actions.size()} 个操作")
        
        sendEvent("onPlaybackStart", Arguments.createMap().apply {
            putInt("totalActions", actions.size())
        })
        
        TouchAccessibilityService.updatePlayingState(true)
        isExecuting = true
        
        // 生成新的执行 ID，确保旧的执行不会继续
        currentExecutionId = System.currentTimeMillis()
        val executionId = currentExecutionId
        
        // 创建并保存 Handler，以便后续可以取消
        playbackHandler = android.os.Handler(android.os.Looper.getMainLooper())
        executeNextAction(actions, 0, screenWidth, screenHeight, currentWidth, currentHeight, playbackHandler!!, executionId)
    }
    
    private fun executeNextAction(
        actions: ReadableArray,
        index: Int,
        recordWidth: Int,
        recordHeight: Int,
        currentWidth: Int,
        currentHeight: Int,
        handler: android.os.Handler,
        executionId: Long
    ) {
        // 检查是否已经停止执行，或者执行 ID 已经过期（有新的执行开始了）
        if (!isExecuting || executionId != currentExecutionId) {
            android.util.Log.d("FloatingWindowModule", "执行已停止或已被新执行取代，跳过后续操作 (executionId=$executionId, current=$currentExecutionId)")
            return
        }
        
        if (index >= actions.size()) {
            // 执行完成
            isExecuting = false
            playbackHandler = null
            TouchAccessibilityService.updatePlayingState(false)
            sendEvent("onPlaybackComplete", Arguments.createMap().apply {
                putInt("executedCount", index)
            })
            return
        }
        
        val action = actions.getMap(index)
        val type = action?.getString("type") ?: return
        val normalizedX = action.getDouble("normalizedX")
        val normalizedY = action.getDouble("normalizedY")
        
        val x = (normalizedX * currentWidth).toFloat()
        val y = (normalizedY * currentHeight).toFloat()
        
        val currentTimestamp = action.getDouble("timestamp").toLong()
        val nextDelay = if (index + 1 < actions.size()) {
            val nextAction = actions.getMap(index + 1)
            val nextTimestamp = nextAction?.getDouble("timestamp")?.toLong() ?: currentTimestamp
            (nextTimestamp - currentTimestamp).coerceAtLeast(100)
        } else {
            0L
        }
        
        android.util.Log.d("FloatingWindowModule", "执行操作 ${index + 1}/${actions.size()}: $type at ($x, $y)")
        
        sendEvent("onPlaybackProgress", Arguments.createMap().apply {
            putInt("current", index + 1)
            putInt("total", actions.size())
            putString("type", type)
        })
        
        when (type) {
            "tap" -> {
                TouchAccessibilityService.performTap(x, y) { success ->
                    android.util.Log.d("FloatingWindowModule", "点击结果: $success")
                    
                    handler.postDelayed({
                        executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight, handler, executionId)
                    }, nextDelay.coerceAtLeast(100))
                }
            }
            "swipe_start" -> {
                // 查找 swipe_end
                var endIndex = index + 1
                var endX = x
                var endY = y
                while (endIndex < actions.size()) {
                    val nextAction = actions.getMap(endIndex)
                    if (nextAction?.getString("type") == "swipe_end") {
                        endX = (nextAction.getDouble("normalizedX") * currentWidth).toFloat()
                        endY = (nextAction.getDouble("normalizedY") * currentHeight).toFloat()
                        break
                    }
                    endIndex++
                }
                
                val swipeDuration = if (endIndex < actions.size()) {
                    val endAction = actions.getMap(endIndex)
                    val endTimestamp = endAction?.getDouble("timestamp")?.toLong() ?: currentTimestamp
                    (endTimestamp - currentTimestamp).coerceIn(100, 1000)
                } else {
                    300L
                }
                
                TouchAccessibilityService.performSwipe(x, y, endX, endY, swipeDuration) { success ->
                    android.util.Log.d("FloatingWindowModule", "滑动结果: $success")
                    
                    val skipToIndex = endIndex + 1
                    val delayAfterSwipe = if (skipToIndex < actions.size()) {
                        val swipeEndAction = actions.getMap(endIndex)
                        val swipeEndTime = swipeEndAction?.getDouble("timestamp")?.toLong() ?: currentTimestamp
                        val nextAction = actions.getMap(skipToIndex)
                        val nextTime = nextAction?.getDouble("timestamp")?.toLong() ?: swipeEndTime
                        (nextTime - swipeEndTime).coerceAtLeast(100)
                    } else {
                        100L
                    }
                    
                    handler.postDelayed({
                        executeNextAction(actions, skipToIndex, recordWidth, recordHeight, currentWidth, currentHeight, handler, executionId)
                    }, delayAfterSwipe)
                }
            }
            "swipe_move", "swipe_end" -> {
                // 跳过，在 swipe_start 时处理
                handler.postDelayed({
                    executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight, handler, executionId)
                }, 10)
            }
            else -> {
                handler.postDelayed({
                    executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight, handler, executionId)
                }, nextDelay.coerceAtLeast(100))
            }
        }
    }
    
    @ReactMethod
    fun stopPlayback() {
        android.util.Log.d("FloatingWindowModule", "停止回放，isExecuting=$isExecuting")
        // 无论 isExecuting 是什么状态，都清除可能存在的 Handler 任务
        playbackHandler?.removeCallbacksAndMessages(null)
        playbackHandler = null
        isExecuting = false
        // 再通知 Service 层停止
        TouchAccessibilityService.stopPlayback()
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        promise.resolve(TouchAccessibilityService.isServiceEnabled())
    }
    
    @ReactMethod
    fun openAccessibilitySettings() {
        reactContext.currentActivity?.let { activity ->
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
        }
    }
    
    @ReactMethod
    fun testAccessibilityGesture(promise: Promise) {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        // 获取屏幕中心坐标
        val windowManager = reactContext.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager
        val displayMetrics = DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        val centerX = displayMetrics.widthPixels / 2f
        val centerY = displayMetrics.heightPixels / 2f
        
        android.util.Log.d("FloatingWindowModule", "测试点击: ($centerX, $centerY)")
        
        TouchAccessibilityService.performTap(centerX, centerY) { success ->
            android.util.Log.d("FloatingWindowModule", "测试结果: $success")
            reactContext.currentActivity?.runOnUiThread {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", success)
                    if (!success) {
                        putString("error", "手势执行失败")
                    }
                })
            }
        }
    }
    
    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            android.util.Log.e("FloatingWindowModule", "发送事件失败: $eventName")
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }
}
