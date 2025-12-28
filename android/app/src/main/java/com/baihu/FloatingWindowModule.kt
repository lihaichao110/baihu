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
import androidx.annotation.RequiresApi

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
        TouchAccessibilityService.getInstance()?.hideOverlayInternal()
    }

    @ReactMethod
    fun updateRecordingState(isRecording: Boolean) {
        TouchAccessibilityService.getInstance()?.updateRecordingStateInternal(isRecording)
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
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                    TouchAccessibilityService.getInstance()?.showPlaybackIndicator(x, y)
                    TouchAccessibilityService.getInstance()?.dispatchTapGesture(x, y) { success ->
                        android.util.Log.d("FloatingWindowModule", "点击结果: $success")
                    
                        handler.postDelayed({
                            executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight, handler, executionId)
                        }, nextDelay.coerceAtLeast(100))
                    }
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
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            TouchAccessibilityService.getInstance()?.showPlaybackIndicator(centerX, centerY)
            TouchAccessibilityService.getInstance()?.dispatchTapGesture(centerX, centerY) { success ->
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
        } else {
            reactContext.currentActivity?.runOnUiThread {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", false)
                    putString("error", "Android版本不支持")
                })
            }
        }
    }
    
    // ==================== 屏幕文字匹配相关方法 ====================
    
    /**
     * 获取屏幕所有文字元素
     */
    @ReactMethod
    fun getScreenTexts(promise: Promise) {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        try {
            val texts = TouchAccessibilityService.getScreenTexts()
            val array = Arguments.createArray()
            
            for (text in texts) {
                val map = Arguments.createMap()
                map.putString("text", text.text)
                map.putDouble("x", text.x.toDouble())
                map.putDouble("y", text.y.toDouble())
                map.putDouble("width", text.width.toDouble())
                map.putDouble("height", text.height.toDouble())
                array.pushMap(map)
            }
            
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", true)
                putArray("texts", array)
                putInt("count", texts.size)
            })
        } catch (e: Exception) {
            android.util.Log.e("FloatingWindowModule", "获取屏幕文字失败: ${e.message}")
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", e.message)
            })
        }
    }
    
    /**
     * 查找屏幕上的文字
     */
    @ReactMethod
    fun findTextOnScreen(targetText: String, matchMode: String, promise: Promise) {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        try {
            val matched = TouchAccessibilityService.findText(targetText, matchMode)
            
            if (matched != null) {
                val centerX = matched.x + matched.width / 2
                val centerY = matched.y + matched.height / 2
                
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("text", matched.text)
                    putDouble("x", matched.x.toDouble())
                    putDouble("y", matched.y.toDouble())
                    putDouble("width", matched.width.toDouble())
                    putDouble("height", matched.height.toDouble())
                    putDouble("centerX", centerX.toDouble())
                    putDouble("centerY", centerY.toDouble())
                })
            } else {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", false)
                    putString("error", "未找到目标文字")
                })
            }
        } catch (e: Exception) {
            android.util.Log.e("FloatingWindowModule", "查找文字失败: ${e.message}")
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", e.message)
            })
        }
    }
    
    /**
     * 根据文字自动点击
     */
    @ReactMethod
    fun autoClickByText(targetText: String, matchMode: String, promise: Promise) {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        TouchAccessibilityService.autoClickByText(targetText, matchMode) { success, element ->
            reactContext.currentActivity?.runOnUiThread {
                if (success && element != null) {
                    val centerX = element.x + element.width / 2
                    val centerY = element.y + element.height / 2
                    
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("text", element.text)
                        putDouble("centerX", centerX.toDouble())
                        putDouble("centerY", centerY.toDouble())
                    })
                } else {
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", "未找到目标文字或点击失败")
                    })
                }
            }
        }
    }
    
    /**
     * 批量查找文字
     */
    @ReactMethod
    fun findMultipleTexts(targetTexts: ReadableArray, matchMode: String, promise: Promise) {
        if (!TouchAccessibilityService.isServiceEnabled()) {
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        try {
            val textList = mutableListOf<String>()
            for (i in 0 until targetTexts.size()) {
                val text = targetTexts.getString(i)
                if (text != null) {
                    textList.add(text)
                }
            }
            
            val results = TouchAccessibilityService.findMultipleTexts(textList, matchMode)
            val resultMap = Arguments.createMap()
            
            results.forEach { (key, value) ->
                if (value != null) {
                    val elementMap = Arguments.createMap()
                    elementMap.putString("text", value.text)
                    elementMap.putDouble("x", value.x.toDouble())
                    elementMap.putDouble("y", value.y.toDouble())
                    elementMap.putDouble("width", value.width.toDouble())
                    elementMap.putDouble("height", value.height.toDouble())
                    resultMap.putMap(key, elementMap)
                } else {
                    resultMap.putNull(key)
                }
            }
            
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", true)
                putMap("results", resultMap)
            })
        } catch (e: Exception) {
            android.util.Log.e("FloatingWindowModule", "批量查找文字失败: ${e.message}")
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", e.message)
            })
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
