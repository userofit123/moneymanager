package app.moneymanager.android

import android.content.Context

/** The saved list of servers (in the app's private storage). */
class ServerStore(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("servers", Context.MODE_PRIVATE)

    @Volatile
    var state: ServerList = ServerList.fromJson(prefs.getString("state", null))
        private set

    @Synchronized
    fun save(next: ServerList) {
        state = next
        prefs.edit().putString("state", next.toJson()).apply()
    }
}
