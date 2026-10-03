package com.lexicon.lab

import java.io.File
import org.junit.Assert.*
import org.junit.Test

class PuzzleEngineTest {
    private val words = listOf(WordEntry("Átomo", "a"), WordEntry("Luz", "l"), WordEntry("Tesla", "t"), WordEntry("Curie", "c"))

    @Test fun normalizationPreservesPortugueseAnswers() {
        assertEquals("SAOTOMEPRINCIPE", PuzzleEngine.normalizeWord("São Tomé & Príncipe"))
        assertEquals("ATOMO", PuzzleEngine.normalizeWord("  Átomo!  "))
    }

    @Test fun deterministicBoardMatchesBrowserIncludingUnicodeSeed() {
        val board = PuzzleEngine.generate(words, Difficulty.EASY, "lexicon-cross-platform-🧪")
        assertEquals(listOf("AFFFEBTOOR", "ITRXDIOCON", "AAECHHJHPL", "FAOSURESAI", "BVULLRNRXB", "OBEUUAIEUC", "AAHNZUTENX", "OIIRBLIOIU", "PABGPAAVMT", "SXOIAAEAVO"), board.grid.map { it.joinToString("") })
        assertEquals(listOf("ATOMO", "CURIE", "LUZ", "TESLA"), board.placements.map { it.normalized })
        assertEquals(board, PuzzleEngine.generate(words, Difficulty.EASY, "lexicon-cross-platform-🧪"))
    }

    @Test fun entireBundledCatalogIsPlayableAtEveryDifficulty() {
        val catalog = listOf(File("src/main/assets/catalog.json"), File("app/src/main/assets/catalog.json"))
            .firstOrNull { it.isFile } ?: error("Bundled catalog asset missing")
        val (categories, themes) = StoreCodec.catalog(catalog.readText())
        assertEquals(6, categories.size)
        assertEquals(42, themes.size)
        assertEquals(756, themes.sumOf { it.words.size })
        for (theme in themes) for (difficulty in Difficulty.entries) {
            val board = PuzzleEngine.generate(theme.words, difficulty, "catalog-${theme.id}-${difficulty.name}")
            val eligible = theme.words.map { PuzzleEngine.normalizeWord(it.word) }.filter { it.isNotEmpty() && it.length <= difficulty.size }.distinct().size
            assertEquals("${theme.id}/${difficulty.name}", minOf(difficulty.count, eligible), board.placements.size)
            assertEquals(difficulty.size, board.grid.size)
            assertTrue(board.grid.all { row -> row.size == difficulty.size && row.all { it in 'A'..'Z' } })
            for (entry in board.placements) {
                assertEquals(entry.normalized, PuzzleEngine.match(entry.cells, board)?.normalized)
                assertEquals(entry.cells, PuzzleEngine.match(entry.cells.reversed(), board)?.cells)
                assertNull(PuzzleEngine.match(entry.cells, board, setOf(entry.normalized)))
                if (difficulty == Difficulty.EASY) {
                    assertTrue(entry.cells.first().row <= entry.cells.last().row)
                    assertTrue(entry.cells.first().col <= entry.cells.last().col)
                }
            }
        }
    }

    @Test fun incidentalOccurrencesAreAcceptedWithActualCoordinates() {
        val first = listOf(Cell(0, 0), Cell(0, 1), Cell(0, 2))
        val other = listOf(Cell(1, 0), Cell(1, 1), Cell(1, 2))
        val board = Puzzle(3, listOf("LUZ".toList(), "LUZ".toList(), "AAA".toList()), listOf(Placement("Luz", "LUZ", "a", first)), "test", Difficulty.EASY)
        assertEquals(other, PuzzleEngine.match(other.reversed(), board)?.cells)
        assertNull(PuzzleEngine.match(other, board, setOf("LUZ")))
    }

    @Test fun invalidSelectionsAndNonStraightPathsAreRejected() {
        val board = PuzzleEngine.generate(words, Difficulty.EASY, "invalid")
        assertTrue(PuzzleEngine.line(Cell(0, 0), Cell(1, 2)).isEmpty())
        assertTrue(PuzzleEngine.line(Cell(-1, 0), Cell(1, 0)).isEmpty())
        assertNull(PuzzleEngine.match(emptyList(), board))
        assertNull(PuzzleEngine.match(listOf(Cell(0, 0), Cell(0, 2)), board))
        assertNull(PuzzleEngine.match(listOf(Cell(0, 0), Cell(1, 1), Cell(0, 2)), board))
        assertNull(PuzzleEngine.match(listOf(Cell(20, 20)), board))
    }

    @Test fun duplicateNormalizedWordsDoNotCreateImpossibleObjectives() {
        val board = PuzzleEngine.generate(words + WordEntry("atomo", "duplicate"), Difficulty.HARD, "duplicates")
        assertEquals(4, board.placements.size)
        assertEquals(1, board.placements.count { it.normalized == "ATOMO" })
    }

    @Test(expected = IllegalArgumentException::class) fun tooFewEligibleWordsFailClearly() {
        PuzzleEngine.generate(listOf(WordEntry("Lua", "moon")), Difficulty.EASY, "invalid")
    }
}
