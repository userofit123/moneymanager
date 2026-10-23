package app.moneymanager.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class InboxTest {
    @Test fun readsTheAlertsAfterTheLastOne() {
        val got = Inbox.parse("""{"last":7,"items":[{"id":6,"at":"x","title":"Money","body":"a"},{"id":7,"title":"Money · sync failed","body":"b"}]}""")!!
        assertEquals(7L, got.first)
        assertEquals(listOf(Alert(6, "Money", "a"), Alert(7, "Money · sync failed", "b")), got.second)
    }

    @Test fun onlyTheNumberWhenAsked() {
        assertEquals(3L to emptyList<Alert>(), Inbox.parse("""{"last":3,"items":[]}"""))
    }

    @Test fun otherAnswersAreNotAnInbox() {
        assertNull(Inbox.parse("<html>"))
        assertNull(Inbox.parse("""{"error":"x"}"""))
    }
}
