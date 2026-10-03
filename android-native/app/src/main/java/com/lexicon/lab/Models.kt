package com.lexicon.lab

import java.time.LocalDate

data class Category(val id: String, val label: String)
data class WordEntry(val word: String, val clue: String)
data class Theme(
    val id: String,
    val title: String,
    val category: String,
    val description: String,
    val words: List<WordEntry>,
    val icon: String = "Atom",
    val color: String = "green",
)
data class Cell(val row: Int, val col: Int)

enum class Difficulty(val label: String, val size: Int, val count: Int, val wordPoints: Int) {
    EASY("Aprendiz", 10, 8, 50),
    MEDIUM("Pesquisador", 13, 12, 75),
    HARD("Gênio", 16, 16, 100);
}
enum class Screen { HOME, GAME, NOTEBOOK, PROFILE }
enum class GameMode { FREE, DAILY }
enum class FeedbackKind { SUCCESS, ERROR, HINT, COMPLETE, INFO }

data class Placement(val word: String, val normalized: String, val clue: String, val cells: List<Cell>)
data class Puzzle(
    val size: Int,
    val grid: List<List<Char>>,
    val placements: List<Placement>,
    val seed: String,
    val difficulty: Difficulty,
)
data class GameSession(
    val themeId: String,
    val puzzle: Puzzle,
    val found: Map<String, List<Cell>> = emptyMap(),
    val hintedWords: Set<String> = emptySet(),
    val hintCell: Cell? = null,
    val hintsUsed: Int = 0,
    val seconds: Int = 0,
    val score: Int = 0,
    val mode: GameMode = GameMode.FREE,
    val day: String = LocalDate.now().toString(),
    val paused: Boolean = false,
    val started: Boolean = false,
    val completed: Boolean = false,
    val earnedXP: Int = 0,
) {
    val foundCount: Int get() = found.size
    val totalCount: Int get() = puzzle.placements.size
    val difficulty: Difficulty get() = puzzle.difficulty
    val hintsRemaining: Int get() = (3 - hintsUsed).coerceAtLeast(0)
}
data class Discovery(val word: String, val clue: String, val themeTitle: String = "")
data class HistoryEntry(
    val title: String,
    val difficulty: Difficulty,
    val seconds: Int,
    val xp: Int,
    val mode: GameMode,
    val day: String,
)
data class Profile(
    val xp: Int = 0,
    val wins: Int = 0,
    val words: Int = 0,
    val seconds: Int = 0,
    val themes: Set<String> = emptySet(),
    val dailyDays: Set<String> = emptySet(),
    val history: List<HistoryEntry> = emptyList(),
    val discoveries: List<Discovery> = emptyList(),
    val achievements: Set<String> = emptySet(),
) {
    val level: String get() = when {
        xp >= 5000 -> "Gênio do laboratório"
        xp >= 2000 -> "Professor de ideias"
        xp >= 500 -> "Pesquisador curioso"
        else -> "Aprendiz curioso"
    }
    fun streak(today: LocalDate = LocalDate.now()): Int {
        var date = if (today.toString() in dailyDays) today else today.minusDays(1)
        var count = 0
        while (date.toString() in dailyDays) {
            count++
            date = date.minusDays(1)
        }
        return count
    }
}
data class Settings(val sound: Boolean = false, val haptics: Boolean = true, val reduceMotion: Boolean = false)
data class GameFeedback(
    val id: Long,
    val kind: FeedbackKind,
    val title: String,
    val message: String,
    val word: String? = null,
    val xp: Int = 0,
)
data class Achievement(val id: String, val title: String, val description: String)
val ACHIEVEMENTS = listOf(
    Achievement("first", "Eureka!", "Conclua seu primeiro experimento."),
    Achievement("words50", "Colecionador de ideias", "Encontre 50 palavras."),
    Achievement("themes5", "Mente renascentista", "Conclua 5 temas diferentes."),
    Achievement("nohint", "Pura genialidade", "Conclua sem usar nenhuma dica."),
    Achievement("hard", "Doutor em descobertas", "Conclua um experimento no nível Gênio."),
    Achievement("daily3", "Ritual científico", "Conclua 3 desafios diários."),
    Achievement("wins10", "Cientista de respeito", "Conclua 10 experimentos."),
    Achievement("words200", "Enciclopédia viva", "Encontre 200 palavras."),
)
data class SavedGame(
    val profile: Profile = Profile(),
    val settings: Settings = Settings(),
    val favorites: Set<String> = emptySet(),
    val session: GameSession? = null,
    val selectedDifficulty: Difficulty = Difficulty.EASY,
)
data class GameUiState(
    val themes: List<Theme> = emptyList(),
    val categories: List<Category> = emptyList(),
    val screen: Screen = Screen.HOME,
    val selectedDifficulty: Difficulty = Difficulty.EASY,
    val selectedCategory: String? = null,
    val query: String = "",
    val favorites: Set<String> = emptySet(),
    val favoritesOnly: Boolean = false,
    val profile: Profile = Profile(),
    val settings: Settings = Settings(),
    val session: GameSession? = null,
    val selection: List<Cell> = emptyList(),
    val feedback: GameFeedback? = null,
    val errorMessage: String? = null,
) {
    val currentTheme: Theme? get() = themes.firstOrNull { it.id == session?.themeId }
    val filteredThemes: List<Theme> get() {
        val search = PuzzleEngine.normalizeWord(query)
        return themes.filter { theme ->
            (selectedCategory == null || theme.category == selectedCategory) &&
                (!favoritesOnly || theme.id in favorites) &&
                (search.isEmpty() || PuzzleEngine.normalizeWord("${theme.title} ${theme.description} ${theme.words.joinToString(" ") { it.word }}").contains(search))
        }
    }
}
