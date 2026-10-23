package app.moneymanager.android

import android.content.res.AssetManager
import android.net.Uri
import fi.iki.elonen.NanoHTTPD
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream

/** Where /api goes: the server's address and the client that reaches it. */
class Target(val url: String, val client: OkHttpClient)

/**
 * The app's own screens for a server: a small web server inside the app (127.0.0.1 only, never leaves the phone) serves the bundled screens and
 * passes every /api request on to the server, with the sign-in cookie kept by the app. The same idea as desktop/shellserver.js.
 */
class ShellServer(port: Int, private val assets: AssetManager, private val remote: () -> Target?) : NanoHTTPD("127.0.0.1", port) {

    override fun serve(session: IHTTPSession): Response =
        if (session.uri.startsWith("/api/")) proxy(session) else static(session)

    private fun status(code: Int): Response.IStatus =
        Response.Status.values().firstOrNull { it.requestStatus == code } ?: object : Response.IStatus {
            override fun getRequestStatus() = code
            override fun getDescription() = "$code Status"
        }

    private fun text(code: Int, body: String): Response = newFixedLengthResponse(status(code), "text/plain; charset=utf-8", body)

    // ---- the bundled screens ----
    private fun open(path: String): ByteArray? = try {
        assets.open(path).use { it.readBytes() }
    } catch (e: IOException) {
        null
    }

    private fun static(session: IHTTPSession): Response {
        val uri = session.uri.substringBefore('?')
        if (uri.contains("..")) return text(403, "no")
        val rel = uri.trimStart('/').ifEmpty { "index.html" }
        // the server list page is not part of the app's screens: it is the app's own file
        var bytes = if (rel == "servers.html") open("servers.html") else open("web/$rel")
        var path = rel
        if (bytes == null && !rel.substringAfterLast('/').contains('.') && !rel.startsWith("assets/")) {
            // an address that is not a file (/jars, /settings) opens the app, which shows that page
            bytes = open("web/index.html")
            path = "index.html"
        }
        if (bytes == null) return text(404, "not found")
        val r = newFixedLengthResponse(Response.Status.OK, mime(path), ByteArrayInputStream(bytes), bytes.size.toLong())
        r.addHeader("Cache-Control", if (path.startsWith("assets/")) "public, max-age=31536000, immutable" else "no-cache")
        r.addHeader("X-Content-Type-Options", "nosniff")
        return r
    }

    private fun mime(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html; charset=utf-8"
        "js", "mjs" -> "text/javascript; charset=utf-8"
        "css" -> "text/css; charset=utf-8"
        "json", "map" -> "application/json"
        "webmanifest" -> "application/manifest+json"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "webp" -> "image/webp"
        "ico" -> "image/x-icon"
        "woff2" -> "font/woff2"
        "woff" -> "font/woff"
        "ttf" -> "font/ttf"
        "txt" -> "text/plain; charset=utf-8"
        else -> "application/octet-stream"
    }

    // ---- the data requests ----
    private val skipRequest = setOf("host", "content-length", "connection", "accept-encoding", "upgrade-insecure-requests", "expect", "cookie", "transfer-encoding", "origin", "referer")
    private val skipResponse = setOf("content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie", "keep-alive")

    private fun body(session: IHTTPSession): ByteArray {
        val len = session.headers["content-length"]?.toLongOrNull() ?: 0L
        if (len <= 0) return ByteArray(0)
        val out = ByteArray(len.toInt())
        var read = 0
        val input = session.inputStream
        while (read < out.size) {
            val n = input.read(out, read, out.size - read)
            if (n < 0) break
            read += n
        }
        return out
    }

    private fun proxy(session: IHTTPSession): Response {
        val t = remote() ?: return text(503, "no server chosen")
        val query = session.queryParameterString?.takeIf { it.isNotEmpty() }?.let { "?$it" } ?: ""
        val req = Request.Builder().url(t.url + Uri.encode(session.uri, "/") + query)
        for ((k, v) in session.headers) if (k !in skipRequest && !k.startsWith("sec-")) req.header(k, v)
        req.header("origin", t.url)
        req.header("X-MM-Client", "apk/" + BuildConfig.VERSION_NAME)
        val method = session.method.name
        val data = if (method == "GET" || method == "HEAD") null else body(session)
        req.method(method, data?.toRequestBody(session.headers["content-type"]?.toMediaTypeOrNull()))
        return try {
            // a live connection (/api/events) has no end: it must not time out while it waits
            val client = if (session.uri == "/api/events") t.client.newBuilder().readTimeout(0, java.util.concurrent.TimeUnit.SECONDS).build() else t.client
            val resp = client.newCall(req.build()).execute()
            val stream: InputStream = resp.body?.byteStream() ?: ByteArrayInputStream(ByteArray(0))
            val r = newChunkedResponse(status(resp.code), resp.header("content-type") ?: "application/octet-stream", stream)
            for (name in resp.headers.names()) if (name.lowercase() !in skipResponse) for (v in resp.headers.values(name)) r.addHeader(name, v)
            r
        } catch (e: IOException) {
            // the server cannot be reached: the app's service worker then answers with the last saved copy (as when offline)
            text(502, "the server cannot be reached")
        }
    }
}
