package com.lexicon.lab

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.util.UUID

class GameViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = GameRepository(application)
    private val cloud = CloudSync(repository)
    private val syncJobs = mutableMapOf<String, Job>()
    private var playerGeneration = 0L
    private var saveRevision = 0L
    private var selectionStart: Cell? = null
    private var selectionEnd: Cell? = null
    private var feedbackSequence = 0L
    var state by mutableStateOf(GameUiState())
        private set

    init {
        runCatching {
            val (categories, themes) = repository.catalog()
            state = state.copy(categories = categories, themes = themes)
            state = state.copy(players = repository.players(), syncCode = repository.syncCode())
        }.onFailure { state = state.copy(errorMessage = "Não foi possível abrir os dados do laboratório. Feche e reabra o aplicativo; seus dados continuam guardados.") }
    }

    fun selectPlayer(id: String) {
        if (id == state.activePlayerId) return
        if (state.activePlayerId != null && !saveBeforeLeaving()) return
        runCatching {
            val saved = repository.load(id) ?: error("Este perfil não foi encontrado.")
            selectionStart = null; selectionEnd = null
            playerGeneration++
            state = GameUiState(
                categories = state.categories, themes = state.themes, players = repository.players(), activePlayerId = id,
                profile = saved.profile, settings = saved.settings,
                favorites = saved.favorites.filter { themeId -> state.themes.any { it.id == themeId } }.toSet(),
                selectedDifficulty = saved.selectedDifficulty,
                session = saved.session?.takeIf { session -> state.themes.any { it.id == session.themeId } }?.copy(paused = true),
                syncCode = repository.syncCode(),
            )
            syncNow()
        }.onFailure { state = state.copy(errorMessage = "Não foi possível abrir este perfil. Tente novamente.") }
    }

    fun showPlayerPicker() {
        if (state.activePlayerId != null && !saveBeforeLeaving()) return
        selectionStart = null; selectionEnd = null
        playerGeneration++
        state = GameUiState(categories = state.categories, themes = state.themes, players = state.players, syncCode = repository.syncCode())
    }

    fun createPlayer(name: String, avatar: String): Boolean {
        if (!validPlayer(name, avatar)) return false
        if (state.players.size >= PlayerProfiles.MAX_PLAYERS) {
            state = state.copy(errorMessage = "O laboratório comporta até 6 perfis.")
            return false
        }
        return editPlayers { repository.addPlayer(SavedPlayer("player-${UUID.randomUUID()}", name.trim(), avatar)) }
    }

    fun updatePlayer(id: String, name: String, avatar: String): Boolean {
        if (!validPlayer(name, avatar, id)) return false
        return editPlayers { repository.updatePlayer(id, name.trim(), avatar) }
    }

    private fun validPlayer(name: String, avatar: String, id: String? = null): Boolean {
        val trimmed = name.trim()
        val message = when {
            trimmed.length !in 1..PlayerProfiles.MAX_NAME_LENGTH || trimmed.any { it.isISOControl() } -> "Use um nome de 1 a 24 caracteres."
            avatar !in PlayerProfiles.avatars -> "Escolha um avatar do laboratório."
            state.players.any { it.id != id && it.name.equals(trimmed, ignoreCase = true) } -> "Esse nome já está em uso. Escolha outro para distinguir os perfis."
            else -> null
        }
        if (message != null) state = state.copy(errorMessage = message)
        return message == null
    }

    private fun editPlayers(action: () -> Boolean): Boolean {
        return runCatching {
            check(action())
            state = state.copy(players = repository.players(), errorMessage = null)
            true
        }.getOrElse {
            state = state.copy(errorMessage = "Não foi possível salvar o perfil. Verifique o espaço disponível e tente novamente.")
            false
        }
    }

    private fun saveBeforeLeaving(): Boolean {
        cancelSelection()
        state = state.copy(session = state.session?.copy(paused = true), feedback = null)
        return persist()
    }

    fun navigate(screen: Screen) {
        if (state.activePlayerId == null) return
        cancelSelection()
        state = state.copy(screen = screen, feedback = null,
            session = if (screen != Screen.GAME) state.session?.copy(paused = true) else state.session)
        persist()
    }

    fun setDifficulty(difficulty: Difficulty) { if (state.activePlayerId == null) return; state = state.copy(selectedDifficulty = difficulty); persist() }
    fun setCategory(category: String?) { if (state.activePlayerId == null) return; state = state.copy(selectedCategory = category) }
    fun setQuery(query: String) { if (state.activePlayerId == null) return; state = state.copy(query = query) }
    fun toggleFavoritesOnly() { if (state.activePlayerId == null) return; state = state.copy(favoritesOnly = !state.favoritesOnly) }
    fun toggleFavorite(themeId: String) {
        if (state.activePlayerId == null) return
        if (state.themes.none { it.id == themeId }) return
        state = state.copy(favorites = if (themeId in state.favorites) state.favorites - themeId else state.favorites + themeId)
        persist()
    }

    fun startGame(themeId: String, daily: Boolean = false) {
        if (state.activePlayerId == null) return
        if (daily) { startDaily(); return }
        val theme = state.themes.firstOrNull { it.id == themeId } ?: return
        start(theme, state.selectedDifficulty, GameMode.FREE, UUID.randomUUID().toString())
    }

    private fun start(theme: Theme, difficulty: Difficulty, mode: GameMode, seed: String) {
        if (state.activePlayerId == null) return
        runCatching {
            val puzzle = PuzzleEngine.generate(theme.words, difficulty, seed)
            cancelSelection()
            state = state.copy(screen = Screen.GAME, session = GameSession(theme.id, puzzle, mode = mode), feedback = null, errorMessage = null)
            persist()
        }.onFailure { state = state.copy(errorMessage = it.message ?: "Não foi possível montar este experimento.") }
    }

    fun startDaily() {
        if (state.activePlayerId == null || state.themes.isEmpty()) return
        val today = LocalDate.now()
        val day = today.toString()
        val current = state.session
        if (current?.mode == GameMode.DAILY && current.day == day) { resumeGame(); return }
        if (day in state.profile.dailyDays) {
            feedback(FeedbackKind.INFO, "Missão do dia cumprida", "Amanhã tem outro universo. Enquanto isso, explore os temas do laboratório!")
            return
        }
        val index = Math.floorMod(today.toEpochDay(), state.themes.size.toLong()).toInt()
        start(state.themes[index], Difficulty.MEDIUM, GameMode.DAILY, "lexicon-daily-$day")
    }

    fun resumeGame() {
        val session = state.session ?: return
        state = state.copy(screen = Screen.GAME, session = session.copy(paused = false), feedback = null)
        if (session.completed) showCompleted(session)
        persist()
    }

    fun newRound() {
        val theme = state.currentTheme ?: state.themes.firstOrNull() ?: return
        startGame(theme.id)
    }

    private fun available(cell: Cell): Boolean {
        if (state.activePlayerId == null) return false
        val session = state.session ?: return false
        return state.screen == Screen.GAME && !session.paused && !session.completed && cell.row in 0 until session.puzzle.size && cell.col in 0 until session.puzzle.size
    }

    fun tapCell(cell: Cell) {
        if (!available(cell)) return
        val start = selectionStart
        if (start == null) beginSelection(cell) else {
            selectionEnd = cell
            submit(start, cell)
        }
    }

    fun beginSelection(cell: Cell) {
        if (!available(cell)) return
        selectionStart = cell; selectionEnd = cell
        state = state.copy(selection = listOf(cell), feedback = null, session = state.session?.copy(started = true))
    }

    fun updateSelection(cell: Cell) {
        if (!available(cell)) return
        val start = selectionStart ?: return
        selectionEnd = cell
        state = state.copy(selection = PuzzleEngine.line(start, cell))
    }

    fun endSelection() {
        val start = selectionStart ?: return
        val end = selectionEnd ?: start
        if (!available(end)) { cancelSelection(); return }
        submit(start, end)
    }

    fun cancelSelection() {
        selectionStart = null; selectionEnd = null
        state = state.copy(selection = emptyList())
    }

    private fun submit(start: Cell, end: Cell) {
        val session = state.session ?: return
        val path = PuzzleEngine.line(start, end)
        val match = PuzzleEngine.match(path, session.puzzle, session.found.keys)
        cancelSelection()
        if (match == null) {
            if (start != end) feedback(FeedbackKind.ERROR, "Quase lá!", if (path.isEmpty()) "Conecte as letras em uma linha reta." else "Essa combinação ainda não está na lista. Tente outra descoberta!")
            return
        }
        val (profile, updatedSession) = ProgressRules.discover(state.profile, session, match, state.currentTheme?.title.orEmpty())
        state = state.copy(profile = profile, session = updatedSession)
        if (updatedSession.completed) showCompleted(updatedSession)
        else feedback(FeedbackKind.SUCCESS, "Eureka! ${match.word}", match.clue, match.word, session.difficulty.wordPoints)
        persist()
    }

    fun requestHint() {
        val session = state.session ?: return
        if (session.paused || session.completed || session.hintsRemaining == 0 || state.screen != Screen.GAME) return
        val remaining = session.puzzle.placements.filter { it.normalized !in session.found }
        val word = remaining.firstOrNull { it.normalized !in session.hintedWords } ?: remaining.firstOrNull() ?: return
        val repeated = word.normalized in session.hintedWords
        state = state.copy(session = session.copy(hintsUsed = session.hintsUsed + 1, hintedWords = session.hintedWords + word.normalized,
            hintCell = if (repeated) word.cells.last() else word.cells.first(), score = (session.score - 25).coerceAtLeast(0), started = true))
        feedback(FeedbackKind.HINT, "Uma pequena faísca", "${if (repeated) "O final" else "O início"} de uma palavra está brilhando. ${word.clue}", word.word)
        persist()
    }

    fun togglePause() {
        val session = state.session ?: return
        if (session.completed) return
        cancelSelection()
        state = state.copy(session = session.copy(paused = !session.paused), feedback = null)
        persist()
    }

    /** The activity drives this only while STARTED; foreground navigation is checked again here. */
    fun tick() {
        val session = state.session ?: return
        if (state.screen != Screen.GAME || session.paused || session.completed || !session.started) return
        val updated = session.copy(seconds = (session.seconds.toLong() + 1).coerceAtMost(Int.MAX_VALUE.toLong()).toInt())
        state = state.copy(session = updated)
        if (updated.seconds % 5 == 0) persist()
    }

    fun onBackground() {
        cancelSelection()
        state = state.copy(session = state.session?.copy(paused = true))
        persist()
    }

    fun toggleSound() { if (state.activePlayerId == null) return; state = state.copy(settings = state.settings.copy(sound = !state.settings.sound)); persist() }
    fun toggleHaptics() { if (state.activePlayerId == null) return; state = state.copy(settings = state.settings.copy(haptics = !state.settings.haptics)); persist() }
    fun toggleReduceMotion() { if (state.activePlayerId == null) return; state = state.copy(settings = state.settings.copy(reduceMotion = !state.settings.reduceMotion)); persist() }
    fun dismissFeedback() { state = state.copy(feedback = null) }
    fun dismissError() { state = state.copy(errorMessage = null) }

    fun newSyncCode(): String = cloud.newCode()
    fun formattedSyncCode(): String = cloud.format(state.syncCode)
    fun connectDevices(code: String, create: Boolean = false) {
        if (state.syncing) return
        state = state.copy(syncing = true, errorMessage = null)
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { cloud.connect(code, create) } }
                .onSuccess { state = state.copy(syncCode = it, syncStatus = "Aparelhos conectados", syncing = false); syncNow() }
                .onFailure { state = state.copy(syncing = false, errorMessage = it.message ?: "Conecte-se à internet para conectar os aparelhos.") }
        }
    }
    fun syncNow(resolve: String? = null) {
        val id = state.activePlayerId ?: return
        if (state.syncing) return
        syncPlayer(id, resolve)
    }
    private fun syncPlayer(id: String, resolve: String? = null) {
        if (repository.syncCode().isEmpty()) return
        val generation = playerGeneration
        val revision = saveRevision
        if (state.activePlayerId == id) state = state.copy(syncing = true, syncStatus = "Sincronizando…")
        val themes = state.themes
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) { cloud.sync(id, themes, resolve) }
            if (state.activePlayerId != id || playerGeneration != generation) {
                if (result.kind == "pending") scheduleSync(id)
                return@launch
            }
            state = state.copy(syncing = false, syncStatus = result.message, syncConflict = result.kind == "conflict", players = repository.players())
            if (result.kind == "loaded" && saveRevision == revision && repository.load(id) == result.game) {
                val saved = result.game!!
                selectionStart = null; selectionEnd = null
                state = state.copy(profile = saved.profile, settings = saved.settings, favorites = saved.favorites,
                    session = saved.session?.copy(paused = true), selectedDifficulty = saved.selectedDifficulty, selection = emptyList(), feedback = null)
            }
            if (result.kind == "pending") scheduleSync(id)
        }
    }
    fun onForeground() { if (state.activePlayerId != null) syncNow() }
    private fun scheduleSync(playerId: String? = state.activePlayerId) {
        val id = playerId ?: return
        if (repository.syncCode().isEmpty()) return
        syncJobs[id]?.cancel()
        syncJobs[id] = viewModelScope.launch { delay(1500); if (state.activePlayerId != id || !state.syncing) syncPlayer(id) }
    }

    private fun showCompleted(session: GameSession) {
        feedback(FeedbackKind.COMPLETE, "Experimento concluído!", "${session.foundCount} descobertas para o seu caderno. A curiosidade continua!", xp = session.earnedXP)
    }

    private fun feedback(kind: FeedbackKind, title: String, message: String, word: String? = null, xp: Int = 0) {
        state = state.copy(feedback = GameFeedback(++feedbackSequence, kind, title, message, word, xp))
    }

    private fun persist(): Boolean {
        val playerId = state.activePlayerId ?: return true
        val saved = runCatching {
            check(repository.save(playerId, SavedGame(state.profile, state.settings, state.favorites, state.session, state.selectedDifficulty)))
            saveRevision++
            state = state.copy(players = repository.players())
            true
        }.getOrDefault(false)
        if (!saved) {
            state = state.copy(errorMessage = "O aparelho não conseguiu salvar o progresso. Verifique o espaço disponível e tente novamente.")
        }
        if (saved) scheduleSync()
        return saved
    }
}

/** Pure progression rules: idempotent completion prevents duplicate XP after restoration. */
object ProgressRules {
    fun discover(profile: Profile, session: GameSession, match: Placement, title: String): Pair<Profile, GameSession> {
        if (session.completed || match.normalized in session.found) return profile to session
        val verified = PuzzleEngine.match(match.cells, session.puzzle, session.found.keys)
        if (verified?.normalized != match.normalized) return profile to session
        var nextSession = session.copy(found = session.found + (verified.normalized to verified.cells), hintCell = null, started = true,
            score = session.score + session.difficulty.wordPoints)
        var nextProfile = profile.copy(words = profile.words + 1,
            discoveries = if (profile.discoveries.any { PuzzleEngine.normalizeWord(it.word) == verified.normalized }) profile.discoveries
                else (profile.discoveries + Discovery(verified.word, verified.clue, title)).takeLast(500))
        if (nextSession.foundCount == nextSession.totalCount) {
            val alreadyDaily = session.mode == GameMode.DAILY && session.day in profile.dailyDays
            val xp = if (alreadyDaily) 0 else nextSession.score + nextSession.hintsRemaining * 25 + if (session.mode == GameMode.DAILY) 150 else 0
            nextSession = nextSession.copy(completed = true, earnedXP = xp, paused = false)
            if (!alreadyDaily) nextProfile = nextProfile.copy(
                xp = nextProfile.xp + xp, wins = nextProfile.wins + 1, seconds = nextProfile.seconds + nextSession.seconds,
                themes = nextProfile.themes + session.themeId,
                dailyDays = if (session.mode == GameMode.DAILY) nextProfile.dailyDays + session.day else nextProfile.dailyDays,
                history = (listOf(HistoryEntry(title, session.difficulty, session.seconds, xp, session.mode, session.day)) + nextProfile.history).take(50),
            )
        }
        val unlocked = buildSet {
            if (nextProfile.wins >= 1) add("first")
            if (nextProfile.words >= 50) add("words50")
            if (nextProfile.themes.size >= 5) add("themes5")
            if (nextSession.completed && nextSession.hintsUsed == 0) add("nohint")
            if (nextSession.completed && nextSession.difficulty == Difficulty.HARD) add("hard")
            if (nextProfile.dailyDays.size >= 3) add("daily3")
            if (nextProfile.wins >= 10) add("wins10")
            if (nextProfile.words >= 200) add("words200")
        }
        return nextProfile.copy(achievements = nextProfile.achievements + unlocked) to nextSession
    }
}
