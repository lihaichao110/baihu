package com.baihu

import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs

class FloatingWindowModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var overlayView: View? = null
    private var isShowing = false
    private var isOverlayShowing = false
    private var params: WindowManager.LayoutParams? = null
    private var overlayParams: WindowManager.LayoutParams? = null
    
    // 触摸相关变量
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    
    // 触摸记录相关
    private var touchStartX = 0f
    private var touchStartY = 0f
    private var touchStartTime = 0L
    private var isSwiping = false
    private var touchCount = 0
    private val SWIPE_THRESHOLD = 20f // 超过这个距离才算滑动

    override fun getName(): String {
        return "FloatingWindowModule"
    }

    @ReactMethod
    fun showFloatingWindow() {
        reactContext.currentActivity?.runOnUiThread {
            if (isShowing) {
                return@runOnUiThread
            }

            try {
                windowManager = reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager

                // 创建悬浮窗视图
                floatingView = LayoutInflater.from(reactContext)
                    .inflate(R.layout.floating_window, null)

                // 设置悬浮窗参数 - 宽度固定为 60dp
                val windowWidth = dpToPx(60f).toInt()
                params = WindowManager.LayoutParams(
                    windowWidth,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    },
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT
                )

                // 设置悬浮窗位置 - 屏幕左侧居中
                params?.apply {
                    gravity = Gravity.START or Gravity.CENTER_VERTICAL
                    x = 0  // 贴近左边缘
                    y = 0
                }

                // 添加悬浮窗到窗口管理器
                windowManager?.addView(floatingView, params)
                isShowing = true

                // 设置按钮点击事件
                setupButtons()
                
                // 添加触摸监听
                setupTouchListener()

            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun hideFloatingWindow() {
        reactContext.currentActivity?.runOnUiThread {
            // 先隐藏覆盖层
            hideOverlayInternal()
            
            if (isShowing && floatingView != null) {
                try {
                    windowManager?.removeView(floatingView)
                    isShowing = false
                    floatingView = null
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    @ReactMethod
    fun showOverlay() {
        reactContext.currentActivity?.runOnUiThread {
            if (isOverlayShowing) {
                return@runOnUiThread
            }

            try {
                if (windowManager == null) {
                    windowManager = reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                }

                // 创建覆盖层视图
                overlayView = LayoutInflater.from(reactContext)
                    .inflate(R.layout.overlay_touch_layer, null)

                // 获取屏幕尺寸
                val displayMetrics = DisplayMetrics()
                windowManager?.defaultDisplay?.getMetrics(displayMetrics)

                // 设置覆盖层参数 - 全屏，允许触摸穿透
                overlayParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    },
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    PixelFormat.TRANSLUCENT
                )

                overlayParams?.apply {
                    gravity = Gravity.TOP or Gravity.START
                    x = 0
                    y = 0
                }

                // 添加覆盖层到窗口管理器
                windowManager?.addView(overlayView, overlayParams)
                
                // 重新添加悬浮窗使其在蒙层之上
                bringFloatingWindowToFront()
                isOverlayShowing = true
                touchCount = 0
                updateTouchCountDisplay()

                // 设置触摸事件监听
                setupOverlayTouchListener()

                // 发送设备信息
                sendDeviceInfo(displayMetrics.widthPixels, displayMetrics.heightPixels)

            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun hideOverlay() {
        reactContext.currentActivity?.runOnUiThread {
            hideOverlayInternal()
        }
    }

    private fun hideOverlayInternal() {
        if (isOverlayShowing && overlayView != null) {
            try {
                windowManager?.removeView(overlayView)
                isOverlayShowing = false
                overlayView = null
                touchCount = 0
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    private fun bringFloatingWindowToFront() {
        if (isShowing && floatingView != null && params != null) {
            try {
                // 保存当前位置
                val currentX = params!!.x
                val currentY = params!!.y
                
                // 移除悬浮窗
                windowManager?.removeView(floatingView)
                
                // 重新添加悬浮窗（会在最上层）
                params!!.x = currentX
                params!!.y = currentY
                windowManager?.addView(floatingView, params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // 保存滑动终点坐标用于执行手势
    private var swipeEndX = 0f
    private var swipeEndY = 0f

    private fun setupOverlayTouchListener() {
        overlayView?.let { view ->
            val touchLayer = view.findViewById<FrameLayout>(R.id.overlayTouchLayer)
            val touchIndicator = view.findViewById<View>(R.id.touchIndicator)

            touchLayer.setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        touchStartX = event.rawX
                        touchStartY = event.rawY
                        touchStartTime = System.currentTimeMillis()
                        isSwiping = false
                        
                        // 显示触摸指示器
                        showTouchIndicator(touchIndicator, event.x, event.y)
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val deltaX = abs(event.rawX - touchStartX)
                        val deltaY = abs(event.rawY - touchStartY)
                        
                        // 更新触摸指示器位置
                        updateTouchIndicator(touchIndicator, event.x, event.y)
                        
                        // 保存当前位置作为滑动终点
                        swipeEndX = event.rawX
                        swipeEndY = event.rawY
                        
                        if (!isSwiping && (deltaX > SWIPE_THRESHOLD || deltaY > SWIPE_THRESHOLD)) {
                            // 开始滑动
                            isSwiping = true
                            sendTouchEvent("swipe_start", touchStartX, touchStartY, touchStartTime)
                            touchCount++
                            updateTouchCountDisplay()
                        }
                        
                        if (isSwiping) {
                            // 发送滑动移动事件
                            sendTouchEvent("swipe_move", event.rawX, event.rawY, System.currentTimeMillis())
                        }
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        // 隐藏触摸指示器
                        hideTouchIndicator(touchIndicator)
                        
                        if (isSwiping) {
                            // 滑动结束
                            sendTouchEvent("swipe_end", event.rawX, event.rawY, System.currentTimeMillis())
                            // 执行实际的滑动手势穿透到下层应用
                            performSwipeThrough(touchStartX, touchStartY, event.rawX, event.rawY)
                        } else {
                            // 点击事件
                            sendTouchEvent("tap", event.rawX, event.rawY, System.currentTimeMillis())
                            touchCount++
                            updateTouchCountDisplay()
                            // 执行实际的点击手势穿透到下层应用
                            performTapThrough(event.rawX, event.rawY)
                        }
                        isSwiping = false
                        true
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        hideTouchIndicator(touchIndicator)
                        isSwiping = false
                        true
                    }
                    else -> false
                }
            }
        }
    }
    
    /**
     * 执行点击穿透 - 使用 AccessibilityService 模拟点击
     */
    private fun performTapThrough(x: Float, y: Float) {
        if (TouchAccessibilityService.isServiceEnabled()) {
            TouchAccessibilityService.performTap(x, y) { success ->
                if (success) {
                    android.util.Log.d("FloatingWindow", "点击穿透成功: ($x, $y)")
                } else {
                    android.util.Log.w("FloatingWindow", "点击穿透失败: ($x, $y)")
                }
            }
        } else {
            android.util.Log.w("FloatingWindow", "无障碍服务未启用，无法执行触摸穿透")
        }
    }
    
    /**
     * 执行滑动穿透 - 使用 AccessibilityService 模拟滑动
     */
    private fun performSwipeThrough(startX: Float, startY: Float, endX: Float, endY: Float) {
        if (TouchAccessibilityService.isServiceEnabled()) {
            // 计算滑动时长（基于距离）
            val distance = kotlin.math.sqrt(
                (endX - startX) * (endX - startX) + (endY - startY) * (endY - startY)
            )
            val duration = (distance / 2).toLong().coerceIn(100, 500)
            
            TouchAccessibilityService.performSwipe(startX, startY, endX, endY, duration) { success ->
                if (success) {
                    android.util.Log.d("FloatingWindow", "滑动穿透成功")
                } else {
                    android.util.Log.w("FloatingWindow", "滑动穿透失败")
                }
            }
        } else {
            android.util.Log.w("FloatingWindow", "无障碍服务未启用，无法执行滑动穿透")
        }
    }

    private fun showTouchIndicator(indicator: View?, x: Float, y: Float) {
        indicator?.let {
            it.visibility = View.VISIBLE
            it.x = x - it.width / 2
            it.y = y - it.height / 2
            it.alpha = 1f
            it.scaleX = 0.5f
            it.scaleY = 0.5f
            it.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(100)
                .start()
        }
    }

    private fun updateTouchIndicator(indicator: View?, x: Float, y: Float) {
        indicator?.let {
            it.x = x - it.width / 2
            it.y = y - it.height / 2
        }
    }

    private fun hideTouchIndicator(indicator: View?) {
        indicator?.let {
            it.animate()
                .alpha(0f)
                .scaleX(0.5f)
                .scaleY(0.5f)
                .setDuration(150)
                .withEndAction {
                    it.visibility = View.GONE
                    it.alpha = 1f
                    it.scaleX = 1f
                    it.scaleY = 1f
                }
                .start()
        }
    }

    private fun updateTouchCountDisplay() {
        overlayView?.let { view ->
            val touchCountText = view.findViewById<TextView>(R.id.touchCountText)
            touchCountText?.text = "已记录: $touchCount 个操作"
        }
    }

    private fun sendTouchEvent(type: String, x: Float, y: Float, timestamp: Long) {
        val params: WritableMap = Arguments.createMap()
        params.putString("type", type)
        params.putDouble("x", x.toDouble())
        params.putDouble("y", y.toDouble())
        params.putDouble("timestamp", timestamp.toDouble())
        sendEvent("onTouchRecorded", params)
    }

    private fun sendDeviceInfo(width: Int, height: Int) {
        val params: WritableMap = Arguments.createMap()
        params.putInt("width", width)
        params.putInt("height", height)
        sendEvent("onDeviceInfo", params)
    }

    @ReactMethod
    fun updateTime(timeText: String) {
        reactContext.currentActivity?.runOnUiThread {
            floatingView?.let { view ->
                val timeTextView = view.findViewById<TextView>(R.id.timeText)
                timeTextView?.text = timeText
            }
        }
    }

    @ReactMethod
    fun updateRecordingState(isRecording: Boolean) {
        reactContext.currentActivity?.runOnUiThread {
            floatingView?.let { view ->
                val startButton = view.findViewById<Button>(R.id.startButton)
                val stopButton = view.findViewById<Button>(R.id.stopButton)

                if (isRecording) {
                    startButton?.visibility = View.GONE
                    stopButton?.visibility = View.VISIBLE
                } else {
                    startButton?.visibility = View.VISIBLE
                    stopButton?.visibility = View.GONE
                }
            }
        }
    }

    private fun setupTouchListener() {
        floatingView?.let { view ->
            val container = view.findViewById<View>(R.id.floatingContainer)
            
            container.setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params?.x ?: 0
                        initialY = params?.y ?: 0
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params?.let { p ->
                            p.x = initialX + (event.rawX - initialTouchX).toInt()
                            p.y = initialY + (event.rawY - initialTouchY).toInt()
                            windowManager?.updateViewLayout(view, p)
                        }
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        // 松手后自动吸附到左边
                        snapToLeft()
                        true
                    }
                    else -> false
                }
            }
        }
    }

    private fun snapToLeft() {
        params?.let { p ->
            floatingView?.let { view ->
                val currentX = p.x
                
                // 如果不在左边，则动画移动到左边
                if (abs(currentX) > dpToPx(10f)) {
                    val animator = ValueAnimator.ofInt(currentX, 0)
                    animator.duration = 200
                    animator.addUpdateListener { animation ->
                        p.x = animation.animatedValue as Int
                        windowManager?.updateViewLayout(view, p)
                    }
                    animator.start()
                } else {
                    // 直接设置到左边
                    p.x = 0
                    windowManager?.updateViewLayout(view, p)
                }
            }
        }
    }

    private fun setupButtons() {
        floatingView?.let { view ->
            val startButton = view.findViewById<Button>(R.id.startButton)
            val stopButton = view.findViewById<Button>(R.id.stopButton)
            val closeButton = view.findViewById<Button>(R.id.closeButton)

            startButton?.setOnClickListener {
                sendEvent("onStartRecording", null)
            }

            stopButton?.setOnClickListener {
                sendEvent("onStopRecording", null)
            }

            closeButton?.setOnClickListener {
                // 直接关闭悬浮窗
                hideFloatingWindowInternal()
                sendEvent("onClose", null)
            }
        }
    }

    private fun hideFloatingWindowInternal() {
        // 先隐藏覆盖层
        hideOverlayInternal()
        
        if (isShowing && floatingView != null) {
            try {
                windowManager?.removeView(floatingView)
                isShowing = false
                floatingView = null
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun dpToPx(dp: Float): Float {
        return dp * reactContext.resources.displayMetrics.density
    }

    private fun sendEvent(eventName: String, params: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }
    
    /**
     * 检查无障碍服务是否已启用
     */
    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        promise.resolve(TouchAccessibilityService.isServiceEnabled())
    }
    
    /**
     * 打开无障碍服务设置页面
     */
    @ReactMethod
    fun openAccessibilitySettings() {
        reactContext.currentActivity?.let { activity ->
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
        }
    }
}
