package expo.modules.jjoinappexit

import android.os.Process
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Removes the app task and terminates the process so the next launcher tap is a true cold start.
 * Does not touch auth tokens or app storage.
 */
class JjoinAppExitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("JjoinAppExit")

    Function("exitCompletely") {
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.runOnUiThread {
          activity.finishAndRemoveTask()
          Process.killProcess(Process.myPid())
          System.exit(0)
        }
      } else {
        Process.killProcess(Process.myPid())
        System.exit(0)
      }
    }
  }
}
