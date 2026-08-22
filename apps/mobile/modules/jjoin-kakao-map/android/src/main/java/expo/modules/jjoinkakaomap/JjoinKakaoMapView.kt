package expo.modules.jjoinkakaomap

import android.app.Activity
import android.app.Application
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import com.kakao.vectormap.KakaoMap
import com.kakao.vectormap.KakaoMapReadyCallback
import com.kakao.vectormap.LatLng
import com.kakao.vectormap.MapLifeCycleCallback
import com.kakao.vectormap.MapType
import com.kakao.vectormap.MapView
import com.kakao.vectormap.MapViewInfo
import com.kakao.vectormap.camera.CameraAnimation
import com.kakao.vectormap.camera.CameraUpdateFactory
import com.kakao.vectormap.label.LabelLayer
import com.kakao.vectormap.label.LabelOptions
import com.kakao.vectormap.label.LabelStyle
import com.kakao.vectormap.label.LabelStyles
import com.kakao.vectormap.label.LabelTextBuilder
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import org.json.JSONArray

/**
 * Kakao Map Android SDK v2 bridge for Explore.
 *
 * Root-cause constraints for RN/Fabric embedding:
 * - Do not call MapView.start() before attach + non-zero layout.
 * - Drive resume/pause from Activity lifecycle (Kakao official requirement).
 * - Keep container transparent so SurfaceView punch-through can show tiles.
 */
class JjoinKakaoMapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  companion object {
    private const val TAG = "JjoinKakaoMap"
  }

  /** Required so MapView/SurfaceView receive real Android measure/layout under Yoga. */
  override val shouldUseAndroidLayout: Boolean = true

  private val onMapReady by EventDispatcher()
  private val onMapError by EventDispatcher()
  private val onCameraChanged by EventDispatcher()
  private val onMarkerPress by EventDispatcher()

  private val mapView =
    MapView(context).also { child ->
      child.setBackgroundColor(Color.TRANSPARENT)
      // ExpoView is a LinearLayout; weight=1 guarantees non-zero child height under Yoga.
      val lp =
        LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f).apply {
          gravity = android.view.Gravity.FILL
        }
      addView(child, lp)
    }

  var initialLatitude: Double = 37.5665
  var initialLongitude: Double = 126.978
  var initialZoomLevel: Int = 14

  private var kakaoMap: KakaoMap? = null
  private var labelLayer: LabelLayer? = null
  private var startRequested = false
  private var mapReady = false
  private var pendingMarkersJson: String = "[]"
  private var programmaticMove = false
  private var activityCallbacksRegistered = false

  private val markerIconCache = HashMap<Int, Bitmap>()

  private val activityCallbacks =
    object : Application.ActivityLifecycleCallbacks {
      override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit

      override fun onActivityStarted(activity: Activity) = Unit

      override fun onActivityResumed(activity: Activity) {
        if (activity !== appContext.currentActivity) return
        Log.i(TAG, "activityResumed ready=$mapReady")
        safeResume("activityResumed")
      }

      override fun onActivityPaused(activity: Activity) {
        if (activity !== appContext.currentActivity) return
        Log.i(TAG, "activityPaused ready=$mapReady")
        safePause("activityPaused")
      }

      override fun onActivityStopped(activity: Activity) = Unit

      override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit

      override fun onActivityDestroyed(activity: Activity) = Unit
    }

  init {
    setBackgroundColor(Color.TRANSPARENT)
    clipChildren = false
    clipToPadding = false
    registerActivityLifecycle()
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val w = MeasureSpec.getSize(widthMeasureSpec)
    val h = MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(w, h)
    if (w > 0 && h > 0) {
      mapView.measure(
        MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY),
      )
    }
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    val w = right - left
    val h = bottom - top
    if (w > 0 && h > 0) {
      mapView.layout(0, 0, w, h)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    registerActivityLifecycle()
    forceMapViewLayout("attached")
    Log.i(TAG, "onAttachedToWindow size=${width}x${height} map=${mapView.width}x${mapView.height}")
    maybeStartMap("attached")
    safeResume("attached")
  }

  override fun onDetachedFromWindow() {
    safePause("detached")
    Log.i(TAG, "onDetachedFromWindow")
    super.onDetachedFromWindow()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    forceMapViewLayout("sizeChanged")
    Log.i(
      TAG,
      "onSizeChanged ${oldw}x${oldh} -> ${w}x${h} map=${mapView.width}x${mapView.height}",
    )
    maybeStartMap("sizeChanged")
    if (w > 0 && h > 0) {
      safeResume("sizeChanged")
    }
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    if (visibility == View.VISIBLE) {
      forceMapViewLayout("windowVisible")
      maybeStartMap("windowVisible")
      safeResume("windowVisible")
    } else {
      safePause("windowHidden")
    }
  }

  private fun forceMapViewLayout(reason: String) {
    if (width <= 0 || height <= 0) return
    mapView.measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    mapView.layout(0, 0, width, height)
    Log.i(TAG, "forceMapViewLayout($reason) map=${mapView.width}x${mapView.height}")
  }

  private fun safeResume(reason: String) {
    if (!mapReady) return
    try {
      mapView.resume()
      Log.i(TAG, "resume($reason)")
    } catch (error: Throwable) {
      Log.w(TAG, "resume($reason) failed: ${error.javaClass.simpleName}: ${error.message}")
    }
  }

  private fun safePause(reason: String) {
    if (!mapReady) return
    try {
      mapView.pause()
      Log.i(TAG, "pause($reason)")
    } catch (error: Throwable) {
      Log.w(TAG, "pause($reason) failed: ${error.javaClass.simpleName}: ${error.message}")
    }
  }

  fun destroyMap() {
    unregisterActivityLifecycle()
    mapReady = false
    try {
      if (startRequested) {
        mapView.finish()
      }
    } catch (error: Throwable) {
      Log.w(TAG, "finish failed: ${error.javaClass.simpleName}")
    }
    kakaoMap = null
    labelLayer = null
    startRequested = false
  }

  fun setMarkersJson(json: String) {
    pendingMarkersJson = json
    renderMarkers(json)
  }

  fun animateCameraTo(latitude: Double, longitude: Double, durationMs: Int) {
    val map = kakaoMap ?: return
    programmaticMove = true
    val update = CameraUpdateFactory.newCenterPosition(LatLng.from(latitude, longitude))
    val duration = durationMs.coerceIn(0, 5000)
    if (duration <= 0) {
      map.moveCamera(update)
      programmaticMove = false
    } else {
      map.moveCamera(update, CameraAnimation.from(duration))
    }
  }

  fun getViewportBoundsMap(): Map<String, Double> {
    val map = kakaoMap ?: return emptyMap()
    val bounds = readViewport(map) ?: return emptyMap()
    return mapOf(
      "west" to bounds.west,
      "south" to bounds.south,
      "east" to bounds.east,
      "north" to bounds.north,
      "centerLat" to bounds.centerLat,
      "centerLng" to bounds.centerLng,
      "zoomLevel" to bounds.zoomLevel.toDouble(),
    )
  }

  private fun registerActivityLifecycle() {
    if (activityCallbacksRegistered) return
    val activity = appContext.currentActivity ?: return
    activity.application.registerActivityLifecycleCallbacks(activityCallbacks)
    activityCallbacksRegistered = true
  }

  private fun unregisterActivityLifecycle() {
    if (!activityCallbacksRegistered) return
    val activity = appContext.currentActivity
    activity?.application?.unregisterActivityLifecycleCallbacks(activityCallbacks)
    activityCallbacksRegistered = false
  }

  private fun maybeStartMap(reason: String) {
    if (startRequested) return
    if (!isAttachedToWindow) return
    forceMapViewLayout("preStart:$reason")
    if (width <= 0 || height <= 0 || mapView.width <= 0 || mapView.height <= 0) {
      Log.i(
        TAG,
        "defer start ($reason): view=${width}x${height} map=${mapView.width}x${mapView.height}",
      )
      return
    }
    startRequested = true
    Log.i(TAG, "MapView.start ($reason) view=${width}x${height} map=${mapView.width}x${mapView.height}")
    mapView.start(
      object : MapLifeCycleCallback() {
        override fun onMapDestroy() {
          Log.i(TAG, "onMapDestroy")
          mapReady = false
          kakaoMap = null
          labelLayer = null
        }

        override fun onMapError(error: Exception) {
          val type = error.javaClass.simpleName
          val message = error.message ?: "kakao_map_error"
          Log.e(TAG, "onMapError type=$type message=$message")
          mapReady = false
          onMapError(
            mapOf(
              "message" to message,
              "type" to type,
              "hint" to "Check Native App Key, package com.jjoin.app, and Android key hash",
            ),
          )
        }
      },
      object : KakaoMapReadyCallback() {
        override fun getPosition(): LatLng {
          return LatLng.from(initialLatitude, initialLongitude)
        }

        override fun getZoomLevel(): Int {
          return initialZoomLevel.coerceIn(1, 21)
        }

        override fun getMapViewInfo(): MapViewInfo {
          return MapViewInfo.from("openmap", MapType.NORMAL)
        }

        override fun isVisible(): Boolean = true

        override fun onMapReady(map: KakaoMap) {
          kakaoMap = map
          labelLayer = map.labelManager?.layer
          mapReady = true
          try {
            mapView.setFinishManually(true)
          } catch (error: Throwable) {
            Log.w(TAG, "setFinishManually after ready failed: ${error.message}")
          }
          forceMapViewLayout("onMapReady")
          val surface = mapView.surfaceView
          val surfaceW = surface?.width ?: -1
          val surfaceH = surface?.height ?: -1
          Log.i(
            TAG,
            "onMapReady engine=${safeEngineState()} vulkan=${safeIsVulkan()} " +
              "view=${width}x${height} map=${mapView.width}x${mapView.height} " +
              "surface=${surfaceW}x${surfaceH}",
          )
          surface?.setZOrderMediaOverlay(true)
          wireCameraListener(map)
          wireLabelClick(map)
          renderMarkers(pendingMarkersJson)
          safeResume("onMapReady")
          onMapReady(
            mapOf(
              "ok" to true,
              "width" to width,
              "height" to height,
              "mapWidth" to mapView.width,
              "mapHeight" to mapView.height,
              "surfaceWidth" to surfaceW,
              "surfaceHeight" to surfaceH,
              "vulkan" to safeIsVulkan(),
            ),
          )
        }
      },
    )
    // SurfaceView is created during start — re-apply size so GL can complete ready.
    mapView.post {
      forceMapViewLayout("postStart")
      mapView.requestLayout()
      mapView.invalidate()
    }
    mapView.postDelayed({
      forceMapViewLayout("postStartDelayed")
      Log.i(
        TAG,
        "postStartDelayed map=${mapView.width}x${mapView.height} " +
          "surface=${mapView.surfaceView?.width ?: -1}x${mapView.surfaceView?.height ?: -1} ready=$mapReady",
      )
    }, 300)
  }

  private fun safeEngineState(): String {
    return try {
      mapView.engineState
    } catch (_: Throwable) {
      "unknown"
    }
  }

  private fun safeIsVulkan(): Boolean {
    return try {
      mapView.isVulkan
    } catch (_: Throwable) {
      false
    }
  }

  private fun wireCameraListener(map: KakaoMap) {
    map.setOnCameraMoveEndListener { kakaoMap, _position, gestureType ->
      val wasProgrammatic = programmaticMove
      programmaticMove = false
      val gestureName = gestureType?.name.orEmpty()
      val reason =
        when {
          wasProgrammatic -> "Program"
          gestureName.contains("Pan", ignoreCase = true) ||
            gestureName.contains("Zoom", ignoreCase = true) ||
            gestureName.contains("Rotate", ignoreCase = true) ||
            gestureName.contains("Tilt", ignoreCase = true) ||
            gestureName.contains("Tap", ignoreCase = true) ||
            gestureName.contains("OneFinger", ignoreCase = true) ||
            gestureName.contains("TwoFinger", ignoreCase = true) -> "Gesture"
          else -> "Unknown"
        }
      val viewport = readViewport(kakaoMap) ?: return@setOnCameraMoveEndListener
      onCameraChanged(
        mapOf(
          "latitude" to viewport.centerLat,
          "longitude" to viewport.centerLng,
          "zoomLevel" to viewport.zoomLevel,
          "reason" to reason,
          "west" to viewport.west,
          "south" to viewport.south,
          "east" to viewport.east,
          "north" to viewport.north,
        ),
      )
    }
  }

  private fun wireLabelClick(map: KakaoMap) {
    map.setOnLabelClickListener { _kakaoMap, _layer, label ->
      val tag = label.tag as? String
      if (tag.isNullOrBlank()) {
        false
      } else {
        onMarkerPress(mapOf("id" to tag))
        true
      }
    }
  }

  private fun renderMarkers(json: String) {
    val layer = labelLayer ?: return
    val map = kakaoMap ?: return
    try {
      layer.removeAll()
    } catch (_: Throwable) {
      // empty layer on some SDK builds
    }

    val arr =
      try {
        JSONArray(json)
      } catch (_: Throwable) {
        return
      }

    for (i in 0 until arr.length()) {
      val item = arr.optJSONObject(i) ?: continue
      val id = item.optString("id")
      if (id.isBlank()) continue
      val lat = item.optDouble("latitude", Double.NaN)
      val lng = item.optDouble("longitude", Double.NaN)
      if (lat.isNaN() || lng.isNaN()) continue
      val caption = item.optString("caption", "")
      val kind = item.optString("kind", "venue")
      val selected = item.optBoolean("selected", false)
      val styles = stylesFor(map, kind, selected)
      val options =
        LabelOptions.from(LatLng.from(lat, lng))
          .setStyles(styles)
          .setTag(id)
      if (caption.isNotBlank()) {
        options.setTexts(LabelTextBuilder().setTexts(caption))
      }
      try {
        layer.addLabel(options)
      } catch (error: Throwable) {
        Log.w(TAG, "addLabel skipped id=$id err=${error.javaClass.simpleName}")
      }
    }
  }

  private fun stylesFor(map: KakaoMap, kind: String, selected: Boolean): LabelStyles {
    val icon =
      when (kind) {
        "user" -> userMarkerIcon(selected)
        "me" -> meMarkerIcon()
        else -> venuePinIcon(selected)
      }
    val style =
      LabelStyle.from(icon)
        .setApplyDpScale(true)
        .setAnchorPoint(anchorFor(kind))
    return requireNotNull(map.labelManager!!.addLabelStyles(LabelStyles.from(style)))
  }

  /** Venue pin tip = coordinate. User/me disc center = coordinate. */
  private fun anchorFor(kind: String): PointF {
    return when (kind) {
      "venue" -> PointF(0.5f, 1.0f)
      else -> PointF(0.5f, 0.5f)
    }
  }

  private fun venuePinIcon(selected: Boolean): Bitmap {
    val key = (if (selected) 1 else 0) shl 20 or 0x101
    markerIconCache[key]?.let { return it }
    val density = resources.displayMetrics.density
    val widthDp = if (selected) 26f else 14f
    val heightDp = if (selected) 36f else 20f
    val w = (widthDp * density).toInt().coerceAtLeast(16)
    val h = (heightDp * density).toInt().coerceAtLeast(22)
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val fill = if (selected) Color.parseColor("#023D31") else Color.parseColor("#0A6B56")
    val cx = w / 2f
    val headR = w * (if (selected) 0.38f else 0.34f)
    val headCy = headR + density * 0.8f
    val tipY = h - density * 0.4f

    val path =
      Path().apply {
        moveTo(cx, tipY)
        cubicTo(
          cx - headR * 0.15f,
          tipY - headR * 0.55f,
          cx - headR,
          headCy + headR * 0.55f,
          cx - headR,
          headCy,
        )
        cubicTo(
          cx - headR,
          headCy - headR * 1.05f,
          cx + headR,
          headCy - headR * 1.05f,
          cx + headR,
          headCy,
        )
        cubicTo(
          cx + headR,
          headCy + headR * 0.55f,
          cx + headR * 0.15f,
          tipY - headR * 0.55f,
          cx,
          tipY,
        )
        close()
      }
    val fillPaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = fill
        style = Paint.Style.FILL
      }
    val strokePaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = density * (if (selected) 2.4f else 1.1f)
        strokeJoin = Paint.Join.ROUND
      }
    canvas.drawPath(path, fillPaint)
    canvas.drawPath(path, strokePaint)
    if (selected) {
      val halo =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = Color.parseColor("#0A6B56")
          style = Paint.Style.STROKE
          strokeWidth = density * 1.4f
          alpha = 90
        }
      canvas.drawCircle(cx, headCy, headR + density * 2f, halo)
      val dot =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = Color.WHITE
          style = Paint.Style.FILL
        }
      canvas.drawCircle(cx, headCy, headR * 0.32f, dot)
    }
    markerIconCache[key] = bitmap
    return bitmap
  }

  private fun userMarkerIcon(selected: Boolean): Bitmap {
    val key = (if (selected) 1 else 0) shl 20 or 0x200
    markerIconCache[key]?.let { return it }
    val density = resources.displayMetrics.density
    val sizeDp = if (selected) 18f else 14f
    val px = (sizeDp * density).toInt().coerceAtLeast(14)
    val bitmap = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val cx = px / 2f
    val cy = px / 2f
    val r = px / 2f - density
    val fill =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#2674B2")
        style = Paint.Style.FILL
      }
    val ring =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = density * (if (selected) 2.2f else 1.5f)
      }
    canvas.drawCircle(cx, cy, r, fill)
    canvas.drawCircle(cx, cy, r, ring)
    if (selected) {
      val outer =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = Color.parseColor("#2674B2")
          style = Paint.Style.STROKE
          strokeWidth = density * 1.2f
          alpha = 120
        }
      canvas.drawCircle(cx, cy, r + density * 1.5f, outer)
    }
    markerIconCache[key] = bitmap
    return bitmap
  }

  private fun meMarkerIcon(): Bitmap {
    val key = 0x300
    markerIconCache[key]?.let { return it }
    val density = resources.displayMetrics.density
    val px = (16f * density).toInt().coerceAtLeast(16)
    val bitmap = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val cx = px / 2f
    val cy = px / 2f
    val halo =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#4FC3F7")
        style = Paint.Style.FILL
        alpha = 90
      }
    val core =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#0288D1")
        style = Paint.Style.FILL
      }
    val border =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = density * 1.5f
      }
    canvas.drawCircle(cx, cy, px / 2f - density * 0.5f, halo)
    canvas.drawCircle(cx, cy, px * 0.22f, core)
    canvas.drawCircle(cx, cy, px * 0.22f, border)
    markerIconCache[key] = bitmap
    return bitmap
  }

  private data class Viewport(
    val west: Double,
    val south: Double,
    val east: Double,
    val north: Double,
    val centerLat: Double,
    val centerLng: Double,
    val zoomLevel: Int,
  )

  private fun readViewport(map: KakaoMap): Viewport? {
    val w = mapView.width
    val h = mapView.height
    if (w <= 0 || h <= 0) return null
    val sw = map.fromScreenPoint(0, h) ?: return null
    val ne = map.fromScreenPoint(w, 0) ?: return null
    val pos = map.cameraPosition?.position ?: return null
    val zoom = map.cameraPosition?.zoomLevel ?: 14
    return Viewport(
      west = sw.longitude,
      south = sw.latitude,
      east = ne.longitude,
      north = ne.latitude,
      centerLat = pos.latitude,
      centerLng = pos.longitude,
      zoomLevel = zoom,
    )
  }
}
