package app.moneymanager.android

import org.json.JSONObject

/** What a server says about itself in its sign-in status (null fields: it did not say). */
data class Info(val version: String, val api: Int?, val apiMin: Int?) {
    companion object {
        fun parse(text: String): Info? = try {
            val j = JSONObject(text)
            Info(j.optString("version", ""), if (j.has("api")) j.optInt("api") else null, if (j.has("apiMin")) j.optInt("apiMin") else null)
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Whether these screens fit a server, by API level (see server/src/apilevel.js and desktop/compat.js; the same numbers).
 * LEVEL: the API level these screens speak. MIN_SERVER: the oldest server level they work with.
 */
object Compat {
    const val LEVEL = 1
    const val MIN_SERVER = 1

    /** A server that does not say its level (0.12.1 to 0.12.4) is level 1 when of the 0.12 line; one that does not say its version is not known. */
    fun legacyLevel(version: String): Int = if (Regex("^0\\.12\\.\\d+$").matches(version)) 1 else 0

    fun fits(info: Info?, level: Int = LEVEL, minServer: Int = MIN_SERVER): Boolean {
        if (info == null) return false
        val server = info.api ?: legacyLevel(info.version)
        val min = info.apiMin ?: 1
        return server >= minServer && level >= min
    }
}
