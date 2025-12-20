package com.baihu

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import androidx.annotation.RequiresApi

class TouchAccessibilityService : AccessibilityService() {

    companion object {
        var instance: TouchAccessibilityService? = null
            private set
        
        /**
         * 检查服务是否可用
         */
        fun isServiceEnabled(): Boolean {
            return instance != null
        }
        
        /**
         * 执行点击手势
         */
        fun performTap(x: Float, y: Float, callback: ((Boolean) -> Unit)? = null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                instance?.dispatchTapGesture(x, y, callback)
            } else {
                callback?.invoke(false)
            }
        }
        
        /**
         * 执行滑动手势
         */
        fun performSwipe(
            startX: Float, 
            startY: Float, 
            endX: Float, 
            endY: Float, 
            duration: Long = 300,
            callback: ((Boolean) -> Unit)? = null
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                instance?.dispatchSwipeGesture(startX, startY, endX, endY, duration, callback)
            } else {
                callback?.invoke(false)
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        android.util.Log.d("TouchAccessibility", "服务已连接")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // 我们不需要处理无障碍事件，只需要执行手势
    }

    override fun onInterrupt() {
        android.util.Log.d("TouchAccessibility", "服务被中断")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        android.util.Log.d("TouchAccessibility", "服务已销毁")
    }

    @RequiresApi(Build.VERSION_CODES.N)
    private fun dispatchTapGesture(x: Float, y: Float, callback: ((Boolean) -> Unit)?) {
        val path = Path()
        path.moveTo(x, y)
        
        val gestureBuilder = GestureDescription.Builder()
        val stroke = GestureDescription.StrokeDescription(path, 0, 100) // 100ms 点击
        gestureBuilder.addStroke(stroke)
        
        val gesture = gestureBuilder.build()
        
        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                android.util.Log.d("TouchAccessibility", "点击完成: ($x, $y)")
                callback?.invoke(true)
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                android.util.Log.d("TouchAccessibility", "点击被取消: ($x, $y)")
                callback?.invoke(false)
            }
        }, null)
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
        
        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                android.util.Log.d("TouchAccessibility", "滑动完成: ($startX, $startY) -> ($endX, $endY)")
                callback?.invoke(true)
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                android.util.Log.d("TouchAccessibility", "滑动被取消")
                callback?.invoke(false)
            }
        }, null)
    }
}

