package com.matisp6.tripify

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.facebook.CallbackManager;
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

package com.matisp6.tripify

import android.app.Application
import com.facebook.CallbackManager
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

    // Dodajemy callbackManager
    private val callbackManager: CallbackManager = CallbackManager.Factory.create()

    override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                return PackageList(this).packages
            }

            override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }
    )

    override val reactHost: ReactHost
        get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            load()
        }
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    // Dodajemy getter dla callbackManager
    fun getCallbackManager(): CallbackManager {
        return callbackManager
    }
}
