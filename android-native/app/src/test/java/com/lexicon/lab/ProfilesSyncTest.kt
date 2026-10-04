package com.lexicon.lab

import android.app.Application
import android.content.Context
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.Assume.assumeTrue
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.net.HttpURLConnection
import java.net.URL
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ProfilesSyncTest {
    private lateinit var application: Application
    private lateinit var repository: GameRepository
    private fun fixture() = JSONObject(javaClass.classLoader!!.getResource("cloud-web-save.json")!!.readText())

    @Before fun setup() {
        application = RuntimeEnvironment.getApplication()
        application.getSharedPreferences("lexicon_native_v1", Context.MODE_PRIVATE).edit().clear().commit()
        repository = GameRepository(application)
    }

    @Test fun legacyProgressBelongsToDanielAndLarissaStartsEmpty() {
        val legacy = StoreCodec.encode(SavedGame(profile = Profile(xp = 700, words = 19), settings = Settings(sound = true)))
        val prefs = application.getSharedPreferences("lexicon_native_v1", Context.MODE_PRIVATE)
        prefs.edit().putString("state", legacy).commit()
        assertEquals(listOf("Daniel", "Larissa"), repository.players().map { it.name })
        assertEquals(700, repository.load("daniel")!!.profile.xp)
        assertEquals(0, repository.load("larissa")!!.profile.xp)
        assertFalse(repository.load("larissa")!!.settings.sound)
        assertEquals(legacy, prefs.getString("state", null))
        val otherActivity = GameRepository(application)
        otherActivity.save("larissa", SavedGame(profile = Profile(words = 4)))
        repository.save("daniel", repository.load("daniel")!!.copy(favorites = setOf("mentes-brilhantes")))
        assertEquals(4, repository.load("larissa")!!.profile.words)
        assertEquals(700, otherActivity.load("daniel")!!.profile.xp)
    }

    @Test fun pickerSwitchesBoardSettingsAndProgressWithoutMixingPlayers() {
        val vm = GameViewModel(application)
        assertNull(vm.state.activePlayerId)
        vm.selectPlayer("daniel")
        vm.startGame("mentes-brilhantes")
        val word = vm.state.session!!.puzzle.placements.first()
        vm.tapCell(word.cells.first()); vm.tapCell(word.cells.last())
        vm.toggleSound()
        val daniel = vm.state.session!!
        vm.showPlayerPicker(); vm.selectPlayer("larissa")
        assertEquals(0, vm.state.profile.words); assertNull(vm.state.session); assertFalse(vm.state.settings.sound)
        vm.startGame("mentes-brilhantes")
        val larissa = vm.state.session!!.puzzle.seed
        vm.showPlayerPicker(); vm.selectPlayer("daniel")
        assertEquals(daniel.puzzle, vm.state.session!!.puzzle)
        assertEquals(daniel.found, vm.state.session!!.found)
        assertTrue(vm.state.settings.sound)
        assertEquals(larissa, repository.load("larissa")!!.session!!.puzzle.seed)
        assertEquals(1, GameViewModel(application).apply { selectPlayer("daniel") }.state.profile.words)
    }

    @Test fun webWireFormatRecreatesExactBoardAndFoundPathsInNativeEngine() {
        val fixture = fixture()
        val game = CloudCodec.decode(fixture.getJSONObject("save").toString(), repository.catalog().second)
        val expectedGrid = fixture.getJSONArray("grid")
        assertNotNull(game.session)
        game.session!!.puzzle.grid.forEachIndexed { row, cells ->
            val expected = expectedGrid.getJSONArray(row)
            assertEquals((0 until expected.length()).map { expected.getString(it).single() }, cells)
        }
        assertEquals(1, game.session!!.foundCount)
        assertEquals(17, game.session!!.seconds)
        assertEquals(1, game.profile.words)
        assertTrue(game.settings.sound)
        val wire = JSONObject(CloudCodec.encode(game))
        assertEquals("easy", wire.getJSONObject("session").getString("difficulty"))
        assertEquals(fixture.getJSONObject("save").getJSONObject("session").getJSONArray("found").toString(), wire.getJSONObject("session").getJSONArray("found").toString())
        assertEquals(game, CloudCodec.decode(wire.toString(), repository.catalog().second))
    }

    @Test fun liveServiceTransfersWebSaveToAndroidAndBackWithConditionalWrites() {
        assumeTrue(System.getenv("LEXICON_LIVE_SYNC_TEST") == "1")
        val cloud = CloudSync(repository)
        val code = cloud.connect(cloud.newCode(), true)
        fun api(method: String, path: String, body: String? = null, etag: String? = null): Pair<Int, JSONObject> {
            val c = URL("https://lexicon-laboratorio.nexcoreadm.chatgpt.site/api/$path").openConnection() as HttpURLConnection
            try {
                c.requestMethod = method; c.connectTimeout = 12000; c.readTimeout = 12000
                c.setRequestProperty("Authorization", "Bearer $code")
                c.setRequestProperty("Content-Type", "application/json")
                if (body != null) { c.setRequestProperty(if (etag == null) "If-None-Match" else "If-Match", etag ?: "*"); c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
                val status = c.responseCode
                return status to JSONObject((if (status < 400) c.inputStream else c.errorStream).bufferedReader().use { it.readText() })
            } finally { c.disconnect() }
        }
        val web = fixture().getJSONObject("save").toString()
        val created = api("PUT", "profiles/daniel", web)
        assertEquals(200, created.first)
        assertEquals("loaded", cloud.sync("daniel", repository.catalog().second).kind)
        val local = repository.load("daniel")!!
        val session = local.session!!
        val next = session.puzzle.placements.first { it.normalized !in session.found }
        val (profile, progressed) = ProgressRules.discover(local.profile, session.copy(paused = false), next, "Mentes brilhantes")
        repository.save("daniel", local.copy(profile = profile, session = progressed))
        assertEquals("saved", cloud.sync("daniel", repository.catalog().second).kind)
        val result = api("GET", "profiles/daniel")
        assertEquals(200, result.first)
        assertEquals(2, result.second.getJSONObject("save").getJSONObject("session").getJSONArray("found").length())
        assertEquals(409, api("PUT", "profiles/daniel", web, "\"${created.second.getString("etag")}\"").first)
        assertEquals(404, api("GET", "profiles/larissa").first)
        System.getenv("LEXICON_SYNC_PROOF_PATH")?.let { File(it).writeText(result.second.getJSONObject("save").toString()) }
    }
}
