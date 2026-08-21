package expo.modules.jjoinkakaomap

import android.content.Context
import android.graphics.Color
import android.view.ViewGroup
import com.kakao.vectormap.KakaoMap
import com.kakao.vectormap.KakaoMapReadyCallback
import com.kakao.vectormap.LatLng
import com.kakao.vectormap.MapLifeCycleCallback
import com.kakao.vectormap.MapView
import com.kakao.vectormap.camera.CameraAnimation
import com.kakao.vectormap.camera.CameraUpdateFactory
import com.kakao.vectormap.label.LabelLayer
import com.kakao.vectormap.label.LabelOptions
import com.kakao.vectormap.label.LabelStyle
import com.kakao.vectormap.label.LabelStyles
import com.kakao.vectormap.label.LabelTextBuilder
import com.kakao.vectormap.label.LabelTextStyle
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import org.json.JSONArray

/**
 * Kakao Map Android SDK v2 bridge for Explore.
 * Marker taps and camera gestures are normalized for JS adapters.
 */
class JjoinKakaoMapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onMapReady by EventDispatcher()
  private val onMapError by EventDispatcher()
  private val onCameraChanged by EventDispatcher()
  private val onMarkerPress by EventDispatcher()

  private val mapView = MapView(context).also {
    addView(
      it,
      LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
    )
  }

  var initialLatitude: Double = 37.5665
  var initialLongitude: Double = 126.978
  var initialZoomLevel: Int = 14

  private var kakaoMap: KakaoMap? = null
  private var labelLayer: LabelLayer? = null
  private var started = false
  private var pendingMarkersJson: String = "[]"
  private var programmaticMove = false

  init {
    startMapIfNeeded()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    mapView.resume()
  }

  override fun onDetachedFromWindow() {
    mapView.pause()
    super.onDetachedFromWindow()
  }

  fun destroyMap() {
    try {
      mapView.finish()
    } catch (_: Throwable) {
      // ignore teardown races
    }
    kakaoMap = null
    labelLayer = null
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

  private fun startMapIfNeeded() {
    if (started) return
    started = true
    mapView.start(
      object : MapLifeCycleCallback() {
        override fun onMapDestroy() {
          kakaoMap = null
          labelLayer = null
        }

        override fun onMapError(error: Exception) {
          onMapError(
            mapOf(
              "message" to (error.message ?: "kakao_map_error"),
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

        override fun onMapReady(map: KakaoMap) {
          kakaoMap = map
          labelLayer = map.labelManager?.layer
          wireCameraListener(map)
          wireLabelClick(map)
          renderMarkers(pendingMarkersJson)
          onMapReady(mapOf("ok" to true))
        }
      },
    )
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
      // older SDK builds may throw if empty
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
      } catch (_: Throwable) {
        // skip bad marker rather than crash Explore
      }
    }
  }

  private fun stylesFor(map: KakaoMap, kind: String, selected: Boolean): LabelStyles {
    val textColor =
      when (kind) {
        "user" -> Color.parseColor("#2674B2")
        "me" -> Color.parseColor("#C62828")
        else -> if (selected) Color.parseColor("#023D31") else Color.parseColor("#0A6B56")
      }
    val textSize = if (selected) 28 else 24
    val textStyle = LabelTextStyle.from(textSize, textColor)
    val style = LabelStyle.from(textStyle).setApplyDpScale(true)
    return requireNotNull(map.labelManager!!.addLabelStyles(LabelStyles.from(style)))
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
