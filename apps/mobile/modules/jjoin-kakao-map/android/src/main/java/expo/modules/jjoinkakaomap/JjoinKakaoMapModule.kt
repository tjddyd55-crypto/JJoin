package expo.modules.jjoinkakaomap

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class JjoinKakaoMapModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("JjoinKakaoMap")

    View(JjoinKakaoMapView::class) {
      Events(
        "onMapReady",
        "onMapError",
        "onCameraChanged",
        "onMarkerPress",
      )

      Prop("initialLatitude") { view: JjoinKakaoMapView, value: Double ->
        view.initialLatitude = value
      }
      Prop("initialLongitude") { view: JjoinKakaoMapView, value: Double ->
        view.initialLongitude = value
      }
      Prop("initialZoomLevel") { view: JjoinKakaoMapView, value: Int ->
        view.initialZoomLevel = value
      }
      Prop("markersJson") { view: JjoinKakaoMapView, value: String? ->
        view.setMarkersJson(value.orEmpty())
      }

      AsyncFunction("animateCameraTo") { view: JjoinKakaoMapView, latitude: Double, longitude: Double, durationMs: Int ->
        view.animateCameraTo(latitude, longitude, durationMs)
      }

      AsyncFunction("getViewportBounds") { view: JjoinKakaoMapView ->
        view.getViewportBoundsMap()
      }

      OnViewDestroys<JjoinKakaoMapView> { view ->
        view.destroyMap()
      }
    }
  }
}
