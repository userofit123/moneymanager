package app.moneymanager.android

import android.content.Context
import android.util.Base64
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

/** The sign-in cookie of the server, kept on the phone (the server's page never sees it, only this app does). */
class PrefsCookieJar(ctx: Context) : CookieJar {
    private val prefs = ctx.getSharedPreferences("cookies", Context.MODE_PRIVATE)
    private val store = mutableMapOf<String, MutableList<Cookie>>()

    init {
        try {
            val arr = JSONArray(prefs.getString("all", "[]"))
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val b = Cookie.Builder().name(o.getString("n")).value(o.getString("v")).expiresAt(o.getLong("e")).path(o.getString("p"))
                if (o.getBoolean("h")) b.hostOnlyDomain(o.getString("d")) else b.domain(o.getString("d"))
                if (o.getBoolean("s")) b.secure()
                if (o.getBoolean("o")) b.httpOnly()
                store.getOrPut(o.getString("host")) { mutableListOf() }.add(b.build())
            }
        } catch (e: Exception) {
            store.clear()
        }
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val list = store.getOrPut(url.host) { mutableListOf() }
        for (c in cookies) {
            list.removeAll { it.name == c.name && it.domain == c.domain && it.path == c.path }
            if (c.expiresAt > System.currentTimeMillis()) list.add(c)
        }
        persist()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val list = store[url.host] ?: return emptyList()
        list.removeAll { it.expiresAt < System.currentTimeMillis() }
        return list.filter { it.matches(url) }
    }

    /** Forget the sign-in (when a server is removed). */
    @Synchronized
    fun clear(host: String) {
        store.remove(host)
        persist()
    }

    private fun persist() {
        val arr = JSONArray()
        for ((host, list) in store) for (c in list) {
            arr.put(JSONObject().put("host", host).put("n", c.name).put("v", c.value).put("e", c.expiresAt).put("d", c.domain).put("p", c.path).put("s", c.secure).put("o", c.httpOnly).put("h", c.hostOnly))
        }
        prefs.edit().putString("all", arr.toString()).apply()
    }
}

/** Reaching the servers: the phone's own trust, plus the one certificate the user pinned for a server. */
class Net(ctx: Context) {
    val jar = PrefsCookieJar(ctx)

    /** The last certificate the phone did not trust (and that was not pinned): the add flow shows it to the user. */
    @Volatile
    var lastBad: X509Certificate? = null

    private fun systemTrust(): X509TrustManager {
        val f = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        f.init(null as KeyStore?)
        return f.trustManagers.filterIsInstance<X509TrustManager>().first()
    }

    /** A client for one server. trusted(): the fingerprint pinned for it, or "". */
    fun client(trusted: () -> String, readTimeoutSec: Long = 60): OkHttpClient {
        val sys = systemTrust()
        val tm = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = sys.checkClientTrusted(chain, authType)
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
                try {
                    sys.checkServerTrusted(chain, authType)
                } catch (e: CertificateException) {
                    if (trusted().isNotEmpty() && fingerprint(chain[0]) == trusted()) return
                    lastBad = chain[0]
                    throw e
                }
            }
            override fun getAcceptedIssuers(): Array<X509Certificate> = sys.acceptedIssuers
        }
        val ssl = SSLContext.getInstance("TLS")
        ssl.init(null, arrayOf(tm), null)
        val hv = HostnameVerifier { host, session ->
            HttpsURLConnection.getDefaultHostnameVerifier().verify(host, session) ||
                (trusted().isNotEmpty() && (session.peerCertificates.firstOrNull() as? X509Certificate)?.let { fingerprint(it) == trusted() } == true)
        }
        return OkHttpClient.Builder()
            .sslSocketFactory(ssl.socketFactory, tm)
            .hostnameVerifier(hv)
            .cookieJar(jar)
            .followRedirects(false)
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(readTimeoutSec, TimeUnit.SECONDS)
            .build()
    }

    /** What the server says about itself (read only, nothing secret is sent): any certificate is accepted for this one request. */
    fun info(url: String): Info? {
        val all = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        }
        val ssl = SSLContext.getInstance("TLS")
        ssl.init(null, arrayOf(all), null)
        val c = OkHttpClient.Builder().sslSocketFactory(ssl.socketFactory, all).hostnameVerifier { _, _ -> true }.connectTimeout(6, TimeUnit.SECONDS).readTimeout(6, TimeUnit.SECONDS).build()
        return try {
            c.newCall(Request.Builder().url("$url/api/auth/status").build()).execute().use { r -> if (r.isSuccessful) Info.parse(r.body?.string() ?: "") else null }
        } catch (e: Exception) {
            null
        }
    }

    companion object {
        /** "sha256/<base64>" of a certificate: the form the desktop app keeps too. */
        fun fingerprint(c: X509Certificate): String = "sha256/" + Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(c.encoded), Base64.NO_WRAP)
    }
}
