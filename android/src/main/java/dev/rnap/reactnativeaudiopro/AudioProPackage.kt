package dev.rnap.reactnativeaudiopro

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AudioProPackage : ReactPackage {
	override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
		return listOf(AudioProModule(reactContext))
	}

	override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
		return emptyList()
	}
}
