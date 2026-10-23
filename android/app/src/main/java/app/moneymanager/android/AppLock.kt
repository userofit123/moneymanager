package app.moneymanager.android

import android.app.KeyguardManager
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

/**
 * The lock on opening the app: fingerprint, face or the phone's screen lock.
 * Android 11 and newer ask for "biometric or screen lock" in one window. Older phones cannot combine them: they ask for the fingerprint or face
 * and offer the screen lock as a second choice (the phone's own confirm-your-PIN window).
 */
class AppLock(private val act: AppCompatActivity, private val texts: Texts) {
    private val combined = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
    private val keyguard get() = act.getSystemService(AppCompatActivity.KEYGUARD_SERVICE) as KeyguardManager
    private val biometric get() = BiometricManager.from(act).canAuthenticate(BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS

    /** The phone has something to unlock with. */
    fun available(): Boolean =
        if (combined) BiometricManager.from(act).canAuthenticate(BIOMETRIC_WEAK or DEVICE_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS
        else biometric || keyguard.isDeviceSecure

    fun prompt(onOk: () -> Unit, onFail: () -> Unit) {
        when {
            combined -> ask(BIOMETRIC_WEAK or DEVICE_CREDENTIAL, null, onOk, onFail)
            biometric -> ask(BIOMETRIC_WEAK, if (keyguard.isDeviceSecure) texts["lockUseScreen"] else texts["lockCancel"], onOk, onFail, onNegative = { if (keyguard.isDeviceSecure) screenLock(onOk, onFail) else onFail() })
            else -> screenLock(onOk, onFail)
        }
    }

    private fun screenLock(onOk: () -> Unit, onFail: () -> Unit) {
        @Suppress("DEPRECATION")
        val intent = keyguard.createConfirmDeviceCredentialIntent(texts["lockTitle"], texts["lockSub"])
        if (intent == null) onFail() else (act as? MainActivity)?.confirmScreenLock(intent, onOk, onFail) ?: onFail()
    }

    private fun ask(auth: Int, negative: String?, onOk: () -> Unit, onFail: () -> Unit, onNegative: () -> Unit = {}) {
        val p = BiometricPrompt(act, ContextCompat.getMainExecutor(act), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onOk()
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) onNegative() else onFail()
            }
        })
        val info = BiometricPrompt.PromptInfo.Builder().setTitle(texts["lockTitle"]).setSubtitle(texts["lockSub"]).setAllowedAuthenticators(auth)
        if (negative != null) info.setNegativeButtonText(negative)
        p.authenticate(info.build())
    }
}
