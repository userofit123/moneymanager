package app.moneymanager.android

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** One alert from the server's inbox (see server/src/notify.js). */
data class Alert(val id: Long, val title: String, val body: String)

object Inbox {
    /** The answer of /api/inbox: the newest number and the alerts after the one asked for (null when it is not that). */
    fun parse(text: String): Pair<Long, List<Alert>>? = try {
        val j = JSONObject(text)
        val arr = j.getJSONArray("items")
        j.getLong("last") to (0 until arr.length()).map { arr.getJSONObject(it).let { o -> Alert(o.getLong("id"), o.optString("title", "Money"), o.optString("body", "")) } }
    } catch (e: Exception) {
        null
    }
}

/** Alerts on the phone: the app asks its server for new alerts from time to time (about every 15 minutes, also when the app is closed). */
class AlertsWorker(ctx: Context, p: WorkerParameters) : Worker(ctx, p) {
    override fun doWork(): Result {
        Alerts.check(applicationContext)
        return Result.success()
    }
}

object Alerts {
    private const val CHANNEL = "alerts"
    private const val WORK = "alerts"
    private fun prefs(ctx: Context) = ctx.getSharedPreferences("notif", Context.MODE_PRIVATE)

    fun enabled(ctx: Context) = prefs(ctx).getBoolean("on", false)

    /** The phone lets this app show notifications. */
    fun allowed(ctx: Context): Boolean =
        (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(ctx).areNotificationsEnabled()

    fun schedule(ctx: Context) {
        val work = PeriodicWorkRequestBuilder<AlertsWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, work)
    }

    fun checkNow(ctx: Context) {
        WorkManager.getInstance(ctx).enqueue(OneTimeWorkRequestBuilder<AlertsWorker>().build())
    }

    /** Turn on: remember where the server's inbox is now (so old alerts do not all arrive at once) and start asking. */
    fun enable(ctx: Context): Boolean {
        val s = ServerStore(ctx).state.current() ?: return false
        val got = fetch(ctx, "latest") ?: return false
        prefs(ctx).edit().putBoolean("on", true).putLong("last:" + s.id, got.first).apply()
        schedule(ctx)
        return true
    }

    fun disable(ctx: Context) {
        prefs(ctx).edit().putBoolean("on", false).apply()
        WorkManager.getInstance(ctx).cancelUniqueWork(WORK)
    }

    private fun client(ctx: Context, trust: String) = Net(ctx).client({ trust }, 30)

    private fun fetch(ctx: Context, since: String): Pair<Long, List<Alert>>? {
        val s = ServerStore(ctx).state.current() ?: return null
        return try {
            client(ctx, s.trust).newCall(Request.Builder().url(s.url + "/api/inbox?since=" + since).build()).execute().use { r ->
                if (r.code != 200) null else Inbox.parse(r.body?.string() ?: "")
            }
        } catch (e: Exception) {
            null
        }
    }

    /** Ask the server to put a test alert in the inbox. */
    fun sendTest(ctx: Context): Boolean {
        val s = ServerStore(ctx).state.current() ?: return false
        return try {
            client(ctx, s.trust).newCall(Request.Builder().url(s.url + "/api/inbox/test").header("X-Requested-With", "money").post("{}".toRequestBody("application/json".toMediaType())).build()).execute().use { it.code == 200 }
        } catch (e: Exception) {
            false
        }
    }

    fun check(ctx: Context) {
        if (!enabled(ctx) || !allowed(ctx)) return
        val s = ServerStore(ctx).state.current() ?: return
        val key = "last:" + s.id
        val last = prefs(ctx).getLong(key, -1)
        val got = fetch(ctx, if (last < 0) "latest" else last.toString()) ?: return
        if (last >= 0) got.second.forEach { show(ctx, it) }
        prefs(ctx).edit().putLong(key, got.first).apply()
    }

    private fun show(ctx: Context, a: Alert) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, Texts(ctx)["alertsChannel"], NotificationManager.IMPORTANCE_HIGH))
        }
        val open = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_notify)
            .setContentTitle(a.title)
            .setContentText(a.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(a.body))
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        try { nm.notify(a.id.toInt(), n) } catch (e: SecurityException) { /* the permission was taken away */ }
    }
}
