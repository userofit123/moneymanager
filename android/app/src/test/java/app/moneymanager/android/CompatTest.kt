package app.moneymanager.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CompatTest {
    @Test fun parsesTheStatus() {
        val i = Info.parse("""{"version":"0.12.5","api":1,"apiMin":1}""")!!
        assertEquals(Info("0.12.5", 1, 1), i)
        assertEquals(Info("0.12.4", null, null), Info.parse("""{"version":"0.12.4"}"""))
        assertNull(Info.parse("<html>"))
    }

    @Test fun fitsByLevel() {
        assertTrue(Compat.fits(Info("0.12.5", 1, 1)))
        assertTrue(Compat.fits(Info("0.13.0", 2, 1)))
        assertFalse(Compat.fits(Info("0.13.0", 2, 2)))     // the server dropped what these screens send
        assertFalse(Compat.fits(Info("0.12.5", 1, 1), minServer = 2))   // the screens need a newer server
        assertFalse(Compat.fits(null))
    }

    @Test fun oldServersCountAsLevelOne() {
        assertTrue(Compat.fits(Info("0.12.2", null, null)))
        assertFalse(Compat.fits(Info("0.11.0", null, null)))
        assertFalse(Compat.fits(Info("", null, null)))
    }
}
