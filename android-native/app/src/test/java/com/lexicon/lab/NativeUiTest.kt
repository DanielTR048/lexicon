package com.lexicon.lab

import android.app.Application
import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.annotation.LooperMode
import java.io.File

/** Runs the actual Compose UI on a local Android runtime, without a server or WebView. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h873dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@LooperMode(LooperMode.Mode.PAUSED)
class NativeUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private lateinit var model: GameViewModel

    @Before fun configure() {
        compose.runOnIdle {
            model = ViewModelProvider(compose.activity)[GameViewModel::class.java]
            val factoryApp = model.getApplication<Application>()
            val providerApp = ApplicationProvider.getApplicationContext<Application>()
            assertSame("The factory must use this activity's application, not a prior test sandbox", providerApp, factoryApp)
            model.selectPlayer("daniel")
            if (!model.state.settings.reduceMotion) model.toggleReduceMotion()
        }
    }

    @Test fun bundledCatalogLoadsAndNativeNavigationWorks() {
        compose.runOnIdle {
            assertEquals(42, model.state.themes.size)
            assertEquals(756, model.state.themes.sumOf { it.words.size })
            assertNull(model.state.errorMessage)
        }
        compose.onNodeWithText("Temas", useUnmergedTree = true).performClick()
        compose.onNodeWithText("Mentes brilhantes").assertExists()
        screenshot("android-catalog")
        compose.onNodeWithText("Caderno", useUnmergedTree = true).performClick()
        compose.runOnIdle { assertEquals(Screen.NOTEBOOK, model.state.screen) }
        compose.onNodeWithText("Perfil", useUnmergedTree = true).performClick()
        compose.runOnIdle { assertEquals(Screen.PROFILE, model.state.screen) }
        compose.onNodeWithText("Laboratório", useUnmergedTree = true).performClick()
        screenshot("android-home")
    }

    @Test fun playerPickerOpensLarissaAndReturnsToDaniel() {
        compose.runOnIdle { model.showPlayerPicker() }
        compose.onNodeWithContentDescription("Jogar como Daniel").assertExists()
        compose.onNodeWithContentDescription("Jogar como Larissa").assertExists()
        screenshot("android-profiles")
        compose.onNodeWithContentDescription("Jogar como Larissa").performClick()
        compose.runOnIdle { assertEquals("larissa", model.state.activePlayerId); assertEquals(0, model.state.profile.words) }
        compose.runOnIdle { model.showPlayerPicker() }
        compose.onNodeWithContentDescription("Jogar como Daniel").performClick()
        compose.runOnIdle { assertEquals("daniel", model.state.activePlayerId) }
    }

    @Test fun realEndpointTapsCompleteAnOfflineGameAndPersistExactlyOnce() {
        compose.runOnIdle { model.setDifficulty(Difficulty.EASY); model.startGame("mentes-brilhantes") }
        compose.waitForIdle()
        screenshot("android-game")
        val placements = model.state.session!!.puzzle.placements
        placements.forEach { placement ->
            tapCell(placement.cells.first())
            tapCell(placement.cells.last())
            compose.runOnIdle { assertTrue(model.state.session!!.found.containsKey(placement.normalized)) }
        }
        compose.runOnIdle {
            assertTrue(model.state.session!!.completed)
            assertEquals(8, model.state.session!!.foundCount)
            assertEquals(1, model.state.profile.wins)
        }
        screenshot("android-victory")
        val application = model.getApplication<Application>()
        compose.runOnIdle {
            assertNotNull(application.getSharedPreferences("lexicon_native_v1", 0).getString("players", null))
            val reloaded = GameViewModel(application).apply { selectPlayer("daniel") }
            assertEquals(model.state.profile.xp, reloaded.state.profile.xp)
            assertEquals(model.state.session!!.found, reloaded.state.session!!.found)
            reloaded.resumeGame()
            assertEquals(1, reloaded.state.profile.wins)
            assertEquals(model.state.profile.xp, reloaded.state.profile.xp)
        }
    }

    @Test fun unfinishedGameSurvivesNewViewModelWithHintAndFavorites() {
        compose.runOnIdle {
            model.startGame("mentes-brilhantes")
            model.toggleFavorite("mentes-brilhantes")
            model.requestHint()
            val word = model.state.session!!.puzzle.placements.first()
            model.tapCell(word.cells.first()); model.tapCell(word.cells.last())
            model.onBackground()
            val application = model.getApplication<Application>()
            val saved = application
                .getSharedPreferences("lexicon_native_v1", android.content.Context.MODE_PRIVATE).getString("players", null)
            assertNotNull(saved)
            val reloaded = GameViewModel(application).apply { selectPlayer("daniel") }
            assertNotNull("error=${reloaded.state.errorMessage}; themes=${reloaded.state.themes.size}; saved=$saved", reloaded.state.session)
            assertTrue(reloaded.state.session!!.paused)
            assertEquals(model.state.session!!.puzzle, reloaded.state.session!!.puzzle)
            assertEquals(model.state.session!!.found, reloaded.state.session!!.found)
            assertEquals(1, reloaded.state.session!!.hintsUsed)
            assertTrue("mentes-brilhantes" in reloaded.state.favorites)
        }
    }

    @Test fun physicalDragKeepsTheFirstCellAndRejectsBentSelections() {
        compose.runOnIdle { model.startGame("mentes-brilhantes") }
        val word = model.state.session!!.puzzle.placements.first()
        fun center(cell: Cell): androidx.compose.ui.geometry.Offset {
            val letter = model.state.session!!.puzzle.grid[cell.row][cell.col]
            return compose.onNodeWithContentDescription("$letter, linha ${cell.row + 1}, coluna ${cell.col + 1}", substring = true)
                .fetchSemanticsNode().boundsInRoot.center
        }
        val start = center(word.cells.first())
        val end = center(word.cells.last())
        compose.onRoot().performTouchInput { swipe(start, end, 600) }
        compose.runOnIdle { assertTrue("The physical drag must retain its original down cell", word.normalized in model.state.session!!.found) }
        tapCell(Cell(0, 0)); tapCell(Cell(1, 2))
        compose.runOnIdle {
            assertEquals(FeedbackKind.ERROR, model.state.feedback?.kind)
            assertEquals(1, model.state.session!!.foundCount)
        }
    }

    private fun tapCell(cell: Cell) {
        val letter = model.state.session!!.puzzle.grid[cell.row][cell.col]
        compose.onNodeWithContentDescription("$letter, linha ${cell.row + 1}, coluna ${cell.col + 1}", substring = true)
            .performTouchInput { click(center) }
    }

    private fun screenshot(name: String) {
        compose.waitForIdle()
        val directory = File("build/reports/native-screenshots").apply { mkdirs() }
        // PixelCopy waits for a device GPU frame. Draw the same native View tree
        // onto Robolectric's native Canvas for deterministic desktop inspection.
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(Canvas(bitmap))
            File(directory, "$name.png").outputStream().use { output ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
            }
            bitmap.recycle()
        }
    }
}
