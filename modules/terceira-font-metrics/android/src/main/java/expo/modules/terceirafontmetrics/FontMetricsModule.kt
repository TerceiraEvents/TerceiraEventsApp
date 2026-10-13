package expo.modules.terceirafontmetrics

import android.util.TypedValue
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Converts current system SP sizes to DP without renderer metric caches. */
class FontMetricsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TerceiraFontMetrics")
    Function("scaledSize") { size: Double ->
      require(size.isFinite() && size >= 0)
      val metrics = requireNotNull(appContext.reactContext).resources.displayMetrics
      (TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, size.toFloat(), metrics) / metrics.density).toDouble()
    }
  }
}
