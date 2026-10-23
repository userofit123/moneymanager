package app.moneymanager.android

import android.content.Context
import org.json.JSONObject
import java.util.Locale

/** The words of the app's own windows (shell-texts.json, made from desktop/texts.js by scripts/android-assets.mjs), in the phone's language. */
class Texts(ctx: Context) {
    private val all = JSONObject(ctx.assets.open("shell-texts.json").bufferedReader().use { it.readText() })
    val lang: String = if (Locale.getDefault().language == "he" || Locale.getDefault().language == "iw") "he" else "en"
    val json: JSONObject = all.getJSONObject(lang)

    operator fun get(key: String): String = json.optString(key, key)

    fun fill(key: String, vararg pairs: Pair<String, String>): String {
        var s = get(key)
        for ((k, v) in pairs) s = s.replace("{$k}", v)
        return s
    }
}
