package work.papelon.todotube;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MainTest {
    @Test
    void acceptsOnlyElevenCharacterYoutubeVideoIds() {
        assertTrue(Main.validVideoId("dQw4w9WgXcQ"));
        assertFalse(Main.validVideoId("short"));
        assertFalse(Main.validVideoId("dQw4w9WgXcQ/other"));
        assertFalse(Main.validVideoId("dQw4w9WgXcQ?x=1"));
        assertFalse(Main.validVideoId(null));
    }
}
