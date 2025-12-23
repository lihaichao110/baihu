package com.baihu

import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
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
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
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
    
    // 速度计算相关
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var lastTouchTime = 0L
    
    // 屏幕方向
    private var screenOrientation = "portrait"
    
    // 回放相关
    private var isPlaying = false
    private var playbackHandler: Handler? = null
    private var currentPlaybackIndex = 0
    
    // 回放视觉效果 overlay
    private var playbackOverlayView: View? = null
    private var playbackOverlayParams: WindowManager.LayoutParams? = null
    private var isPlaybackOverlayShowing = false
    private var playbackTouchCount = 0
    private var playbackHideAnimator: android.animation.ValueAnimator? = null

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
            try {
                if (windowManager == null) {
                    windowManager = reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                }

                // 获取屏幕尺寸
                val displayMetrics = DisplayMetrics()
                windowManager?.defaultDisplay?.getMetrics(displayMetrics)
                
                // 如果 overlay 已经显示，只需重置状态并发送设备信息
                if (isOverlayShowing) {
                    android.util.Log.d("FloatingWindow", "Overlay 已显示，重置录制状态")
                    // 重置触摸相关状态
                    touchCount = 0
                    isSwiping = false
                    lastTouchTime = 0L
                    // 发送设备信息以启动新录制
                    sendDeviceInfo(displayMetrics.widthPixels, displayMetrics.heightPixels)
                    return@runOnUiThread
                }

                // 创建覆盖层视图
                overlayView = LayoutInflater.from(reactContext)
                    .inflate(R.layout.overlay_touch_layer, null)

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
                val currentTime = System.currentTimeMillis()
                val pressure = event.pressure.coerceIn(0f, 1f)
                val pointerType = getPointerType(event)
                
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        touchStartX = event.rawX
                        touchStartY = event.rawY
                        touchStartTime = currentTime
                        isSwiping = false
                        
                        // 重置速度计算
                        lastTouchX = event.rawX
                        lastTouchY = event.rawY
                        lastTouchTime = currentTime
                        
                        // 先增加点击计数，再显示指示器
                        touchCount++
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
                        
                        // 计算速度
                        val (velocityX, velocityY) = calculateVelocity(event.rawX, event.rawY, currentTime)
                        
                        if (!isSwiping && (deltaX > SWIPE_THRESHOLD || deltaY > SWIPE_THRESHOLD)) {
                            // 开始滑动
                            isSwiping = true
                            sendTouchEvent(
                                "swipe_start", 
                                touchStartX, 
                                touchStartY, 
                                touchStartTime,
                                pressure,
                                pointerType,
                                0f, 
                                0f
                            )
                        }
                        
                        if (isSwiping) {
                            // 发送滑动移动事件
                            sendTouchEvent(
                                "swipe_move", 
                                event.rawX, 
                                event.rawY, 
                                currentTime,
                                pressure,
                                pointerType,
                                velocityX, 
                                velocityY
                            )
                        }
                        
                        // 更新上次触摸信息
                        lastTouchX = event.rawX
                        lastTouchY = event.rawY
                        lastTouchTime = currentTime
                        
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        // 隐藏触摸指示器
                        hideTouchIndicator(touchIndicator)
                        
                        val endX = event.rawX
                        val endY = event.rawY
                        val wasSwipe = isSwiping
                        val savedStartX = touchStartX
                        val savedStartY = touchStartY
                        
                        // 计算最终速度
                        val (velocityX, velocityY) = calculateVelocity(endX, endY, currentTime)
                        
                        if (wasSwipe) {
                            // 滑动结束
                            sendTouchEvent(
                                "swipe_end", 
                                endX, 
                                endY, 
                                currentTime,
                                pressure,
                                pointerType,
                                velocityX, 
                                velocityY
                            )
                        } else {
                            // 点击事件
                            sendTouchEvent(
                                "tap", 
                                endX, 
                                endY, 
                                currentTime,
                                pressure,
                                pointerType,
                                0f, 
                                0f
                            )
                        }
                        
                        // 重置速度计算
                        lastTouchTime = 0L
                        
                        // 暂时让蒙层不可触摸，然后执行手势穿透
                        setOverlayTouchable(false)
                        
                        // 使用 Handler 延迟执行手势，确保用户手指已离开
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            if (wasSwipe) {
                                performSwipeThrough(savedStartX, savedStartY, endX, endY)
                            } else {
                                performTapThrough(endX, endY)
                            }
                            
                            // 恢复蒙层可触摸
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                setOverlayTouchable(true)
                            }, 150)
                        }, 50)
                        
                        isSwiping = false
                        true
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        hideTouchIndicator(touchIndicator)
                        isSwiping = false
                        lastTouchTime = 0L
                        true
                    }
                    else -> false
                }
            }
        }
    }
    
    /**
     * 设置蒙层是否可以接收触摸事件
     */
    private fun setOverlayTouchable(touchable: Boolean) {
        if (isOverlayShowing && overlayView != null && overlayParams != null) {
            try {
                if (touchable) {
                    overlayParams!!.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN
                } else {
                    overlayParams!!.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN
                }
                windowManager?.updateViewLayout(overlayView, overlayParams)
            } catch (e: Exception) {
                e.printStackTrace()
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

    // 用于存储当前的隐藏动画，以便取消
    private var hideAnimator: android.animation.ValueAnimator? = null
    
    private fun showTouchIndicator(indicator: View?, x: Float, y: Float) {
        indicator?.let {
            // 取消之前的隐藏动画
            hideAnimator?.cancel()
            hideAnimator = null
            
            // 更新点击次数显示
            val countLabel = it.findViewById<TextView>(R.id.touchCountLabel)
            countLabel?.text = touchCount.toString()
            
            it.visibility = View.VISIBLE
            it.x = x - 28 * reactContext.resources.displayMetrics.density // 28dp = 56dp / 2
            it.y = y - 28 * reactContext.resources.displayMetrics.density
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
            val density = reactContext.resources.displayMetrics.density
            it.x = x - 28 * density
            it.y = y - 28 * density
        }
    }

    private fun hideTouchIndicator(indicator: View?) {
        indicator?.let {
            // 取消之前的动画
            hideAnimator?.cancel()
            
            // 创建3秒渐变消失动画
            hideAnimator = android.animation.ValueAnimator.ofFloat(1f, 0f).apply {
                duration = 3000 // 3秒
                addUpdateListener { animator ->
                    val value = animator.animatedValue as Float
                    it.alpha = value
                    // 同时缩小一点
                    val scale = 0.7f + 0.3f * value
                    it.scaleX = scale
                    it.scaleY = scale
                }
                addListener(object : android.animation.AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: android.animation.Animator) {
                        it.visibility = View.GONE
                        it.alpha = 1f
                        it.scaleX = 1f
                        it.scaleY = 1f
                        hideAnimator = null
                    }
                    override fun onAnimationCancel(animation: android.animation.Animator) {
                        // 动画被取消时恢复状态
                        it.alpha = 1f
                        it.scaleX = 1f
                        it.scaleY = 1f
                    }
                })
                start()
            }
        }
    }

    /**
     * 显示回放视觉效果 overlay（不捕获触摸）
     */
    private fun showPlaybackOverlay() {
        reactContext.currentActivity?.runOnUiThread {
            if (isPlaybackOverlayShowing && playbackOverlayView != null) {
                // 已经显示，重置指示器状态以便复用
                playbackOverlayView?.let { view ->
                    val indicator = view.findViewById<View>(R.id.touchIndicator)
                    indicator?.visibility = View.GONE
                    indicator?.alpha = 1f
                }
                android.util.Log.d("FloatingWindow", "复用现有回放 overlay")
                return@runOnUiThread
            }
            
            try {
                if (windowManager == null) {
                    windowManager = reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                }
                
                // 创建回放 overlay 视图
                playbackOverlayView = LayoutInflater.from(reactContext)
                    .inflate(R.layout.overlay_touch_layer, null)
                
                // 设置为透明背景（回放时不需要蒙层）
                playbackOverlayView?.findViewById<FrameLayout>(R.id.overlayTouchLayer)?.setBackgroundColor(Color.TRANSPARENT)
                
                // 设置参数 - 不捕获触摸事件
                playbackOverlayParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    },
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or  // 不捕获触摸
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    PixelFormat.TRANSLUCENT
                )
                
                playbackOverlayParams?.apply {
                    gravity = Gravity.TOP or Gravity.START
                    x = 0
                    y = 0
                }
                
                windowManager?.addView(playbackOverlayView, playbackOverlayParams)
                isPlaybackOverlayShowing = true
                // 计数已在 executeActions 中同步重置，这里不再重置
                
                android.util.Log.d("FloatingWindow", "回放视觉 overlay 已显示")
                
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    /**
     * 隐藏回放视觉效果 overlay
     */
    private fun hidePlaybackOverlay() {
        reactContext.currentActivity?.runOnUiThread {
            playbackHideAnimator?.cancel()
            playbackHideAnimator = null
            
            if (isPlaybackOverlayShowing && playbackOverlayView != null) {
                try {
                    windowManager?.removeView(playbackOverlayView)
                    isPlaybackOverlayShowing = false
                    playbackOverlayView = null
                    playbackTouchCount = 0
                    android.util.Log.d("FloatingWindow", "回放视觉 overlay 已隐藏")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    /**
     * 在回放时显示触摸指示器
     */
    private fun showPlaybackTouchIndicator(x: Float, y: Float) {
        // 增加操作计数（在调用时立即增加，确保正确的序号）
        val currentCount = ++playbackTouchCount
        
        reactContext.currentActivity?.runOnUiThread {
            playbackOverlayView?.let { view ->
                val indicator = view.findViewById<View>(R.id.touchIndicator)
                val countLabel = view.findViewById<TextView>(R.id.touchCountLabel)
                
                // 取消之前的隐藏动画
                playbackHideAnimator?.cancel()
                playbackHideAnimator = null
                
                // 更新操作序号显示（使用捕获的计数值）
                countLabel?.text = currentCount.toString()
                
                val density = reactContext.resources.displayMetrics.density
                indicator?.visibility = View.VISIBLE
                indicator?.x = x - 28 * density
                indicator?.y = y - 28 * density
                indicator?.alpha = 1f
                indicator?.scaleX = 0.5f
                indicator?.scaleY = 0.5f
                indicator?.animate()
                    ?.scaleX(1f)
                    ?.scaleY(1f)
                    ?.setDuration(100)
                    ?.start()
            }
        }
    }
    
    /**
     * 隐藏回放触摸指示器（3秒渐变消失）
     */
    private fun hidePlaybackTouchIndicator() {
        reactContext.currentActivity?.runOnUiThread {
            playbackOverlayView?.let { view ->
                val indicator = view.findViewById<View>(R.id.touchIndicator)
                
                indicator?.let {
                    // 取消之前的动画
                    playbackHideAnimator?.cancel()
                    
                    // 创建3秒渐变消失动画
                    playbackHideAnimator = android.animation.ValueAnimator.ofFloat(1f, 0f).apply {
                        duration = 3000
                        addUpdateListener { animator ->
                            val value = animator.animatedValue as Float
                            it.alpha = value
                            val scale = 0.7f + 0.3f * value
                            it.scaleX = scale
                            it.scaleY = scale
                        }
                        addListener(object : android.animation.AnimatorListenerAdapter() {
                            override fun onAnimationEnd(animation: android.animation.Animator) {
                                it.visibility = View.GONE
                                it.alpha = 1f
                                it.scaleX = 1f
                                it.scaleY = 1f
                                playbackHideAnimator = null
                            }
                            override fun onAnimationCancel(animation: android.animation.Animator) {
                                it.alpha = 1f
                                it.scaleX = 1f
                                it.scaleY = 1f
                            }
                        })
                        start()
                    }
                }
            }
        }
    }

    private fun sendTouchEvent(
        type: String, 
        x: Float, 
        y: Float, 
        timestamp: Long,
        pressure: Float = 0f,
        pointerType: String = "touch",
        velocityX: Float = 0f,
        velocityY: Float = 0f
    ) {
        val params: WritableMap = Arguments.createMap()
        params.putString("type", type)
        params.putDouble("x", x.toDouble())
        params.putDouble("y", y.toDouble())
        params.putDouble("timestamp", timestamp.toDouble())
        params.putDouble("pressure", pressure.toDouble())
        params.putString("pointerType", pointerType)
        params.putDouble("velocityX", velocityX.toDouble())
        params.putDouble("velocityY", velocityY.toDouble())
        sendEvent("onTouchRecorded", params)
    }
    
    /**
     * 计算速度（像素/秒）
     */
    private fun calculateVelocity(
        currentX: Float, 
        currentY: Float, 
        currentTime: Long
    ): Pair<Float, Float> {
        if (lastTouchTime == 0L) {
            return Pair(0f, 0f)
        }
        
        val timeDelta = currentTime - lastTouchTime
        if (timeDelta <= 0) {
            return Pair(0f, 0f)
        }
        
        val velocityX = ((currentX - lastTouchX) / timeDelta) * 1000
        val velocityY = ((currentY - lastTouchY) / timeDelta) * 1000
        
        return Pair(velocityX, velocityY)
    }
    
    /**
     * 获取指针类型
     */
    private fun getPointerType(event: MotionEvent): String {
        return when (event.getToolType(0)) {
            MotionEvent.TOOL_TYPE_FINGER -> "touch"
            MotionEvent.TOOL_TYPE_STYLUS -> "stylus"
            MotionEvent.TOOL_TYPE_MOUSE -> "mouse"
            else -> "touch"
        }
    }

    private fun sendDeviceInfo(width: Int, height: Int) {
        // 判断屏幕方向
        screenOrientation = if (width > height) "landscape" else "portrait"
        
        val params: WritableMap = Arguments.createMap()
        params.putInt("width", width)
        params.putInt("height", height)
        params.putString("orientation", screenOrientation)
        sendEvent("onDeviceInfo", params)
    }

    @ReactMethod
    fun updateRecordingState(isRecording: Boolean) {
        reactContext.currentActivity?.runOnUiThread {
            floatingView?.let { view ->
                val startButton = view.findViewById<Button>(R.id.startButton)
                val stopButton = view.findViewById<Button>(R.id.stopButton)
                val playButton = view.findViewById<Button>(R.id.playButton)
                val dragHandle = view.findViewById<TextView>(R.id.dragHandle)

                if (isRecording) {
                    startButton?.visibility = View.GONE
                    stopButton?.visibility = View.VISIBLE
                    playButton?.visibility = View.GONE  // 录制时隐藏执行按钮
                    // 更新拖拽把手颜色为红色（录制中）
                    dragHandle?.setTextColor(0xFFFF4444.toInt())
                } else {
                    startButton?.visibility = View.VISIBLE
                    stopButton?.visibility = View.GONE
                    // 执行按钮的显示由 setPlayButtonVisible 控制
                    // 更新拖拽把手颜色为灰色（待机）
                    dragHandle?.setTextColor(0xFF888888.toInt())
                }
            }
        }
    }
    
    /**
     * 设置执行按钮是否可见
     */
    @ReactMethod
    fun setPlayButtonVisible(visible: Boolean) {
        reactContext.currentActivity?.runOnUiThread {
            floatingView?.let { view ->
                val playButton = view.findViewById<Button>(R.id.playButton)
                playButton?.visibility = if (visible) View.VISIBLE else View.GONE
            }
        }
    }
    
    /**
     * 设置保存按钮是否可见
     */
    @ReactMethod
    fun setSaveButtonVisible(visible: Boolean) {
        reactContext.currentActivity?.runOnUiThread {
            floatingView?.let { view ->
                val saveButton = view.findViewById<Button>(R.id.saveButton)
                saveButton?.visibility = if (visible) View.VISIBLE else View.GONE
            }
        }
    }
    
    /**
     * 更新执行状态（执行中/已停止）
     */
    @ReactMethod
    fun updatePlayingState(playing: Boolean) {
        isPlaying = playing
        reactContext.currentActivity?.runOnUiThread {
            floatingView?.let { view ->
                val startButton = view.findViewById<Button>(R.id.startButton)
                val playButton = view.findViewById<Button>(R.id.playButton)
                val dragHandle = view.findViewById<TextView>(R.id.dragHandle)

                if (playing) {
                    startButton?.visibility = View.GONE
                    playButton?.text = "⏹ 停止"
                    playButton?.setBackgroundResource(R.drawable.button_stop)
                    // 更新拖拽把手颜色为绿色（执行中）
                    dragHandle?.setTextColor(0xFF44CC44.toInt())
                } else {
                    startButton?.visibility = View.VISIBLE
                    playButton?.text = "▶ 执行"
                    playButton?.setBackgroundResource(R.drawable.button_play)
                    // 更新拖拽把手颜色为灰色（待机）
                    dragHandle?.setTextColor(0xFF888888.toInt())
                }
            }
        }
    }
    
    /**
     * 执行录制的操作序列
     * @param actions 操作数组，每个操作包含 type, x, y, timestamp, duration 等信息
     * @param screenWidth 录制时的屏幕宽度
     * @param screenHeight 录制时的屏幕高度
     */
    @ReactMethod
    fun executeActions(actions: ReadableArray, screenWidth: Int, screenHeight: Int) {
        if (actions.size() == 0) {
            android.util.Log.w("FloatingWindow", "没有可执行的操作")
            return
        }
        
        if (!TouchAccessibilityService.isServiceEnabled()) {
            android.util.Log.w("FloatingWindow", "无障碍服务未启用，无法执行操作")
            sendEvent("onPlaybackError", Arguments.createMap().apply {
                putString("error", "无障碍服务未启用")
            })
            return
        }
        
        isPlaying = true
        currentPlaybackIndex = 0
        
        // 取消之前的所有延迟任务（包括上一次回放的隐藏延迟）
        playbackHandler?.removeCallbacksAndMessages(null)
        playbackHandler = Handler(Looper.getMainLooper())
        
        // 重置操作计数（同步执行，确保在第一个操作前完成）
        playbackTouchCount = 0
        
        // 显示回放视觉效果 overlay
        showPlaybackOverlay()
        
        // 获取当前屏幕尺寸用于坐标适配
        val displayMetrics = DisplayMetrics()
        windowManager?.defaultDisplay?.getMetrics(displayMetrics)
        val currentWidth = displayMetrics.widthPixels
        val currentHeight = displayMetrics.heightPixels
        
        android.util.Log.d("FloatingWindow", "开始执行 ${actions.size()} 个操作")
        android.util.Log.d("FloatingWindow", "录制屏幕: ${screenWidth}x${screenHeight}, 当前屏幕: ${currentWidth}x${currentHeight}")
        
        // 发送开始事件
        sendEvent("onPlaybackStart", Arguments.createMap().apply {
            putInt("totalActions", actions.size())
        })
        
        // 开始执行第一个操作
        executeNextAction(actions, 0, screenWidth, screenHeight, currentWidth, currentHeight)
    }
    
    private fun executeNextAction(
        actions: ReadableArray,
        index: Int,
        recordWidth: Int,
        recordHeight: Int,
        currentWidth: Int,
        currentHeight: Int
    ) {
        if (!isPlaying || index >= actions.size()) {
            // 执行完成
            isPlaying = false
            // 延迟隐藏回放 overlay，让最后一个指示器有时间显示
            playbackHandler?.postDelayed({
                hidePlaybackOverlay()
            }, 3500)
            sendEvent("onPlaybackComplete", Arguments.createMap().apply {
                putInt("executedCount", index)
            })
            return
        }
        
        val action = actions.getMap(index)
        val type = action?.getString("type") ?: return
        val normalizedX = action.getDouble("normalizedX")
        val normalizedY = action.getDouble("normalizedY")
        
        // 使用归一化坐标计算当前屏幕上的实际坐标
        val x = (normalizedX * currentWidth).toFloat()
        val y = (normalizedY * currentHeight).toFloat()
        
        // 计算与下一个操作的时间间隔
        val currentTimestamp = action.getDouble("timestamp").toLong()
        val nextDelay = if (index + 1 < actions.size()) {
            val nextAction = actions.getMap(index + 1)
            val nextTimestamp = nextAction?.getDouble("timestamp")?.toLong() ?: currentTimestamp
            (nextTimestamp - currentTimestamp).coerceAtLeast(100)
        } else {
            0L
        }
        
        android.util.Log.d("FloatingWindow", "执行操作 ${index + 1}/${actions.size()}: $type at ($x, $y), 下次延迟: ${nextDelay}ms")
        
        // 发送进度事件
        sendEvent("onPlaybackProgress", Arguments.createMap().apply {
            putInt("current", index + 1)
            putInt("total", actions.size())
            putString("type", type)
        })
        
        when (type) {
            "tap" -> {
                // 显示触摸指示器
                showPlaybackTouchIndicator(x, y)
                
                TouchAccessibilityService.performTap(x, y) { success ->
                    if (success) {
                        android.util.Log.d("FloatingWindow", "点击成功: ($x, $y)")
                    } else {
                        android.util.Log.w("FloatingWindow", "点击失败: ($x, $y)")
                    }
                    
                    // 开始渐隐动画
                    hidePlaybackTouchIndicator()
                    
                    // 延迟执行下一个操作
                    playbackHandler?.postDelayed({
                        executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight)
                    }, nextDelay.coerceAtLeast(100))
                }
            }
            "swipe_start" -> {
                // 查找对应的 swipe_end
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
                
                // 计算滑动时长
                val swipeDuration = if (endIndex < actions.size()) {
                    val endAction = actions.getMap(endIndex)
                    val endTimestamp = endAction?.getDouble("timestamp")?.toLong() ?: currentTimestamp
                    (endTimestamp - currentTimestamp).coerceIn(100, 1000)
                } else {
                    300L
                }
                
                // 显示滑动开始位置的触摸指示器
                showPlaybackTouchIndicator(x, y)
                
                TouchAccessibilityService.performSwipe(x, y, endX, endY, swipeDuration) { success ->
                    if (success) {
                        android.util.Log.d("FloatingWindow", "滑动成功")
                    } else {
                        android.util.Log.w("FloatingWindow", "滑动失败")
                    }
                    
                    // 开始渐隐动画
                    hidePlaybackTouchIndicator()
                    
                    // 跳过 swipe_move 和 swipe_end，直接执行下一个非滑动操作
                    var skipToIndex = endIndex + 1
                    
                    // 计算延迟（使用 swipe_end 的时间戳）
                    val delayAfterSwipe = if (skipToIndex < actions.size()) {
                        val swipeEndAction = actions.getMap(endIndex)
                        val swipeEndTime = swipeEndAction?.getDouble("timestamp")?.toLong() ?: currentTimestamp
                        val nextAction = actions.getMap(skipToIndex)
                        val nextTime = nextAction?.getDouble("timestamp")?.toLong() ?: swipeEndTime
                        (nextTime - swipeEndTime).coerceAtLeast(100)
                    } else {
                        100L
                    }
                    
                    playbackHandler?.postDelayed({
                        executeNextAction(actions, skipToIndex, recordWidth, recordHeight, currentWidth, currentHeight)
                    }, delayAfterSwipe)
                }
            }
            "swipe_move", "swipe_end" -> {
                // 这些事件在处理 swipe_start 时已经处理了，跳过
                playbackHandler?.postDelayed({
                    executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight)
                }, 10)
            }
            else -> {
                // 未知类型，跳过
                playbackHandler?.postDelayed({
                    executeNextAction(actions, index + 1, recordWidth, recordHeight, currentWidth, currentHeight)
                }, nextDelay.coerceAtLeast(100))
            }
        }
    }
    
    /**
     * 停止回放
     */
    @ReactMethod
    fun stopPlayback() {
        isPlaying = false
        playbackHandler?.removeCallbacksAndMessages(null)
        playbackHandler = null
        currentPlaybackIndex = 0
        
        // 隐藏回放视觉效果 overlay
        hidePlaybackOverlay()
        
        sendEvent("onPlaybackStopped", null)
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
            val playButton = view.findViewById<Button>(R.id.playButton)
            val saveButton = view.findViewById<Button>(R.id.saveButton)
            val closeButton = view.findViewById<Button>(R.id.closeButton)

            startButton?.setOnClickListener {
                sendEvent("onStartRecording", null)
            }

            stopButton?.setOnClickListener {
                sendEvent("onStopRecording", null)
            }
            
            playButton?.setOnClickListener {
                if (isPlaying) {
                    // 正在执行，点击停止
                    sendEvent("onStopPlayback", null)
                } else {
                    // 未执行，点击开始执行
                    sendEvent("onStartPlayback", null)
                }
            }
            
            saveButton?.setOnClickListener {
                // 点击保存，先将应用带到前台
                bringAppToForeground()
                // 发送保存事件
                sendEvent("onSaveRecording", null)
            }

            closeButton?.setOnClickListener {
                // 如果正在执行，先停止
                if (isPlaying) {
                    stopPlayback()
                }
                // 直接关闭悬浮窗
                hideFloatingWindowInternal()
                sendEvent("onClose", null)
            }
        }
    }
    
    /**
     * 将应用带到前台
     */
    private fun bringAppToForeground() {
        reactContext.currentActivity?.let { activity ->
            val intent = Intent(activity, activity.javaClass)
            intent.flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
        } ?: run {
            // 如果没有 currentActivity，尝试通过包名启动
            val packageName = reactContext.packageName
            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.let {
                it.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                reactContext.startActivity(it)
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
