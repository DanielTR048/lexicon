package com.lexicon.lab

import android.app.Application
import android.content.Context
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 35])
class GameViewModelTest {
    private lateinit var application: Application

    @Before fun clearSavedProgress() {
        application = RuntimeEnvironment.getApplication()
        application.getSharedPreferences("lexicon_native_v1", Context.MODE_PRIVATE).edit().clear().commit()
    }

    @Test fun timerStartsWithInteractionAndPausesWhenAppLeavesForeground() {
        val vm = GameViewModel(application)
        assertEquals(42, vm.state.themes.size)
        vm.startGame(vm.state.themes.first().id)
        vm.tick()
        assertEquals(0, vm.state.session!!.seconds)
        vm.beginSelection(Cell(0, 0))
        vm.tick()
        assertEquals(1, vm.state.session!!.seconds)
        vm.onBackground()
        vm.tick()
        assertEquals(1, vm.state.session!!.seconds)
        assertTrue(vm.state.session!!.paused)
        val restored = GameViewModel(application)
        assertEquals(1, restored.state.session!!.seconds)
        assertTrue(restored.state.session!!.paused)
        restored.resumeGame()
        restored.tick()
        assertEquals(2, restored.state.session!!.seconds)
        restored.navigate(Screen.NOTEBOOK)
        restored.tick()
        assertEquals(2, restored.state.session!!.seconds)
    }

    @Test fun endpointsSaveExactFoundPathAndProfileAcrossProcessRecreation() {
        val vm = GameViewModel(application)
        vm.startGame(vm.state.themes.first().id)
        val word = vm.state.session!!.puzzle.placements.first()
        vm.tapCell(word.cells.last())
        vm.tapCell(word.cells.first())
        assertEquals(1, vm.state.profile.words)
        assertEquals(word.cells, vm.state.session!!.found[word.normalized])
        val restored = GameViewModel(application)
        assertEquals(vm.state.profile, restored.state.profile)
        assertEquals(vm.state.session!!.puzzle, restored.state.session!!.puzzle)
        assertEquals(vm.state.session!!.found, restored.state.session!!.found)
        assertEquals(1, restored.state.profile.discoveries.size)
    }

    @Test fun hintsRespectPauseAndThreeHintBudget() {
        val vm = GameViewModel(application)
        vm.startGame(vm.state.themes.first().id)
        vm.togglePause()
        vm.requestHint()
        assertEquals(0, vm.state.session!!.hintsUsed)
        vm.togglePause()
        repeat(4) { vm.requestHint() }
        assertEquals(3, vm.state.session!!.hintsUsed)
        assertEquals(0, vm.state.session!!.score)
        assertNotNull(vm.state.session!!.hintCell)
        assertEquals(3, GameViewModel(application).state.session!!.hintsUsed)
    }

    @Test fun invalidDragGivesErrorWithoutChangingProgress() {
        val vm = GameViewModel(application)
        vm.startGame(vm.state.themes.first().id)
        vm.beginSelection(Cell(0, 0))
        vm.updateSelection(Cell(1, 2))
        vm.endSelection()
        assertEquals(FeedbackKind.ERROR, vm.state.feedback!!.kind)
        assertEquals(0, vm.state.profile.words)
        assertTrue(vm.state.session!!.found.isEmpty())
        assertTrue(vm.state.selection.isEmpty())
    }

    @Test fun hintedWordCanBeFoundThenRestoredWithHintHistoryAndNullHighlight() {
        val vm = GameViewModel(application)
        vm.startGame("mentes-brilhantes")
        vm.toggleFavorite("mentes-brilhantes")
        vm.requestHint()
        val word = vm.state.session!!.puzzle.placements.first()
        assertEquals(word.cells.first(), vm.state.session!!.hintCell)
        vm.tapCell(word.cells.first())
        vm.tapCell(word.cells.last())
        assertNull(vm.state.session!!.hintCell)
        assertTrue(word.normalized in vm.state.session!!.hintedWords)
        vm.onBackground()
        val encoded = StoreCodec.encode(SavedGame(profile = vm.state.profile, session = vm.state.session))
        assertEquals(encoded, vm.state.session, StoreCodec.decode(encoded).session)
        val restored = GameViewModel(application)
        assertNotNull("error=${restored.state.errorMessage}; themes=${restored.state.themes.size}; saved=$encoded", restored.state.session)
        assertEquals(vm.state.session, restored.state.session)
        assertTrue("mentes-brilhantes" in restored.state.favorites)
    }
}
