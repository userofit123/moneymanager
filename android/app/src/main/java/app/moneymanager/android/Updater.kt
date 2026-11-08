package app.moneymanager.android

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Updating the app itself from its GitHub release: downloads the new APK into the app's cache (with a notification that shows
 * how far it got, so leaving the app does not hide it), checks it is this app and the version asked for, and hands it to
 * Android's installer, which always asks the person to confirm. The ready file is remembered, so after the app is closed
 * Settings still offers Install instead of downloading again.
 */
object Updater {
    private const val CHANNEL = "updates"
    private const val ID = 7005
    private const val PREFS = "updater"
    private const val PREFIX = "money-manager-update"
    // the start of every download address: github.com/<owner>/<project>/releases/download (frontend/src/lib/downloads.js)
    private val RELEASES = listOf("userofit123", "moneymanager", "releases", "download")
    // the person's choices (Settings → Version and updates), kept apart from the ready file's record, which is cleared often
    private const val CHOICES = "updater-choices"

    // a download is running; each download has its own number, so a stopped or replaced one never touches a newer one's file
    private val downloading = AtomicBoolean(false)
    private val gen = AtomicLong(0)
    // the running download, so a page opened again (or reloaded) mid-way can show its progress and wait for its end
    @Volatile private var runVersion = ""
    @Volatile private var runDone = 0L
    @Volatile private var runTotal = -1L
    @Volatile private var lastError = ""
    private val ended = Object()

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    @Suppress("DEPRECATION")
    private fun code(pi: PackageInfo): Long = if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else pi.versionCode.toLong()

    private fun installedCode(ctx: Context): Long = try { code(ctx.packageManager.getPackageInfo(ctx.packageName, 0)) } catch (e: Exception) { Long.MAX_VALUE }

    /** The file at [path] is this app, version [version], and newer than the one installed. */
    private fun fits(ctx: Context, path: String, version: String): Boolean {
        val pi = ctx.packageManager.getPackageArchiveInfo(path, 0) ?: return false
        return pi.packageName == ctx.packageName && pi.versionName == version && code(pi) > installedCode(ctx)
    }

    /** The version downloaded earlier and still ready to install, or "" (anything else is deleted and forgotten). */
    fun staged(ctx: Context): String {
        val sp = prefs(ctx)
        val path = sp.getString("path", null)
        val version = sp.getString("version", null)
        if (downloading.get()) return ""
        if (path != null && version != null && File(path).isFile && fits(ctx, path, version)) return version
        if (path != null) File(path).delete()
        sp.edit().clear().apply()
        return ""
    }

    /** The ready version (see [staged]) and, while a download runs, its version and how far it got. */
    fun state(ctx: Context): org.json.JSONObject {
        val o = org.json.JSONObject().put("staged", staged(ctx))
        if (downloading.get()) o.put("running", runVersion).put("done", runDone).put("total", runTotal)
        return o
    }

    /** Waits for the running download to end: the ready version, or throws with its short code (as [download] does). */
    fun await(ctx: Context): String {
        synchronized(ended) { while (downloading.get()) ended.wait(1000) }
        val v = staged(ctx)
        if (v.isEmpty()) throw IllegalStateException(lastError.ifEmpty { "updFailed" })
        return v
    }

    private fun end(error: String) {
        lastError = error
        synchronized(ended) { ended.notifyAll() }
    }

    /** Download updates automatically, and only on Wi-Fi: on unless the person turned them off. */
    fun choices(ctx: Context): org.json.JSONObject {
        val sp = ctx.getSharedPreferences(CHOICES, Context.MODE_PRIVATE)
        return org.json.JSONObject().put("auto", sp.getBoolean("auto", true)).put("wifiOnly", sp.getBoolean("wifiOnly", true))
    }

    fun setChoices(ctx: Context, auto: Boolean, wifiOnly: Boolean): org.json.JSONObject {
        ctx.getSharedPreferences(CHOICES, Context.MODE_PRIVATE).edit().putBoolean("auto", auto).putBoolean("wifiOnly", wifiOnly).apply()
        return choices(ctx)
    }

    /** The connection now is metered (mobile data, or a Wi-Fi Android counts as metered, like a phone's hotspot). */
    fun metered(ctx: Context): Boolean {
        val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return true
        return cm.isActiveNetworkMetered
    }

    /** [url] is a file of this project's own GitHub releases, read the way OkHttp reads it (so "../" cannot lead elsewhere). */
    private fun ownRelease(url: String): Boolean {
        val u = url.toHttpUrlOrNull() ?: return false
        return u.isHttps && u.host == "github.com" && u.pathSegments.size > RELEASES.size && u.pathSegments.take(RELEASES.size) == RELEASES
    }

    /** The ready file is out of date (a newer version exists): deleted and forgotten. Never while a download writes. */
    fun forget(ctx: Context) {
        if (downloading.get()) return
        prefs(ctx).getString("path", null)?.let { File(it).delete() }
        prefs(ctx).edit().clear().apply()
    }

    /** The app is closed during a download: it stops, and its notification goes with it. */
    fun stop(ctx: Context) {
        if (downloading.getAndSet(false)) {
            gen.incrementAndGet()
            NotificationManagerCompat.from(ctx).cancel(ID)
            end("updFailed")
        }
    }

    private fun notice(ctx: Context, title: String, text: String, pct: Int, busy: Boolean) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            // low importance: a bar that moves every second must not sound or pop up
            nm.createNotificationChannel(NotificationChannel(CHANNEL, Texts(ctx)["updChannel"], NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
        }
        val open = PendingIntent.getActivity(ctx, 3, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val b = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(if (busy) android.R.drawable.stat_sys_download else R.drawable.ic_notify)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(busy)
            .setAutoCancel(!busy)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(open)
        // if Android ends the app without warning, nothing is left behind claiming a download that stopped
        if (busy) b.setProgress(100, maxOf(0, pct), pct < 0).setTimeoutAfter(120_000)
        try { NotificationManagerCompat.from(ctx).notify(ID, b.build()) } catch (e: SecurityException) { /* notifications not allowed */ }
    }

    /**
     * Downloads [url] (the APK of [version]) and waits until it is done. [progress] gets the bytes so far and the size (-1 when
     * unknown), at most four times a second. Throws with a short code the page turns into words: updBusy, updDamaged, updFailed.
     */
    fun download(ctx: Context, url: String, version: String, progress: (Long, Long) -> Unit) {
        // only this project's own releases (frontend/src/lib/downloads.js); GitHub then sends the file from its download servers
        if (!ownRelease(url)) throw IllegalArgumentException("updFailed")
        if (!downloading.compareAndSet(false, true)) throw IllegalStateException("updBusy")
        val my = gen.incrementAndGet()
        runVersion = version; runDone = 0L; runTotal = -1L; lastError = ""
        val t = Texts(ctx)
        val title = t.fill("updNotifDownloading", "v" to version)
        prefs(ctx).edit().clear().apply()
        ctx.cacheDir.listFiles { _, n -> n.startsWith(PREFIX) && n.endsWith(".apk") }?.forEach { it.delete() }
        val out = File(ctx.cacheDir, "$PREFIX-$my.apk")
        notice(ctx, title, "", -1, true)
        try {
            val client = OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(60, TimeUnit.SECONDS).followRedirects(true).build()
            client.newCall(Request.Builder().url(url).build()).execute().use { resp ->
                if (!resp.isSuccessful) throw IllegalStateException("updFailed")
                val body = resp.body ?: throw IllegalStateException("updFailed")
                val total = body.contentLength()
                var done = 0L
                var last = 0L
                var lastNotice = 0L
                body.byteStream().use { inp ->
                    out.outputStream().use { fo ->
                        val buf = ByteArray(65536)
                        while (true) {
                            val n = inp.read(buf)
                            if (n <= 0) break
                            if (gen.get() != my) throw InterruptedException("closed")
                            fo.write(buf, 0, n)
                            done += n
                            runDone = done; runTotal = total
                            val now = System.currentTimeMillis()
                            if (now - last >= 250) { last = now; progress(done, total) }
                            // Android drops notification updates that come faster than once a second
                            if (now - lastNotice >= 1000) {
                                lastNotice = now
                                if (total > 0) { val p = (done * 100 / total).toInt(); notice(ctx, title, "$p%", p, true) }
                                else notice(ctx, title, String.format(java.util.Locale.ROOT, "%.1f MB", done / 1e6), -1, true)
                            }
                        }
                    }
                }
                progress(done, total)
            }
            if (gen.get() != my) throw InterruptedException("closed")
            if (!fits(ctx, out.absolutePath, version)) throw SecurityException("updDamaged")
            prefs(ctx).edit().putString("path", out.absolutePath).putString("version", version).apply()
            if (gen.compareAndSet(my, my + 1)) { downloading.set(false); end("") }
            notice(ctx, t["updNotifReady"], t["updNotifReadyD"], 0, false)
        } catch (e: InterruptedException) {
            out.delete()
            throw IllegalStateException("updFailed")
        } catch (e: Exception) {
            out.delete()
            // false: the app was closed (or a newer download took over) and the notification is already gone
            val code = if (e is SecurityException) "updDamaged" else "updFailed"
            if (gen.compareAndSet(my, my + 1)) { downloading.set(false); end(code); notice(ctx, t["updNotifFailed"], t["updNotifFailedD"], 0, false) }
            throw IllegalStateException(code)
        }
    }

    /** Opens Android's installer for the ready file. The first time, Android asks to allow this app to install updates. */
    fun install(ctx: Context) {
        val path = prefs(ctx).getString("path", null)
        if (path == null || !File(path).isFile) throw IllegalStateException("updFailed")
        if (!ctx.packageManager.canRequestPackageInstalls()) {
            ctx.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            throw IllegalStateException("updAllow")
        }
        val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".fileprovider", File(path))
        ctx.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
        NotificationManagerCompat.from(ctx).cancel(ID)
        // the file stays remembered: backing out of Android's installer still leaves Install; once the new version runs, staged() forgets it
    }
}
