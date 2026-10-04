package com.lexicon.lab

import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/** The shared wire format uses the browser's names; puzzle seeds are portable. */
object CloudCodec {
    fun encode(game: SavedGame): String {
        val json = JSONObject(StoreCodec.encode(game))
        json.put("selectedDifficulty", game.selectedDifficulty.name.lowercase(Locale.ROOT))
        val history = json.getJSONObject("profile").getJSONArray("history")
        for (i in 0 until history.length()) {
            val entry = history.getJSONObject(i)
            entry.put("difficulty", entry.getString("difficulty").lowercase(Locale.ROOT))
            entry.put("mode", entry.getString("mode").lowercase(Locale.ROOT))
        }
        json.optJSONObject("session")?.let { session ->
            val found = session.getJSONObject("found")
            session.put("foundPaths", found)
            session.put("found", JSONArray(found.keys().asSequence().toList()))
            session.put("difficulty", session.getString("difficulty").lowercase(Locale.ROOT))
            session.put("mode", session.getString("mode").lowercase(Locale.ROOT))
            session.remove("grid"); session.remove("placements")
        }
        return json.toString()
    }

    fun decode(raw: String, themes: List<Theme>): SavedGame {
        val json = JSONObject(raw)
        require(json.optInt("version") == 1)
        val selected = json.optString("selectedDifficulty", json.optJSONObject("session")?.optString("difficulty", "easy") ?: "easy")
        json.put("selectedDifficulty", selected.uppercase(Locale.ROOT))
        val history = json.optJSONObject("profile")?.optJSONArray("history") ?: JSONArray()
        for (i in 0 until history.length()) {
            val entry = history.optJSONObject(i) ?: continue
            entry.put("difficulty", entry.optString("difficulty", "easy").uppercase(Locale.ROOT))
            entry.put("mode", entry.optString("mode", "free").uppercase(Locale.ROOT))
        }
        json.optJSONObject("session")?.let { session ->
            val theme = themes.firstOrNull { it.id == session.optString("themeId") }
                ?: throw IllegalArgumentException("Este tema personalizado precisa ser continuado no site. O progresso online foi preservado.")
            val difficulty = Difficulty.valueOf(session.getString("difficulty").uppercase(Locale.ROOT))
            val puzzle = PuzzleEngine.generate(theme.words, difficulty, session.getString("seed"))
            session.put("difficulty", difficulty.name)
            session.put("mode", session.optString("mode", "free").uppercase(Locale.ROOT))
            session.put("found", session.optJSONObject("foundPaths") ?: JSONObject().apply {
                val found = session.optJSONArray("found") ?: JSONArray()
                for (i in 0 until found.length()) {
                    val word = found.optString(i)
                    puzzle.placements.firstOrNull { it.normalized == word }?.let { put(word, cells(it.cells)) }
                }
            })
            session.put("grid", JSONArray(puzzle.grid.map { it.joinToString("") }))
            session.put("placements", JSONArray(puzzle.placements.map {
                JSONObject().put("word", it.word).put("normalized", it.normalized).put("clue", it.clue).put("cells", cells(it.cells))
            }))
        }
        return StoreCodec.decode(json.toString())
    }
    private fun cells(values: List<Cell>) = JSONArray(values.map { JSONObject().put("row", it.row).put("col", it.col) })
    fun meaningful(game: SavedGame): Boolean = game.profile.words > 0 || game.profile.xp > 0 || game.profile.wins > 0 || game.favorites.isNotEmpty() || game.session?.started == true || game.settings.sound || !game.settings.haptics || game.settings.reduceMotion
}
