package com.lexicon.lab

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** All content ships in the APK; local progress works independently of optional cloud sync. */
class GameRepository(context: Context) {
    private val assets = context.applicationContext.assets
    private val preferences = context.applicationContext.getSharedPreferences("lexicon_native_v1", Context.MODE_PRIVATE)

    fun catalog(): Pair<List<Category>, List<Theme>> = assets.open("catalog.json").bufferedReader().use { StoreCodec.catalog(it.readText()) }
    fun players(): List<PlayerSummary> = synchronized(lock) { readPlayers().players.map { it.summary } }
    fun load(playerId: String): SavedGame? = synchronized(lock) { readPlayers().players.firstOrNull { it.id == playerId }?.game }

    /** Re-read before updating one explicit player, so a second activity cannot overwrite another player's save. */
    fun save(playerId: String, value: SavedGame): Boolean = synchronized(lock) {
        val current = readPlayers()
        if (current.players.none { it.id == playerId }) return@synchronized false
        val updated = current.copy(players = current.players.map { if (it.id == playerId) it.copy(game = value) else it })
        val meta = syncMeta(playerId).put("dirty", true)
        preferences.edit().putString("players", StoreCodec.encodePlayers(updated)).putString("sync-meta:$playerId", meta.toString()).commit()
    }

    fun addPlayer(player: SavedPlayer): Boolean = synchronized(lock) {
        val current = readPlayers()
        if (current.players.size >= PlayerProfiles.MAX_PLAYERS || current.players.any { it.id == player.id || it.name.equals(player.name, ignoreCase = true) }) return@synchronized false
        writePlayers(current.copy(players = current.players + player))
    }

    fun updatePlayer(playerId: String, name: String, avatar: String): Boolean = synchronized(lock) {
        val current = readPlayers()
        if (current.players.none { it.id == playerId } || current.players.any { it.id != playerId && it.name.equals(name, ignoreCase = true) }) return@synchronized false
        writePlayers(current.copy(players = current.players.map { if (it.id == playerId) it.copy(name = name, avatar = avatar) else it }))
    }

    private fun readPlayers(): PlayerStore {
        val raw = preferences.getString("players", null)
        if (raw != null) return checkNotNull(StoreCodec.decodePlayers(raw)) { "Não foi possível ler os perfis salvos neste aparelho." }
        // Keep the exact legacy value as a backup. New profiles never write to the old state key.
        val migrated = PlayerStore(listOf(SavedPlayer("daniel", "Daniel", "atom", StoreCodec.decode(preferences.getString("state", null))), SavedPlayer("larissa", "Larissa", "flower")))
        check(writePlayers(migrated)) { "Não foi possível salvar os perfis neste aparelho." }
        return migrated
    }

    private fun writePlayers(value: PlayerStore): Boolean = preferences.edit().putString("players", StoreCodec.encodePlayers(value)).commit()

    fun syncCode(): String = preferences.getString("sync-code", "").orEmpty()
    fun connectCode(code: String): Boolean = synchronized(lock) {
        val editor = preferences.edit().putString("sync-code", code)
        if (syncCode() != code) for (id in listOf("daniel", "larissa")) editor.remove("sync-meta:$id")
        editor.commit()
    }
    fun syncMeta(id: String): JSONObject = runCatching { JSONObject(preferences.getString("sync-meta:$id", "{}").orEmpty()) }.getOrElse { JSONObject() }
    fun setSyncMeta(id: String, meta: JSONObject): Boolean = preferences.edit().putString("sync-meta:$id", meta.toString()).commit()
    fun keepBackup(id: String, raw: String): Boolean = preferences.edit().putString("sync-backup:$id", raw).commit()
    fun saveCloud(id: String, game: SavedGame, etag: String, expectedSnapshot: String? = null, expectedCode: String? = null): Boolean = synchronized(lock) {
        val current = readPlayers()
        if (current.players.none { it.id == id }) return@synchronized false
        if (expectedCode != null && syncCode() != expectedCode) return@synchronized false
        if (expectedSnapshot != null && CloudCodec.encode(current.players.first { it.id == id }.game) != expectedSnapshot) return@synchronized false
        val updated = current.copy(players = current.players.map { if (it.id == id) it.copy(game = game) else it })
        val meta = JSONObject().put("etag", etag).put("dirty", false).put("snapshot", CloudCodec.encode(game))
        preferences.edit().putString("players", StoreCodec.encodePlayers(updated)).putString("sync-meta:$id", meta.toString()).commit()
    }

    private companion object { val lock = Any() }
}

/** Kept free of Context so corruption handling and process-restoration can be tested on the JVM. */
object StoreCodec {
    private fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }
    private fun JSONArray.strings(): List<String> = (0 until length()).mapNotNull { opt(it) as? String }.filter { it.isNotBlank() }
    private fun JSONObject.array(name: String): JSONArray = optJSONArray(name) ?: JSONArray()
    private fun JSONObject.nonNegative(name: String): Int = optLong(name, 0).coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
    private fun strings(values: Collection<String>) = JSONArray(values.toList())
    private fun cell(value: Cell): JSONObject = JSONObject().put("row", value.row).put("col", value.col)
    private fun cells(values: List<Cell>): JSONArray = JSONArray(values.map(::cell))
    private fun readCells(value: JSONArray): List<Cell> = value.objects().map { Cell(it.optInt("row", -1), it.optInt("col", -1)) }
    private inline fun <reified T : Enum<T>> enum(value: String, fallback: T): T = enumValues<T>().firstOrNull { it.name == value } ?: fallback

    fun encodePlayers(store: PlayerStore): String = JSONObject().put("version", 2).put("players", JSONArray(store.players.map {
        JSONObject().put("id", it.id).put("name", it.name).put("avatar", it.avatar).put("game", JSONObject(encode(it.game)))
    })).toString()

    fun decodePlayers(raw: String): PlayerStore? = runCatching {
        val json = JSONObject(raw)
        require(json.optInt("version") == 2)
        val players = json.getJSONArray("players").objects().map {
            val id = it.getString("id")
            val name = it.getString("name").trim()
            val avatar = it.getString("avatar")
            require(id.matches(Regex("[A-Za-z0-9-]{1,80}")) && name.length in 1..PlayerProfiles.MAX_NAME_LENGTH && avatar in PlayerProfiles.avatars)
            SavedPlayer(id, name, avatar, decode(it.getJSONObject("game").toString()))
        }
        require(players.size in 1..PlayerProfiles.MAX_PLAYERS && players.map { it.id }.distinct().size == players.size)
        require(players.none { a -> players.any { b -> a.id != b.id && a.name.equals(b.name, ignoreCase = true) } })
        PlayerStore(players)
    }.getOrNull()

    fun catalog(raw: String): Pair<List<Category>, List<Theme>> {
        val json = JSONObject(raw)
        val categories = json.array("categories").objects().map { Category(it.getString("id"), it.getString("label")) }
        val themes = json.array("themes").objects().map { theme ->
            Theme(theme.getString("id"), theme.getString("title"), theme.getString("category"), theme.getString("description"),
                theme.array("words").objects().map { WordEntry(it.getString("word"), it.getString("clue")) },
                theme.optString("icon", "Atom"), theme.optString("color", "green"))
        }
        require(themes.isNotEmpty()) { "O catálogo do laboratório está vazio." }
        return categories to themes
    }

    fun encode(saved: SavedGame): String = JSONObject().apply {
        put("version", 1)
        put("selectedDifficulty", saved.selectedDifficulty.name)
        put("favorites", strings(saved.favorites))
        put("settings", JSONObject().put("sound", saved.settings.sound).put("haptics", saved.settings.haptics).put("reduceMotion", saved.settings.reduceMotion))
        put("profile", encodeProfile(saved.profile))
        saved.session?.let { put("session", encodeSession(it)) }
    }.toString()

    fun decode(raw: String?): SavedGame {
        if (raw.isNullOrBlank()) return SavedGame()
        return runCatching {
            val json = JSONObject(raw)
            if (json.optInt("version") != 1) return SavedGame()
            val settings = json.optJSONObject("settings") ?: JSONObject()
            SavedGame(
                profile = decodeProfile(json.optJSONObject("profile") ?: JSONObject()),
                settings = Settings(settings.optBoolean("sound", false), settings.optBoolean("haptics", true), settings.optBoolean("reduceMotion", false)),
                favorites = json.array("favorites").strings().toSet(),
                session = json.optJSONObject("session")?.let { runCatching { decodeSession(it) }.getOrNull() },
                selectedDifficulty = enum(json.optString("selectedDifficulty"), Difficulty.EASY),
            )
        }.getOrElse { SavedGame() }
    }

    private fun encodeProfile(profile: Profile): JSONObject = JSONObject().apply {
        put("xp", profile.xp); put("wins", profile.wins); put("words", profile.words); put("seconds", profile.seconds)
        put("themes", strings(profile.themes)); put("dailyDays", strings(profile.dailyDays)); put("achievements", strings(profile.achievements))
        put("discoveries", JSONArray(profile.discoveries.map { JSONObject().put("word", it.word).put("clue", it.clue).put("themeTitle", it.themeTitle) }))
        put("history", JSONArray(profile.history.map { JSONObject().put("title", it.title).put("difficulty", it.difficulty.name).put("seconds", it.seconds).put("xp", it.xp).put("mode", it.mode.name).put("day", it.day) }))
    }

    private fun decodeProfile(json: JSONObject): Profile = Profile(
        xp = json.nonNegative("xp"), wins = json.nonNegative("wins"), words = json.nonNegative("words"), seconds = json.nonNegative("seconds"),
        themes = json.array("themes").strings().toSet(),
        dailyDays = json.array("dailyDays").strings().filter { runCatching { java.time.LocalDate.parse(it) }.isSuccess }.toSet(),
        achievements = json.array("achievements").strings().filter { id -> ACHIEVEMENTS.any { it.id == id } }.toSet(),
        discoveries = json.array("discoveries").objects().filter { it.opt("word") is String && it.opt("clue") is String }
            .map { Discovery(it.getString("word"), it.getString("clue"), it.optString("themeTitle")) }.distinctBy { PuzzleEngine.normalizeWord(it.word) }.takeLast(500),
        history = json.array("history").objects().filter { it.opt("title") is String && runCatching { java.time.LocalDate.parse(it.optString("day")) }.isSuccess }
            .map { HistoryEntry(it.getString("title"), enum(it.optString("difficulty"), Difficulty.EASY), it.nonNegative("seconds"), it.nonNegative("xp"), enum(it.optString("mode"), GameMode.FREE), it.getString("day")) }.take(50),
    )

    private fun encodeSession(session: GameSession): JSONObject = JSONObject().apply {
        put("themeId", session.themeId); put("seed", session.puzzle.seed); put("difficulty", session.difficulty.name)
        put("grid", JSONArray(session.puzzle.grid.map { it.joinToString("") }))
        put("placements", JSONArray(session.puzzle.placements.map {
            JSONObject().put("word", it.word).put("normalized", it.normalized).put("clue", it.clue).put("cells", cells(it.cells))
        }))
        put("found", JSONObject().apply { session.found.forEach { (word, path) -> put(word, cells(path)) } })
        put("hintedWords", strings(session.hintedWords)); put("hintsUsed", session.hintsUsed)
        session.hintCell?.let { put("hintCell", cell(it)) }
        put("seconds", session.seconds); put("score", session.score); put("earnedXP", session.earnedXP)
        put("mode", session.mode.name); put("day", session.day); put("paused", session.paused); put("started", session.started); put("completed", session.completed)
    }

    private fun decodeSession(json: JSONObject): GameSession {
        val difficulty = Difficulty.valueOf(json.getString("difficulty"))
        val grid = json.array("grid").strings().map { it.toList() }
        require(grid.size == difficulty.size && grid.all { row -> row.size == difficulty.size && row.all { it in 'A'..'Z' } })
        val placements = json.array("placements").objects().map {
            Placement(it.getString("word"), it.getString("normalized"), it.optString("clue"), readCells(it.array("cells")))
        }
        require(placements.size in 4..difficulty.count && placements.distinctBy { it.normalized }.size == placements.size)
        val puzzle = Puzzle(difficulty.size, grid, placements, json.getString("seed"), difficulty)
        require(placements.all { it.normalized == PuzzleEngine.normalizeWord(it.word) && PuzzleEngine.match(it.cells, puzzle)?.normalized == it.normalized })
        val rawFound = json.optJSONObject("found") ?: JSONObject()
        val found = buildMap {
            for (entry in placements) {
                val path = rawFound.optJSONArray(entry.normalized)?.let(::readCells) ?: continue
                val match = PuzzleEngine.match(path, puzzle)
                if (match?.normalized == entry.normalized) put(entry.normalized, match.cells)
            }
        }
        val hinted = json.array("hintedWords").strings().filter { word -> placements.any { it.normalized == word } }.toSet()
        val hint = json.optJSONObject("hintCell")?.let { Cell(it.optInt("row", -1), it.optInt("col", -1)) }
            ?.takeIf { it.row in grid.indices && it.col in grid.indices }
        val day = json.getString("day").also { java.time.LocalDate.parse(it) }
        return GameSession(
            themeId = json.getString("themeId"), puzzle = puzzle, found = found, hintedWords = hinted,
            hintCell = hint, hintsUsed = json.nonNegative("hintsUsed").coerceAtMost(3), seconds = json.nonNegative("seconds"),
            score = json.nonNegative("score"), mode = enum(json.optString("mode"), GameMode.FREE), day = day,
            paused = json.optBoolean("paused", false), started = json.optBoolean("started", found.isNotEmpty()), completed = found.size == placements.size, earnedXP = json.nonNegative("earnedXP"),
        )
    }
}
