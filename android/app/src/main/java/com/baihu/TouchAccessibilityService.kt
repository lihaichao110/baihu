package com.baihu

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Color
import android.graphics.Path
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.FrameLayout
import android.widget.TextView
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs

/**
 * 无障碍服务 - 使用 TYPE_ACCESSIBILITY_OVERLAY 创建覆盖层
 * 不需要悬浮窗权限！
 */
class TouchAccessibilityService : AccessibilityService() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var floatingView: View? = null
    private var overlayParams: WindowManager.LayoutParams? = null
    private var floatingParams: WindowManager.LayoutParams? = null
    private var isOverlayShowing = false
    private var isFloatingShowing = false
    
    // 触摸相关变量
    private var touchStartX = 0f
    private var touchStartY = 0f
    private var touchStartTime = 0L
    private var isSwiping = false
    private var touchCount = 0
    private val SWIPE_THRESHOLD = 20f
    
    // 速度计算
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var lastTouchTime = 0L
    
    // 动画相关
    private var hideAnimator: android.animation.ValueAnimator? = null
    
    // 悬浮窗拖动相关
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    
    // 回放相关
    private var isPlaying = false
    // 注意：playbackHandler 由 FloatingWindowModule 管理，这里只管理 UI 状态
    private var playbackTouchCount = 0
    // 当前执行的 ID，用于过滤旧的异步任务
    private var currentPlaybackId = 0L
    private var playbackOverlayView: View? = null
    private var playbackHideAnimator: android.animation.ValueAnimator? = null
    private var playbackIndicatorParams: WindowManager.LayoutParams? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        TouchAccessibilityService.instance = this
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        android.util.Log.d("TouchAccessibility", "✅ 服务已连接，可以使用 TYPE_ACCESSIBILITY_OVERLAY")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // 可以在这里监听触摸事件用于调试
        event?.let {
            when (it.eventType) {
                AccessibilityEvent.TYPE_TOUCH_INTERACTION_START -> {
                    android.util.Log.d("TouchAccessibility", "触摸开始")
                }
                AccessibilityEvent.TYPE_TOUCH_INTERACTION_END -> {
                    android.util.Log.d("TouchAccessibility", "触摸结束")
                }
            }
        }
    }

    override fun onInterrupt() {
        android.util.Log.d("TouchAccessibility", "服务被中断")
    }

    override fun onDestroy() {
        super.onDestroy()
        hideOverlayInternal()
        hideFloatingWindowInternal()
        TouchAccessibilityService.instance = null
        android.util.Log.d("TouchAccessibility", "服务已销毁")
    }
    
    // ==================== 悬浮控制按钮 ====================
    
    private fun showFloatingWindowInternal() {
        if (isFloatingShowing) return
        
        Handler(Looper.getMainLooper()).post {
            try {
                floatingView = LayoutInflater.from(this).inflate(R.layout.floating_window, null)
                
                val windowWidth = dpToPx(60f).toInt()
                floatingParams = WindowManager.LayoutParams(
                    windowWidth,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, // 不需要悬浮窗权限！
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT
                )
                
                floatingParams?.apply {
                    gravity = Gravity.START or Gravity.CENTER_VERTICAL
                    x = 0
                    y = 0
                }
                
                windowManager?.addView(floatingView, floatingParams)
                isFloatingShowing = true
                
                setupFloatingButtons()
                setupFloatingTouchListener()
                
                android.util.Log.d("TouchAccessibility", "✅ 悬浮窗已显示（使用 TYPE_ACCESSIBILITY_OVERLAY）")
                
            } catch (e: Exception) {
                android.util.Log.e("TouchAccessibility", "显示悬浮窗失败: ${e.message}")
                e.printStackTrace()
            }
        }
    }
    
    private fun hideFloatingWindowInternal() {
        hideOverlayInternal()
        
        if (isFloatingShowing && floatingView != null) {
            Handler(Looper.getMainLooper()).post {
                try {
                    windowManager?.removeView(floatingView)
                    isFloatingShowing = false
                    floatingView = null
                    android.util.Log.d("TouchAccessibility", "悬浮窗已隐藏")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    private fun setupFloatingButtons() {
        floatingView?.let { view ->
            view.findViewById<android.widget.Button>(R.id.startButton)?.setOnClickListener {
                sendEvent("onStartRecording", null)
            }
            
            view.findViewById<android.widget.Button>(R.id.stopButton)?.setOnClickListener {
                sendEvent("onStopRecording", null)
            }
            
            view.findViewById<android.widget.Button>(R.id.playButton)?.setOnClickListener {
                if (isPlaying) {
                    sendEvent("onStopPlayback", null)
                } else {
                    sendEvent("onStartPlayback", null)
                }
            }
            
            view.findViewById<android.widget.Button>(R.id.saveButton)?.setOnClickListener {
                bringAppToForeground()
                sendEvent("onSaveRecording", null)
            }
            
            view.findViewById<android.widget.Button>(R.id.closeButton)?.setOnClickListener {
                if (isPlaying) {
                    stopPlaybackInternal()
                }
                hideFloatingWindowInternal()
                sendEvent("onClose", null)
            }
        }
    }
    
    private fun setupFloatingTouchListener() {
        floatingView?.let { view ->
            val container = view.findViewById<View>(R.id.floatingContainer)
            
            container?.setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = floatingParams?.x ?: 0
                        initialY = floatingParams?.y ?: 0
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        floatingParams?.let { p ->
                            p.x = initialX + (event.rawX - initialTouchX).toInt()
                            p.y = initialY + (event.rawY - initialTouchY).toInt()
                            windowManager?.updateViewLayout(view, p)
                        }
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        snapToLeft()
                        true
                    }
                    else -> false
                }
            }
        }
    }
    
    private fun snapToLeft() {
        floatingParams?.let { p ->
            floatingView?.let { view ->
                if (abs(p.x) > dpToPx(10f)) {
                    val animator = android.animation.ValueAnimator.ofInt(p.x, 0)
                    animator.duration = 200
                    animator.addUpdateListener { animation ->
                        p.x = animation.animatedValue as Int
                        try {
                            windowManager?.updateViewLayout(view, p)
                        } catch (e: Exception) {}
                    }
                    animator.start()
                } else {
                    p.x = 0
                    windowManager?.updateViewLayout(view, p)
                }
            }
        }
    }
    
    // ==================== 录制蒙层 ====================
    
    private fun showOverlayInternal() {
        Handler(Looper.getMainLooper()).post {
            try {
                val displayMetrics = DisplayMetrics()
                windowManager?.defaultDisplay?.getMetrics(displayMetrics)
                
                if (isOverlayShowing) {
                    android.util.Log.d("TouchAccessibility", "蒙层已显示，重置状态")
                    touchCount = 0
                    isSwiping = false
                    lastTouchTime = 0L
                    sendDeviceInfo(displayMetrics.widthPixels, displayMetrics.heightPixels)
                    return@post
                }
                
                overlayView = LayoutInflater.from(this).inflate(R.layout.overlay_touch_layer, null)
                
                overlayParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, // 不需要悬浮窗权限！
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
                
                windowManager?.addView(overlayView, overlayParams)
                
                // 将悬浮按钮移到蒙层之上
                bringFloatingWindowToFront()
                
                isOverlayShowing = true
                touchCount = 0
                
                setupOverlayTouchListener()
                sendDeviceInfo(displayMetrics.widthPixels, displayMetrics.heightPixels)
                
                android.util.Log.d("TouchAccessibility", "✅ 蒙层已显示（使用 TYPE_ACCESSIBILITY_OVERLAY）")
                
            } catch (e: Exception) {
                android.util.Log.e("TouchAccessibility", "显示蒙层失败: ${e.message}")
                e.printStackTrace()
            }
        }
    }
    
    fun hideOverlayInternal() {
        if (isOverlayShowing && overlayView != null) {
            Handler(Looper.getMainLooper()).post {
                try {
                    windowManager?.removeView(overlayView)
                    isOverlayShowing = false
                    overlayView = null
                    touchCount = 0
                    android.util.Log.d("TouchAccessibility", "蒙层已隐藏")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    private fun bringFloatingWindowToFront() {
        if (isFloatingShowing && floatingView != null && floatingParams != null) {
            try {
                val currentX = floatingParams!!.x
                val currentY = floatingParams!!.y
                
                windowManager?.removeView(floatingView)
                floatingParams!!.x = currentX
                floatingParams!!.y = currentY
                windowManager?.addView(floatingView, floatingParams)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    private fun setupOverlayTouchListener() {
        overlayView?.let { view ->
            val touchLayer = view.findViewById<FrameLayout>(R.id.overlayTouchLayer)
            val touchIndicator = view.findViewById<View>(R.id.touchIndicator)

            touchLayer?.setOnTouchListener { _, event ->
                val currentTime = System.currentTimeMillis()
                val pressure = event.pressure.coerceIn(0f, 1f)
                val pointerType = getPointerType(event)
                
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        touchStartX = event.rawX
                        touchStartY = event.rawY
                        touchStartTime = currentTime
                        isSwiping = false
                        
                        lastTouchX = event.rawX
                        lastTouchY = event.rawY
                        lastTouchTime = currentTime
                        
                        touchCount++
                        showTouchIndicator(touchIndicator, event.x, event.y)
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val deltaX = abs(event.rawX - touchStartX)
                        val deltaY = abs(event.rawY - touchStartY)
                        
                        updateTouchIndicator(touchIndicator, event.x, event.y)
                        
                        val (velocityX, velocityY) = calculateVelocity(event.rawX, event.rawY, currentTime)
                        
                        if (!isSwiping && (deltaX > SWIPE_THRESHOLD || deltaY > SWIPE_THRESHOLD)) {
                            isSwiping = true
                            sendTouchEvent("swipe_start", touchStartX, touchStartY, touchStartTime, pressure, pointerType, 0f, 0f)
                        }
                        
                        if (isSwiping) {
                            sendTouchEvent("swipe_move", event.rawX, event.rawY, currentTime, pressure, pointerType, velocityX, velocityY)
                        }
                        
                        lastTouchX = event.rawX
                        lastTouchY = event.rawY
                        lastTouchTime = currentTime
                        
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        hideTouchIndicator(touchIndicator)
                        
                        val endX = event.rawX
                        val endY = event.rawY
                        val wasSwipe = isSwiping
                        val savedStartX = touchStartX
                        val savedStartY = touchStartY
                        
                        val (velocityX, velocityY) = calculateVelocity(endX, endY, currentTime)
                        
                        if (wasSwipe) {
                            sendTouchEvent("swipe_end", endX, endY, currentTime, pressure, pointerType, velocityX, velocityY)
                        } else {
                            sendTouchEvent("tap", endX, endY, currentTime, pressure, pointerType, 0f, 0f)
                        }
                        
                        lastTouchTime = 0L
                        
                        // 执行触摸穿透
                        android.util.Log.d("TouchAccessibility", "准备执行触摸穿透，坐标: ($endX, $endY)")
                        setOverlayTouchable(false)
                        
                        Handler(Looper.getMainLooper()).postDelayed({
                            if (wasSwipe) {
                                android.util.Log.d("TouchAccessibility", "执行滑动: ($savedStartX, $savedStartY) -> ($endX, $endY)")
                                performSwipeThrough(savedStartX, savedStartY, endX, endY) { success ->
                                    android.util.Log.d("TouchAccessibility", "滑动结果: $success")
                                    Handler(Looper.getMainLooper()).postDelayed({
                                        setOverlayTouchable(true)
                                    }, if (success) 100 else 50)
                                }
                            } else {
                                android.util.Log.d("TouchAccessibility", "执行点击: ($endX, $endY)")
                                performTapThrough(endX, endY) { success ->
                                    android.util.Log.d("TouchAccessibility", "点击结果: $success")
                                    Handler(Looper.getMainLooper()).postDelayed({
                                        setOverlayTouchable(true)
                                    }, if (success) 100 else 50)
                                }
                            }
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
                android.util.Log.d("TouchAccessibility", "蒙层可触摸状态: $touchable")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    private fun performTapThrough(x: Float, y: Float, callback: ((Boolean) -> Unit)?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            dispatchTapGesture(x, y) { success ->
                android.util.Log.d("TouchAccessibility", "点击穿透结果: $success at ($x, $y)")
                callback?.invoke(success)
            }
        } else {
            android.util.Log.w("TouchAccessibility", "Android 版本过低，不支持 dispatchGesture")
            callback?.invoke(false)
        }
    }
    
    private fun performSwipeThrough(startX: Float, startY: Float, endX: Float, endY: Float, callback: ((Boolean) -> Unit)?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val distance = kotlin.math.sqrt(
                (endX - startX) * (endX - startX) + (endY - startY) * (endY - startY)
            )
            val duration = (distance / 2).toLong().coerceIn(100, 500)
            
            dispatchSwipeGesture(startX, startY, endX, endY, duration) { success ->
                android.util.Log.d("TouchAccessibility", "滑动穿透结果: $success")
                callback?.invoke(success)
            }
        } else {
            callback?.invoke(false)
        }
    }
    
    // ==================== UI 状态更新 ====================
    
    fun updateRecordingStateInternal(isRecording: Boolean) {
        Handler(Looper.getMainLooper()).post {
            floatingView?.let { view ->
                val startButton = view.findViewById<android.widget.Button>(R.id.startButton)
                val stopButton = view.findViewById<android.widget.Button>(R.id.stopButton)
                val playButton = view.findViewById<android.widget.Button>(R.id.playButton)
                val dragHandle = view.findViewById<TextView>(R.id.dragHandle)

                if (isRecording) {
                    startButton?.visibility = View.GONE
                    stopButton?.visibility = View.VISIBLE
                    playButton?.visibility = View.GONE
                    dragHandle?.setTextColor(0xFFFF4444.toInt())
                } else {
                    startButton?.visibility = View.VISIBLE
                    stopButton?.visibility = View.GONE
                    dragHandle?.setTextColor(0xFF888888.toInt())
                }
            }
        }
    }
    
    private fun setPlayButtonVisibleInternal(visible: Boolean) {
        Handler(Looper.getMainLooper()).post {
            floatingView?.let { view ->
                view.findViewById<android.widget.Button>(R.id.playButton)?.visibility = 
                    if (visible) View.VISIBLE else View.GONE
            }
        }
    }
    
    private fun setSaveButtonVisibleInternal(visible: Boolean) {
        Handler(Looper.getMainLooper()).post {
            floatingView?.let { view ->
                view.findViewById<android.widget.Button>(R.id.saveButton)?.visibility = 
                    if (visible) View.VISIBLE else View.GONE
            }
        }
    }
    
    private fun updatePlayingStateInternal(playing: Boolean) {
        isPlaying = playing
        if (playing) {
            playbackTouchCount = 0
        }
        Handler(Looper.getMainLooper()).post {
            floatingView?.let { view ->
                val startButton = view.findViewById<android.widget.Button>(R.id.startButton)
                val playButton = view.findViewById<android.widget.Button>(R.id.playButton)
                val dragHandle = view.findViewById<TextView>(R.id.dragHandle)

                if (playing) {
                    startButton?.visibility = View.GONE
                    playButton?.text = "⏹ 停止"
                    playButton?.setBackgroundResource(R.drawable.button_stop)
                    dragHandle?.setTextColor(0xFF44CC44.toInt())
                } else {
                    startButton?.visibility = View.VISIBLE
                    playButton?.text = "▶ 执行"
                    playButton?.setBackgroundResource(R.drawable.button_play)
                    dragHandle?.setTextColor(0xFF888888.toInt())
                }
            }
        }
    }
    
    private fun stopPlaybackInternal() {
        isPlaying = false
        playbackTouchCount = 0
        
        // 隐藏回放 overlay
        playbackHideAnimator?.cancel()
        removePlaybackOverlay()
        
        sendEvent("onPlaybackStopped", null)
    }
    
    /**
     * 重置回放状态（不发送事件）
     * 用于在开始新的回放前清理之前的状态
     * 注意：Handler 任务由 FloatingWindowModule 管理
     */
    private fun resetPlaybackStateInternal() {
        isPlaying = false
        playbackTouchCount = 0
        // 生成新的执行 ID，使旧的异步任务失效
        currentPlaybackId = System.currentTimeMillis()
        
        // 隐藏回放 overlay
        playbackHideAnimator?.cancel()
        removePlaybackOverlay()
        
        android.util.Log.d("TouchAccessibility", "回放状态已重置，计数器归零，新执行ID=$currentPlaybackId")
    }
    
    // ==================== 触摸指示器 ====================
    
    private fun showTouchIndicator(indicator: View?, x: Float, y: Float) {
        indicator?.let {
            hideAnimator?.cancel()
            hideAnimator = null
            
            val countLabel = it.findViewById<TextView>(R.id.touchCountLabel)
            countLabel?.text = touchCount.toString()
            
            val density = resources.displayMetrics.density
            it.visibility = View.VISIBLE
            it.x = x - 20 * density
            it.y = y - 20 * density
            it.alpha = 1f
            it.scaleX = 0.3f
            it.scaleY = 0.3f
            it.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(150)
                .setInterpolator(android.view.animation.OvershootInterpolator(1.5f))
                .start()
        }
    }

    private fun updateTouchIndicator(indicator: View?, x: Float, y: Float) {
        indicator?.let {
            val density = resources.displayMetrics.density
            it.x = x - 20 * density
            it.y = y - 20 * density
        }
    }

    private fun hideTouchIndicator(indicator: View?) {
        indicator?.let {
            hideAnimator?.cancel()
            
            hideAnimator = android.animation.ValueAnimator.ofFloat(1f, 0f).apply {
                duration = 2000
                interpolator = android.view.animation.DecelerateInterpolator(2f)
                addUpdateListener { animator ->
                    val value = animator.animatedValue as Float
                    it.alpha = value
                    val scale = 0.8f + 0.2f * value
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
                        it.alpha = 1f
                        it.scaleX = 1f
                        it.scaleY = 1f
                    }
                })
            }
            hideAnimator?.start()
        }
    }
    
    // ==================== 回放触摸指示器 ====================
    
    fun showPlaybackIndicator(x: Float, y: Float) {
        // 捕获对外部类的引用
        val service = this
        
        // 捕获当前的执行 ID
        val executionId = service.currentPlaybackId
        
        Handler(Looper.getMainLooper()).post {
            // 检查执行 ID 是否仍然有效（可能已经被新的执行取代）
            if (executionId != service.currentPlaybackId) {
                android.util.Log.d("TouchAccessibility", "跳过旧的指示器任务，executionId=$executionId, current=${service.currentPlaybackId}")
                return@post
            }
            
            try {
                service.playbackTouchCount++
                
                // 移除之前的指示器
                service.playbackHideAnimator?.cancel()
                if (service.playbackOverlayView != null) {
                    try {
                        service.windowManager?.removeView(service.playbackOverlayView)
                    } catch (e: Exception) {}
                }
                
                // 创建新的指示器视图
                service.playbackOverlayView = LayoutInflater.from(service).inflate(R.layout.overlay_touch_layer, null)
                
                service.playbackIndicatorParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    PixelFormat.TRANSLUCENT
                )
                
                service.playbackIndicatorParams?.apply {
                    gravity = Gravity.TOP or Gravity.START
                }
                
                // 设置透明背景（回放时不需要遮罩）
                service.playbackOverlayView?.findViewById<FrameLayout>(R.id.overlayTouchLayer)?.setBackgroundColor(Color.TRANSPARENT)
                
                service.windowManager?.addView(service.playbackOverlayView, service.playbackIndicatorParams)
                
                // 显示指示器
                val touchIndicator = service.playbackOverlayView?.findViewById<View>(R.id.touchIndicator)
                val countLabel = touchIndicator?.findViewById<TextView>(R.id.touchCountLabel)
                countLabel?.text = service.playbackTouchCount.toString()
                
                val density = service.resources.displayMetrics.density
                touchIndicator?.visibility = View.VISIBLE
                touchIndicator?.x = x - 20 * density
                touchIndicator?.y = y - 20 * density
                touchIndicator?.alpha = 1f
                touchIndicator?.scaleX = 0.3f
                touchIndicator?.scaleY = 0.3f
                touchIndicator?.animate()
                    ?.scaleX(1f)
                    ?.scaleY(1f)
                    ?.setDuration(150)
                    ?.setInterpolator(android.view.animation.OvershootInterpolator(1.5f))
                    ?.start()
                
                // 自动隐藏
                hidePlaybackIndicator(touchIndicator)
                
            } catch (e: Exception) {
                android.util.Log.e("TouchAccessibility", "显示回放指示器失败: ${e.message}")
            }
        }
    }
    
    private fun showPlaybackSwipeIndicator(startX: Float, startY: Float, endX: Float, endY: Float, duration: Long) {
        // 捕获对外部类的引用
        val service = this
        
        // 捕获当前的执行 ID
        val executionId = service.currentPlaybackId
        
        Handler(Looper.getMainLooper()).post {
            // 检查执行 ID 是否仍然有效（可能已经被新的执行取代）
            if (executionId != service.currentPlaybackId) {
                android.util.Log.d("TouchAccessibility", "跳过旧的滑动指示器任务，executionId=$executionId, current=${service.currentPlaybackId}")
                return@post
            }
            
            try {
                service.playbackTouchCount++
                
                // 移除之前的指示器
                service.playbackHideAnimator?.cancel()
                if (service.playbackOverlayView != null) {
                    try {
                        service.windowManager?.removeView(service.playbackOverlayView)
                    } catch (e: Exception) {}
                }
                
                // 创建新的指示器视图
                service.playbackOverlayView = LayoutInflater.from(service).inflate(R.layout.overlay_touch_layer, null)
                
                service.playbackIndicatorParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    PixelFormat.TRANSLUCENT
                )
                
                service.playbackIndicatorParams?.apply {
                    gravity = Gravity.TOP or Gravity.START
                }
                
                // 设置透明背景
                service.playbackOverlayView?.findViewById<FrameLayout>(R.id.overlayTouchLayer)?.setBackgroundColor(Color.TRANSPARENT)
                
                service.windowManager?.addView(service.playbackOverlayView, service.playbackIndicatorParams)
                
                // 显示起始位置指示器
                val touchIndicator = service.playbackOverlayView?.findViewById<View>(R.id.touchIndicator)
                val countLabel = touchIndicator?.findViewById<TextView>(R.id.touchCountLabel)
                countLabel?.text = service.playbackTouchCount.toString()
                
                val density = service.resources.displayMetrics.density
                touchIndicator?.visibility = View.VISIBLE
                touchIndicator?.x = startX - 20 * density
                touchIndicator?.y = startY - 20 * density
                touchIndicator?.alpha = 1f
                touchIndicator?.scaleX = 0.3f
                touchIndicator?.scaleY = 0.3f
                touchIndicator?.animate()
                    ?.scaleX(1f)
                    ?.scaleY(1f)
                    ?.setDuration(150)
                    ?.setInterpolator(android.view.animation.OvershootInterpolator(1.5f))
                    ?.start()
                
                // 动画移动到结束位置
                touchIndicator?.animate()
                    ?.x(endX - 20 * density)
                    ?.y(endY - 20 * density)
                    ?.setDuration(duration)
                    ?.setStartDelay(150)
                    ?.setInterpolator(android.view.animation.DecelerateInterpolator())
                    ?.withEndAction {
                        // 滑动结束后隐藏
                        hidePlaybackIndicator(touchIndicator)
                    }
                    ?.start()
                
            } catch (e: Exception) {
                android.util.Log.e("TouchAccessibility", "显示回放滑动指示器失败: ${e.message}")
            }
        }
    }
    
    private fun hidePlaybackIndicator(indicator: View?) {
        indicator?.let {
            playbackHideAnimator?.cancel()
            
            playbackHideAnimator = android.animation.ValueAnimator.ofFloat(1f, 0f).apply {
                duration = 1500
                startDelay = 300
                interpolator = android.view.animation.DecelerateInterpolator(2f)
                addUpdateListener { animator ->
                    val value = animator.animatedValue as Float
                    it.alpha = value
                    val scale = 0.8f + 0.2f * value
                    it.scaleX = scale
                    it.scaleY = scale
                }
                addListener(object : android.animation.AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: android.animation.Animator) {
                        removePlaybackOverlay()
                        playbackHideAnimator = null
                    }
                })
            }
            playbackHideAnimator?.start()
        }
    }
    
    private fun removePlaybackOverlay() {
        if (playbackOverlayView != null) {
            try {
                windowManager?.removeView(playbackOverlayView)
                playbackOverlayView = null
            } catch (e: Exception) {}
        }
    }
    
    // ==================== 手势执行 ====================

    @RequiresApi(Build.VERSION_CODES.N)
    fun dispatchTapGesture(x: Float, y: Float, callback: ((Boolean) -> Unit)?) {
        android.util.Log.d("TouchAccessibility", "dispatchTapGesture: ($x, $y)")
        
        val path = Path()
        path.moveTo(x, y)
        
        val gestureBuilder = GestureDescription.Builder()
        val stroke = GestureDescription.StrokeDescription(path, 0, 50) // 50ms 更快的点击
        gestureBuilder.addStroke(stroke)
        
        val gesture = gestureBuilder.build()
        
        val result = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                android.util.Log.d("TouchAccessibility", "✅ 点击手势完成: ($x, $y)")
                callback?.invoke(true)
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                android.util.Log.w("TouchAccessibility", "❌ 点击手势被取消: ($x, $y)")
                callback?.invoke(false)
            }
        }, null)
        
        android.util.Log.d("TouchAccessibility", "dispatchGesture 返回: $result")
        
        if (!result) {
            android.util.Log.e("TouchAccessibility", "dispatchGesture 调用失败！")
            callback?.invoke(false)
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    private fun dispatchSwipeGesture(
        startX: Float, 
        startY: Float, 
        endX: Float, 
        endY: Float, 
        duration: Long,
        callback: ((Boolean) -> Unit)?
    ) {
        val path = Path()
        path.moveTo(startX, startY)
        path.lineTo(endX, endY)
        
        val gestureBuilder = GestureDescription.Builder()
        val stroke = GestureDescription.StrokeDescription(path, 0, duration)
        gestureBuilder.addStroke(stroke)
        
        val gesture = gestureBuilder.build()
        
        val result = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                android.util.Log.d("TouchAccessibility", "✅ 滑动手势完成")
                callback?.invoke(true)
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                android.util.Log.w("TouchAccessibility", "❌ 滑动手势被取消")
                callback?.invoke(false)
            }
        }, null)
        
        if (!result) {
            android.util.Log.e("TouchAccessibility", "dispatchGesture 调用失败！")
            callback?.invoke(false)
        }
    }
    
    // ==================== 工具方法 ====================
    
    private fun calculateVelocity(currentX: Float, currentY: Float, currentTime: Long): Pair<Float, Float> {
        if (lastTouchTime == 0L) return Pair(0f, 0f)
        
        val timeDelta = currentTime - lastTouchTime
        if (timeDelta <= 0) return Pair(0f, 0f)
        
        val velocityX = ((currentX - lastTouchX) / timeDelta) * 1000
        val velocityY = ((currentY - lastTouchY) / timeDelta) * 1000
        
        return Pair(velocityX, velocityY)
    }
    
    private fun getPointerType(event: MotionEvent): String {
        return when (event.getToolType(0)) {
            MotionEvent.TOOL_TYPE_FINGER -> "touch"
            MotionEvent.TOOL_TYPE_STYLUS -> "stylus"
            MotionEvent.TOOL_TYPE_MOUSE -> "mouse"
            else -> "touch"
        }
    }
    
    private fun dpToPx(dp: Float): Float {
        return dp * resources.displayMetrics.density
    }
    
    private fun sendDeviceInfo(width: Int, height: Int) {
        val orientation = if (width > height) "landscape" else "portrait"
        
        val params = Arguments.createMap()
        params.putInt("width", width)
        params.putInt("height", height)
        params.putString("orientation", orientation)
        sendEvent("onDeviceInfo", params)
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
        val params = Arguments.createMap()
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
    
    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            android.util.Log.e("TouchAccessibility", "发送事件失败: $eventName, ${e.message}")
        }
    }
    
    private fun bringAppToForeground() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            intent?.let {
                it.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or 
                          android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                startActivity(it)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    // ==================== 屏幕文字匹配 ====================
    
    /**
     * 屏幕文字元素数据类
     */
    data class TextElement(
        val text: String,
        val x: Float,
        val y: Float,
        val width: Float,
        val height: Float
    )
    
    /**
     * 获取屏幕上所有文字元素
     */
    fun getAllTextElements(): List<TextElement> {
        val result = mutableListOf<TextElement>()
        val rootNode = rootInActiveWindow ?: return result
        
        // 递归遍历所有节点
        fun traverseNode(node: android.view.accessibility.AccessibilityNodeInfo) {
            val text = node.text?.toString() ?: node.contentDescription?.toString()
            
            if (!text.isNullOrEmpty()) {
                val bounds = android.graphics.Rect()
                node.getBoundsInScreen(bounds)
                
                result.add(TextElement(
                    text = text,
                    x = bounds.left.toFloat(),
                    y = bounds.top.toFloat(),
                    width = bounds.width().toFloat(),
                    height = bounds.height().toFloat()
                ))
            }
            
            // 遍历子节点
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    traverseNode(child)
                }
            }
        }
        
        traverseNode(rootNode)
        
        android.util.Log.d("TouchAccessibility", "获取到 ${result.size} 个文字元素")
        return result
    }
    
    /**
     * 查找屏幕上的目标文字
     */
    fun findTextOnScreen(targetText: String, matchMode: String = "contains"): TextElement? {
        val allTexts = getAllTextElements()
        
        return allTexts.find { element ->
            when (matchMode.lowercase()) {
                "exact" -> element.text == targetText
                "contains" -> element.text.contains(targetText, ignoreCase = true)
                "starts_with" -> element.text.startsWith(targetText, ignoreCase = true)
                "ends_with" -> element.text.endsWith(targetText, ignoreCase = true)
                "regex" -> {
                    try {
                        Regex(targetText, RegexOption.IGNORE_CASE).containsMatchIn(element.text)
                    } catch (e: Exception) {
                        false
                    }
                }
                else -> element.text.contains(targetText, ignoreCase = true)
            }
        }
    }
    
    /**
     * 发送屏幕文字元素到 React Native
     */
    fun sendScreenTexts() {
        val texts = getAllTextElements()
        val array = com.facebook.react.bridge.Arguments.createArray()
        
        for (text in texts) {
            val map = com.facebook.react.bridge.Arguments.createMap()
            map.putString("text", text.text)
            map.putDouble("x", text.x.toDouble())
            map.putDouble("y", text.y.toDouble())
            map.putDouble("width", text.width.toDouble())
            map.putDouble("height", text.height.toDouble())
            array.pushMap(map)
        }
        
        val params = com.facebook.react.bridge.Arguments.createMap()
        params.putArray("texts", array)
        sendEvent("onScreenTexts", params)
    }
    
    companion object {
        private var instance: TouchAccessibilityService? = null
        
        /**
         * 设置服务实例
         */
        fun setInstance(service: TouchAccessibilityService?) {
            instance = service
        }
        
        /**
         * 获取服务实例
         */
        fun getInstance(): TouchAccessibilityService? {
            return instance
        }
        
        /**
         * 设置 React Context
         */
        private var reactContext: ReactApplicationContext? = null
        
        fun setReactContext(context: ReactApplicationContext?) {
            reactContext = context
        }
        
        /**
         * 检查服务是否可用
         */
        fun isServiceEnabled(): Boolean {
            return instance != null
        }
        
        // ==================== 已有的方法 ====================
        
        fun showFloatingWindow() {
            instance?.showFloatingWindowInternal()
        }
        
        fun hideFloatingWindow() {
            instance?.hideFloatingWindowInternal()
        }
        
        fun showOverlay() {
            instance?.showOverlayInternal()
        }
        
        fun hideOverlay() {
            instance?.hideOverlayInternal()
        }
        
        fun updateRecordingState(isRecording: Boolean) {
            instance?.updateRecordingStateInternal(isRecording)
        }
        
        fun setPlayButtonVisible(visible: Boolean) {
            instance?.setPlayButtonVisibleInternal(visible)
        }
        
        fun setSaveButtonVisible(visible: Boolean) {
            instance?.setSaveButtonVisibleInternal(visible)
        }
        
        fun updatePlayingState(playing: Boolean) {
            instance?.updatePlayingStateInternal(playing)
        }
        
        fun performTap(x: Float, y: Float, callback: ((Boolean) -> Unit)? = null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                instance?.showPlaybackIndicator(x, y)
                instance?.dispatchTapGesture(x, y, callback) ?: callback?.invoke(false)
            } else {
                callback?.invoke(false)
            }
        }
        
        fun performSwipe(
            startX: Float, 
            startY: Float, 
            endX: Float, 
            endY: Float, 
            duration: Long = 300,
            callback: ((Boolean) -> Unit)? = null
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                instance?.showPlaybackSwipeIndicator(startX, startY, endX, endY, duration)
                instance?.dispatchSwipeGesture(startX, startY, endX, endY, duration, callback) ?: callback?.invoke(false)
            } else {
                callback?.invoke(false)
            }
        }
        
        fun stopPlayback() {
            instance?.stopPlaybackInternal()
        }
        
        fun resetPlaybackState() {
            instance?.resetPlaybackStateInternal()
        }
        
        // ==================== 新增的文字匹配方法 ====================
        
        /**
         * 获取屏幕所有文字元素
         */
        fun getScreenTexts(): List<TextElement> {
            return instance?.getAllTextElements() ?: emptyList()
        }
        
        /**
         * 查找文字
         */
        fun findText(targetText: String, matchMode: String = "contains"): TextElement? {
            return instance?.findTextOnScreen(targetText, matchMode)
        }
        
        /**
         * 根据文字自动点击
         */
        fun autoClickByText(
            targetText: String,
            matchMode: String = "contains",
            callback: ((Boolean, TextElement?) -> Unit)? = null
        ) {
            instance?.let { service ->
                val matchedElement = service.findTextOnScreen(targetText, matchMode)
                
                if (matchedElement != null) {
                    // 计算点击位置（元素中心）
                    val centerX = matchedElement.x + matchedElement.width / 2
                    val centerY = matchedElement.y + matchedElement.height / 2
                    
                    android.util.Log.d("TouchAccessibility", "找到文字: '${matchedElement.text}' 在 (${centerX}, ${centerY})")
                    
                    // 发送匹配成功事件
                    val params = com.facebook.react.bridge.Arguments.createMap()
                    params.putString("text", matchedElement.text)
                    params.putDouble("x", centerX.toDouble())
                    params.putDouble("y", centerY.toDouble())
                    sendEventToJS("onTextMatched", params)
                    
                    // 执行点击
                    service.dispatchTapGesture(centerX, centerY) { success ->
                        callback?.invoke(success, matchedElement)
                    }
                } else {
                    android.util.Log.w("TouchAccessibility", "未找到文字: '$targetText'")
                    callback?.invoke(false, null)
                }
            } ?: callback?.invoke(false, null)
        }
        
        /**
         * 批量查找文字
         */
        fun findMultipleTexts(
            targetTexts: List<String>,
            matchMode: String = "contains"
        ): Map<String, TextElement?> {
            val result = mutableMapOf<String, TextElement?>()
            val screenTexts = getScreenTexts()
            
            for (targetText in targetTexts) {
                result[targetText] = screenTexts.find { element ->
                    when (matchMode.lowercase()) {
                        "exact" -> element.text == targetText
                        "contains" -> element.text.contains(targetText, ignoreCase = true)
                        "starts_with" -> element.text.startsWith(targetText, ignoreCase = true)
                        "ends_with" -> element.text.endsWith(targetText, ignoreCase = true)
                        "regex" -> {
                            try {
                                Regex(targetText, RegexOption.IGNORE_CASE).containsMatchIn(element.text)
                            } catch (e: Exception) {
                                false
                            }
                        }
                        else -> element.text.contains(targetText, ignoreCase = true)
                    }
                }
            }
            
            return result
        }
        
        /**
         * 发送事件到 React Native（静态方法）
         */
        private fun sendEventToJS(eventName: String, params: Any?) {
            try {
                reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(eventName, params)
            } catch (e: Exception) {
                android.util.Log.e("TouchAccessibility", "发送事件失败: $eventName, ${e.message}")
            }
        }
    }
}
