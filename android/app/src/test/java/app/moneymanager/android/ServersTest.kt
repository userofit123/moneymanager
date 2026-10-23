package app.moneymanager.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class ServersTest {
    private fun fails(msg: String, f: () -> Unit) {
        try { f(); fail("expected $msg") } catch (e: IllegalArgumentException) { assertEquals(msg, e.message) }
    }

    @Test fun addressesAreCleaned() {
        assertEquals("https://money.home", ServerList.normalizeUrl("money.home"))
        assertEquals("https://192.168.1.5:8080", ServerList.normalizeUrl("192.168.1.5:8080"))
        assertEquals("https://money.example.com", ServerList.normalizeUrl("https://Money.Example.com/x/"))
        assertEquals("http://10.0.2.2:18601", ServerList.normalizeUrl("http://10.0.2.2:18601"))
        assertNull(ServerList.normalizeUrl(""))
        assertNull(ServerList.normalizeUrl("ftp://money.home"))
    }

    @Test fun addUseRemove() {
        val (a, s) = ServerList().add("  Home  ", "money.home")
        assertEquals("Home", s.name)
        assertNull(a.active)
        val b = a.use(s.id)
        assertEquals(s, b.current())
        assertNull(b.remove(s.id).active)
        fails("already") { b.add("Again", "https://money.home/") }
        fails("badAddress") { b.add("x", "ftp://x") }
        fails("unknown") { b.use("nope") }
    }

    @Test fun nameDefaultsToTheAddress() {
        assertEquals("money.home", ServerList().add("", "money.home").second.name)
    }

    @Test fun savedListSurvivesAndHidesTheCertificate() {
        val (a, s) = ServerList().add("Home", "money.home")
        val t = a.use(s.id).trust(s.id, "sha256/abc")
        val back = ServerList.fromJson(t.toJson())
        assertEquals("sha256/abc", back.current()?.trust)
        assertFalse(t.publicJson().contains("sha256"))
        assertTrue(ServerList.fromJson("not json").list.isEmpty())
        assertTrue(ServerList.fromJson(null).list.isEmpty())
    }
}
