package app.moneymanager.android

import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors

/** What the pages (the server list, Settings) may ask of the app. Every call answers later, with window.__mm(id, ok, json). */
class Bridge(private val act: MainActivity) {
    private val exec = Executors.newCachedThreadPool()

    @JavascriptInterface
    fun version(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun setBars(bg: String, dark: Boolean) { if (act.isOwnPage()) act.runOnUiThread { act.setBars(bg, dark) } }

    @JavascriptInterface
    fun open(url: String) { if (act.isOwnPage()) act.runOnUiThread { act.openExternal(url) } }

    @JavascriptInterface
    fun invoke(id: Int, method: String, args: String) {
        // a page from a server (shown when its version does not fit) is not given these powers
        if (!act.isOwnPage()) { act.runOnUiThread { act.web.evaluateJavascript("window.__mm($id,false,${JSONObject.quote("{\"error\":\"no\"}")})", null) }; return }
        exec.execute {
            var ok = true
            val out = try {
                run(method, JSONArray(args))
            } catch (e: Exception) {
                ok = false
                JSONObject().put("error", e.message ?: "error").toString()
            }
            act.runOnUiThread { act.web.evaluateJavascript("window.__mm($id,$ok,${JSONObject.quote(out)})", null) }
        }
    }

    private fun stateJson(): String = JSONObject(act.store.state.publicJson()).put("noLocal", true).toString()

    private fun run(method: String, a: JSONArray): String = when (method) {
        "texts" -> act.texts.json.toString()
        "state" -> stateJson()
        "add" -> add(a.optString(0), a.optString(1))
        "use" -> {
            act.store.save(act.store.state.use(a.getString(0)))
            act.runOnUiThread { act.route() }
            "null"
        }
        "remove" -> {
            val s = act.store.state.list.firstOrNull { it.id == a.getString(0) }
            val wasOpen = act.store.state.active == a.getString(0)
            act.store.save(act.store.state.remove(a.getString(0)))
            if (s != null) act.net.jar.clear(java.net.URI(s.url).host)
            if (wasOpen) act.runOnUiThread { act.route() }
            stateJson()
        }
        "close" -> {
            act.runOnUiThread { act.route() }
            "null"
        }
        "lock" -> JSONObject().put("available", act.lock.available()).put("enabled", act.lockEnabled).put("delay", act.lockDelay).toString()
        "setLock" -> {
            val on = a.getBoolean(0)
            if (on && !act.lock.available()) throw IllegalStateException("lockNone")
            if (!a.isNull(1)) act.lockDelay = a.getInt(1)
            act.changeLock(on)
            JSONObject().put("available", act.lock.available()).put("enabled", act.lockEnabled).put("delay", act.lockDelay).toString()
        }
        else -> throw IllegalArgumentException("unknown")
    }

    // Check that an address answers and is a Money Manager; a certificate the phone does not know is shown to the user (its fingerprint) once.
    private fun add(name: String, url: String): String {
        val (next, srv) = try {
            act.store.state.add(name, url)
        } catch (e: IllegalArgumentException) {
            return JSONObject().put("error", e.message).toString()
        }
        var trust = ""
        act.net.lastBad = null
        var r = reach(srv.url) { trust }
        val bad = act.net.lastBad
        if (r == "unreachable" && bad != null) {
            val fp = Net.fingerprint(bad)
            if (!act.askTrust(java.net.URI(srv.url).host, fp)) return JSONObject().put("error", "certNo").toString()
            trust = fp
            r = reach(srv.url) { trust }
        }
        if (r != "ok") return JSONObject().put("error", r).toString()
        val saved = if (trust.isNotEmpty()) next.trust(srv.id, trust) else next
        act.store.save(saved)
        return JSONObject().put("ok", true).put("id", srv.id).put("state", JSONObject(stateJson())).toString()
    }

    private fun reach(url: String, trusted: () -> String): String = try {
        val c = act.net.client(trusted, 8)
        c.newCall(okhttp3.Request.Builder().url("$url/api/auth/status").build()).execute().use { resp ->
            val j = try { JSONObject(resp.body?.string() ?: "") } catch (e: Exception) { null }
            if (j != null && j.has("setup")) "ok" else "notMoney"
        }
    } catch (e: Exception) {
        "unreachable"
    }

    companion object {
        /** The page-side half: Promise wrappers (installed in every page of the app's own address). */
        const val SHIM = """
(function () {
  var n = window.mmNative; if (!n || window.__mmReady) return; window.__mmReady = true;
  var next = 1, wait = {};
  window.__mm = function (id, ok, text) {
    var w = wait[id]; delete wait[id]; if (!w) return;
    try { var v = text ? JSON.parse(text) : null; if (ok) w[0](v); else w[1](new Error((v && v.error) || "error")); } catch (e) { w[1](e); }
  };
  var call = function (m) { var a = Array.prototype.slice.call(arguments, 1); return new Promise(function (res, rej) { var id = next++; wait[id] = [res, rej]; n.invoke(id, m, JSON.stringify(a)); }); };
  var servers = {
    state: function () { return call("state"); },
    add: function (name, url) { return call("add", name, url); },
    use: function (id) { return call("use", id); },
    remove: function (id) { return call("remove", id); }
  };
  window.servers = Object.assign({ texts: function () { return call("texts"); }, close: function () { return call("close"); } }, servers);
  window.desktopServers = servers;
  window.mmApp = {
    version: n.version(),
    lock: function () { return call("lock"); },
    setLock: function (on, delay) { return call("setLock", !!on, delay); },
    setBars: function (bg, dark) { n.setBars(String(bg), !!dark); },
    open: function (url) { n.open(String(url)); }
  };
})();
"""
    }
}
