package com.lexicon.lab

import java.text.Normalizer
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sign

/** The seeded rules are deliberately compatible with the browser game. */
object PuzzleEngine {
    private val forwardDirections = listOf(0 to 1, 1 to 0, 1 to 1)
    private val allDirections = forwardDirections + listOf(-1 to 1, 0 to -1, -1 to 0, -1 to -1, 1 to -1)
    private const val filler = "AAAAAAAABCDEEEEEEEFGHIIIIIIJLMNNOOOOOOPQRSTUUUVXZ"

    fun normalizeWord(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace(Regex("[\\u0300-\\u036f]"), "")
        .uppercase(Locale.ROOT).replace(Regex("[^A-Z]"), "")

    private class SeededRandom(seed: String) {
        private var state = 0x811c9dc5.toInt()
        init { seed.codePoints().forEach { state = (state xor it) * 16777619 } }
        fun next(): Double {
            state += 0x6d2b79f5
            var value = (state xor (state ushr 15)) * (1 or state)
            value = value xor (value + (value xor (value ushr 7)) * (61 or value))
            return (value xor (value ushr 14)).toUInt().toLong().toDouble() / 4294967296.0
        }
        fun nextInt(bound: Int): Int = (next() * bound).toInt()
    }

    private fun <T> shuffled(items: List<T>, random: SeededRandom): List<T> = items.toMutableList().apply {
        for (i in lastIndex downTo 1) {
            val j = random.nextInt(i + 1)
            val value = this[i]
            this[i] = this[j]
            this[j] = value
        }
    }

    private data class Layout(val grid: Array<CharArray>, val placements: List<Placement>)

    fun generate(words: List<WordEntry>, difficulty: Difficulty, seed: String): Puzzle {
        val fitting = words.map { Placement(it.word.trim(), normalizeWord(it.word), it.clue, emptyList()) }
            .filter { it.normalized.isNotEmpty() && it.normalized.length <= difficulty.size }
            .distinctBy { it.normalized }
        require(fitting.size >= 4) { "O tema precisa de pelo menos 4 palavras diferentes com até ${difficulty.size} letras." }
        val random = SeededRandom(seed)
        val selected = shuffled(fitting, random).take(difficulty.count)
        val directions = if (difficulty == Difficulty.EASY) forwardDirections else allDirections
        var layout: Layout? = null
        repeat(6) { if (layout == null) layout = crossword(selected, difficulty.size, directions, random) }
        val result = layout ?: guaranteed(selected, difficulty.size, difficulty != Difficulty.EASY, random)
        for (row in result.grid) for (col in row.indices) if (row[col] == '\u0000') row[col] = filler[random.nextInt(filler.length)]
        val byWord = result.placements.associateBy { it.normalized }
        return Puzzle(difficulty.size, result.grid.map { it.toList() }, selected.map { byWord.getValue(it.normalized) }, seed, difficulty)
    }

    private fun crossword(entries: List<Placement>, size: Int, directions: List<Pair<Int, Int>>, random: SeededRandom): Layout? {
        val grid = Array(size) { CharArray(size) }
        val placements = mutableListOf<Placement>()
        val occupied = mutableSetOf<String>()
        for (entry in entries.sortedByDescending { it.normalized.length }) {
            var best: List<Cell>? = null
            var bestScore = -1.0
            for ((dr, dc) in directions) for (row in 0 until size) for (col in 0 until size) {
                val endRow = row + dr * (entry.normalized.length - 1)
                val endCol = col + dc * (entry.normalized.length - 1)
                if (endRow !in 0 until size || endCol !in 0 until size) continue
                val cells = ArrayList<Cell>(entry.normalized.length)
                var overlaps = 0
                var fits = true
                for (i in entry.normalized.indices) {
                    val r = row + dr * i
                    val c = col + dc * i
                    val letter = grid[r][c]
                    if (letter != '\u0000' && letter != entry.normalized[i]) { fits = false; break }
                    if (letter != '\u0000') overlaps++
                    cells.add(Cell(r, c))
                }
                if (!fits || pathKey(cells) in occupied) continue
                val score = overlaps * 2 + random.next() * 3
                if (score > bestScore) { bestScore = score; best = cells }
            }
            val cells = best ?: return null
            occupied.add(pathKey(cells))
            cells.forEachIndexed { index, cell -> grid[cell.row][cell.col] = entry.normalized[index] }
            placements.add(entry.copy(cells = cells))
        }
        return Layout(grid, placements)
    }

    private fun guaranteed(entries: List<Placement>, size: Int, reverseAllowed: Boolean, random: SeededRandom): Layout {
        val grid = Array(size) { CharArray(size) }
        val rows = shuffled((0 until size).toList(), random)
        val placements = entries.mapIndexed { index, entry ->
            val reverse = reverseAllowed && random.next() < 0.5
            val offset = random.nextInt(size - entry.normalized.length + 1)
            val cells = entry.normalized.indices.map { Cell(rows[index], offset + if (reverse) entry.normalized.length - 1 - it else it) }
            cells.forEachIndexed { i, cell -> grid[cell.row][cell.col] = entry.normalized[i] }
            entry.copy(cells = cells)
        }
        return Layout(grid, placements)
    }

    private fun pathKey(cells: List<Cell>): String = listOf("${cells.first().row},${cells.first().col}", "${cells.last().row},${cells.last().col}").sorted().joinToString(":")

    fun line(start: Cell, end: Cell): List<Cell> {
        if (start.row < 0 || start.col < 0 || end.row < 0 || end.col < 0) return emptyList()
        val dr = end.row - start.row
        val dc = end.col - start.col
        if (dr != 0 && dc != 0 && abs(dr) != abs(dc)) return emptyList()
        val steps = max(abs(dr), abs(dc))
        // A public helper must not allocate arbitrarily large lists for corrupt input.
        if (steps > 15) return emptyList()
        return (0..steps).map { Cell(start.row + it * dr.sign, start.col + it * dc.sign) }
    }

    /** Validates the actual letters, including incidental occurrences and reverse selections. */
    fun match(cells: List<Cell>, puzzle: Puzzle, found: Set<String> = emptySet()): Placement? {
        if (cells.isEmpty() || cells.any { it.row !in 0 until puzzle.size || it.col !in 0 until puzzle.size }) return null
        if (line(cells.first(), cells.last()) != cells) return null
        val forward = cells.joinToString("") { puzzle.grid[it.row][it.col].toString() }
        val backward = forward.reversed()
        val entry = puzzle.placements.firstOrNull { it.normalized !in found && (it.normalized == forward || it.normalized == backward) } ?: return null
        return entry.copy(cells = if (entry.normalized == forward) cells.toList() else cells.reversed())
    }
}
