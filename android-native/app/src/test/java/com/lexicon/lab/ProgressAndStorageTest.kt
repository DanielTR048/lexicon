package com.lexicon.lab

import java.time.LocalDate
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ProgressAndStorageTest {
    private val words = listOf(WordEntry("Átomo", "Matéria"), WordEntry("Luz", "Radiação"), WordEntry("Tesla", "Inventor"), WordEntry("Curie", "Cientista"))
    private fun session(mode: GameMode = GameMode.FREE) = GameSession("science", PuzzleEngine.generate(words, Difficulty.EASY, "storage"), mode = mode, day = "2026-10-03")
    private fun complete(profile: Profile, initial: GameSession): Pair<Profile, GameSession> = initial.puzzle.placements.fold(profile to initial) { (p, s), word -> ProgressRules.discover(p, s, word, "Ciência") }

    @Test fun completingAndReloadingCannotAwardXpTwice() {
        val (profile, session) = complete(Profile(), session())
        assertEquals(275, profile.xp)
        assertEquals(1, profile.wins)
        assertEquals(4, profile.words)
        assertTrue(profile.achievements.containsAll(setOf("first", "nohint")))
        val restored = StoreCodec.decode(StoreCodec.encode(SavedGame(profile = profile, session = session)))
        val duplicate = ProgressRules.discover(restored.profile, restored.session!!, restored.session.puzzle.placements.first(), "Ciência")
        assertEquals(profile, duplicate.first)
        assertEquals(session, duplicate.second)
    }

    @Test fun dailyBonusIsAwardedOncePerCalendarDate() {
        val (firstProfile, completed) = complete(Profile(), session(GameMode.DAILY))
        assertEquals(425, firstProfile.xp)
        assertEquals(setOf("2026-10-03"), firstProfile.dailyDays)
        assertEquals(425, completed.earnedXP)
        val (secondProfile, repeated) = complete(firstProfile, session(GameMode.DAILY))
        assertEquals(firstProfile.xp, secondProfile.xp)
        assertEquals(firstProfile.wins, secondProfile.wins)
        assertEquals(0, repeated.earnedXP)
    }

    @Test fun findingSameWordAgainDoesNotIncrementStatistics() {
        val initial = session()
        val first = ProgressRules.discover(Profile(), initial, initial.puzzle.placements.first(), "Ciência")
        assertEquals(first, ProgressRules.discover(first.first, first.second, initial.puzzle.placements.first(), "Ciência"))
    }

    @Test fun processRestorationKeepsBoardHintsFavoritesAndPartialProgress() {
        val (profile, partial) = ProgressRules.discover(Profile(), session(), session().puzzle.placements.first(), "Ciência")
        val hinted = partial.puzzle.placements[1]
        val saved = SavedGame(profile, Settings(sound = true, haptics = false, reduceMotion = true), setOf("science"),
            partial.copy(seconds = 73, hintsUsed = 1, hintedWords = setOf(hinted.normalized), hintCell = hinted.cells.first(), paused = true, score = 25), Difficulty.HARD)
        assertEquals(saved, StoreCodec.decode(StoreCodec.encode(saved)))
    }

    @Test fun invalidSessionIsDiscardedWithoutLosingProfile() {
        val json = JSONObject(StoreCodec.encode(SavedGame(profile = Profile(xp = 500), session = session())))
        json.getJSONObject("session").put("grid", listOf("WRONG"))
        val restored = StoreCodec.decode(json.toString())
        assertEquals(500, restored.profile.xp)
        assertNull(restored.session)
        assertEquals(SavedGame(), StoreCodec.decode("not json"))
        assertEquals(SavedGame(), StoreCodec.decode("{\"version\":99}"))
    }

    @Test fun tamperedFoundCoordinatesCannotMarkWordFound() {
        val (profile, partial) = ProgressRules.discover(Profile(), session(), session().puzzle.placements.first(), "Ciência")
        val json = JSONObject(StoreCodec.encode(SavedGame(profile = profile, session = partial)))
        json.getJSONObject("session").getJSONObject("found").put(partial.found.keys.first(), org.json.JSONArray().put(JSONObject().put("row", -1).put("col", 200)))
        val restored = StoreCodec.decode(json.toString())
        assertNotNull(restored.session)
        assertTrue(restored.session!!.found.isEmpty())
    }

    @Test fun streakAllowsTodayOrYesterdayAndStopsAtGap() {
        val profile = Profile(dailyDays = setOf("2026-10-01", "2026-10-02", "2026-09-29"))
        assertEquals(2, profile.streak(LocalDate.parse("2026-10-03")))
        assertEquals(0, profile.streak(LocalDate.parse("2026-10-04")))
        assertEquals(2, profile.streak(LocalDate.parse("2026-10-02")))
    }
}
