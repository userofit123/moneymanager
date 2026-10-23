package app.moneymanager.android

import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

/** The lock on opening the app: fingerprint, face or the phone's screen lock (Android 9 and newer). */
class AppLock(private val act: AppCompatActivity, private val texts: Texts) {
    private val auth = BIOMETRIC_WEAK or DEVICE_CREDENTIAL

    fun available(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && BiometricManager.from(act).canAuthenticate(auth) == BiometricManager.BIOMETRIC_SUCCESS

    fun prompt(onOk: () -> Unit, onFail: () -> Unit) {
        val p = BiometricPrompt(act, ContextCompat.getMainExecutor(act), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onOk()
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = onFail()
        })
        p.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle(texts["lockTitle"])
                .setSubtitle(texts["lockSub"])
                .setAllowedAuthenticators(auth)
                .build()
        )
    }
}
