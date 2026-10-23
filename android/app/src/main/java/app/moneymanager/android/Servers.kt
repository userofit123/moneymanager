package app.moneymanager.android

import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.security.SecureRandom

/** One Money Manager server the app can show. [trust] is the fingerprint of a certificate the user trusted for it ("" when none). */
data class Server(val id: String, val name: String, val url: String, val trust: String = "")

/** The list of servers and which one is open (null when none was chosen yet). The same rules as desktop/servers.js. */
data class ServerList(val active: String? = null, val list: List<Server> = emptyList()) {
    fun current(): Server? = list.firstOrNull { it.id == active }

    fun add(name: String, url: String): Pair<ServerList, Server> {
        val u = normalizeUrl(url) ?: throw IllegalArgumentException("badAddress")
        if (list.any { it.url == u }) throw IllegalArgumentException("already")
        val host = URI(u).host
        val s = Server(newId(), name.trim().take(60).ifEmpty { host }, u)
        return copy(list = list + s) to s
    }

    fun remove(id: String): ServerList = copy(list = list.filter { it.id != id }, active = if (active == id) null else active)

    fun use(id: String): ServerList {
        if (list.none { it.id == id }) throw IllegalArgumentException("unknown")
        return copy(active = id)
    }

    fun trust(id: String, fingerprint: String): ServerList = copy(list = list.map { if (it.id == id) it.copy(trust = fingerprint) else it })

    fun toJson(): String = JSONObject()
        .put("active", active ?: JSONObject.NULL)
        .put("list", JSONArray(list.map { JSONObject().put("id", it.id).put("name", it.name).put("url", it.url).put("trust", it.trust) }))
        .toString()

    /** What the pages may see: no certificate details. */
    fun publicJson(): String = JSONObject()
        .put("active", active ?: JSONObject.NULL)
        .put("list", JSONArray(list.map { JSONObject().put("id", it.id).put("name", it.name).put("url", it.url) }))
        .toString()

    companion object {
        fun fromJson(text: String?): ServerList {
            if (text.isNullOrBlank()) return ServerList()
            return try {
                val j = JSONObject(text)
                val arr = j.optJSONArray("list") ?: JSONArray()
                val list = (0 until arr.length()).mapNotNull {
                    val o = arr.getJSONObject(it)
                    val u = normalizeUrl(o.optString("url")) ?: return@mapNotNull null
                    val id = o.optString("id")
                    if (id.isEmpty()) null else Server(id, o.optString("name", u).take(60), u, o.optString("trust", ""))
                }
                val active = j.optString("active", "").takeIf { a -> list.any { it.id == a } }
                ServerList(active, list)
            } catch (e: Exception) {
                ServerList()
            }
        }

        /** "money.home", "192.168.1.5:8080" or "https://Money.Example.com/x/" -> "https://money.home" (https unless told otherwise, just the address). */
        fun normalizeUrl(input: String?): String? {
            var s = (input ?: "").trim()
            if (s.isEmpty()) return null
            if (!Regex("^[a-zA-Z][a-zA-Z0-9+.-]*://").containsMatchIn(s)) s = "https://$s"
            return try {
                val u = URI(s)
                val scheme = u.scheme?.lowercase()
                val host = u.host?.lowercase()
                if ((scheme != "http" && scheme != "https") || host.isNullOrEmpty()) null
                else scheme + "://" + host + (if (u.port != -1) ":" + u.port else "")
            } catch (e: Exception) {
                null
            }
        }

        private fun newId(): String {
            val b = ByteArray(4)
            SecureRandom().nextBytes(b)
            return "s" + b.joinToString("") { "%02x".format(it) }
        }
    }
}
