package com.matisp6.tripify

import android.os.Build
import android.os.Bundle
import android.content.Intent // Dodaj ten import
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.FacebookSdk
import com.facebook.appevents.AppEventsLogger
import expo.modules.ReactActivityDelegateWrapper
import com.swmansion.reanimated.ReanimatedJSIModulePackage // Dodaj ten import
import com.facebook.react.bridge.JSIModulePackage // Dodaj ten import

class MainActivity : ReactActivity() {

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        (application as MainApplication).getCallbackManager().onActivityResult(requestCode, resultCode, data)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Ustawia motyw przed `onCreate` (wymagane dla `expo-splash-screen`)
        setTheme(R.style.AppTheme)
        super.onCreate(savedInstanceState)

        // Inicjalizuj Facebook SDK i aktywuj AppEventsLogger z kontekstem aplikacji
        FacebookSdk.sdkInitialize(applicationContext)
        AppEventsLogger.activateApp(applicationContext) // Aktywacja AppEventsLogger
    }

    /**
     * Funkcja do logowania zdarzenia niestandardowego `sentFriendRequest`.
     */
    fun logSentFriendRequestEvent() {
        val logger = AppEventsLogger.newLogger(this)
        logger.logEvent("sentFriendRequest")
    }

    /**
     * Zwraca nazwę głównego komponentu zarejestrowanego w JavaScript.
     */
    override fun getMainComponentName(): String = "main"

    /**
     * Zwraca instancję [ReactActivityDelegate]. Używamy [DefaultReactActivityDelegate]
     * co pozwala na włączenie New Architecture z flagą [fabricEnabled].
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {
                override fun getJSIModulePackage(): JSIModulePackage? {
                    return ReanimatedJSIModulePackage() // Dodaj ten override
                }
            }
        )
    }

    /**
     * Ustawia zachowanie przycisku Wstecz w zgodzie z Android S.
     */
    override fun invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                // Dla aktywności nie-root, użyj domyślnej implementacji, aby je zakończyć.
                super.invokeDefaultOnBackPressed()
            }
            return
        }
        // Domyślna implementacja przycisku Wstecz dla Android S.
        super.invokeDefaultOnBackPressed()
    }
}
