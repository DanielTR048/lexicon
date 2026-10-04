package com.lexicon.lab

import android.animation.ValueAnimator
import android.media.AudioManager
import android.media.ToneGenerator
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun LexiconApp(vm: GameViewModel) {
    var systemMotionEnabled by remember { mutableStateOf(ValueAnimator.areAnimatorsEnabled()) }
    val rawState = vm.state
    val state = rawState.copy(settings = rawState.settings.copy(reduceMotion = rawState.settings.reduceMotion || !systemMotionEnabled))
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) vm.onBackground()
            if (event == Lifecycle.Event.ON_START) { systemMotionEnabled = ValueAnimator.areAnimatorsEnabled(); vm.onForeground() }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(vm, lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) { delay(1_000); vm.tick() }
        }
    }
    key(state.activePlayerId) {
        if (state.activePlayerId == null) PlayerPicker(state, vm)
        else ActivePlayerApp(vm, rawState, state)
    }
    if (state.syncConflict) {
        AlertDialog(onDismissRequest = {}, title = { Text("Qual progresso continuar?") },
            text = { Text("Este perfil foi jogado em dois aparelhos. ${state.syncStatus} Escolha qual continuar. A outra versão será guardada como cópia neste aparelho.") },
            confirmButton = { TextButton(onClick = { vm.syncNow("cloud") }, enabled = !state.syncing) { Text("CONTINUAR ONLINE") } },
            dismissButton = { TextButton(onClick = { vm.syncNow("local") }, enabled = !state.syncing) { Text("USAR ESTE APARELHO") } }, containerColor = PaperBright)
    }
}

@Composable
private fun ActivePlayerApp(vm: GameViewModel, rawState: GameUiState, state: GameUiState) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var settingsOpen by rememberSaveable { mutableStateOf(false) }
    var syncOpen by rememberSaveable { mutableStateOf(false) }
    var howToOpen by rememberSaveable { mutableStateOf(false) }
    var pausedForOverlay by rememberSaveable { mutableStateOf(false) }
    var pendingLaunch by remember { mutableStateOf<LaunchRequest?>(null) }
    var dismissedVictory by rememberSaveable { mutableStateOf("") }
    val haptic = LocalHapticFeedback.current
    val tone = remember(state.settings.sound) {
        if (state.settings.sound) runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 25) }.getOrNull() else null
    }
    DisposableEffect(tone) { onDispose { tone?.release() } }
    LaunchedEffect(state.feedback?.id) {
        val feedback = state.feedback ?: return@LaunchedEffect
        if (feedback.kind in listOf(FeedbackKind.SUCCESS, FeedbackKind.COMPLETE, FeedbackKind.ERROR, FeedbackKind.HINT)) {
            if (state.settings.haptics) haptic.performHapticFeedback(
                if (feedback.kind == FeedbackKind.ERROR) HapticFeedbackType.TextHandleMove else HapticFeedbackType.LongPress,
            )
            tone?.startTone(if (feedback.kind == FeedbackKind.ERROR) ToneGenerator.TONE_PROP_NACK else ToneGenerator.TONE_PROP_ACK, 100)
        }
        if (feedback.kind != FeedbackKind.COMPLETE) { delay(3_800); vm.dismissFeedback() }
    }
    BackHandler(state.screen == Screen.GAME) {
        vm.navigate(Screen.HOME)
        tab = 0
    }
    BackHandler(state.screen != Screen.GAME && tab != 0) { tab = 0; vm.navigate(Screen.HOME) }
    fun openOverlay(settings: Boolean) {
        val session = vm.state.session
        if (vm.state.screen == Screen.GAME && session != null && !session.paused && !session.completed) {
            pausedForOverlay = true
            vm.togglePause()
        }
        if (settings) settingsOpen = true else howToOpen = true
    }
    fun closeOverlay() {
        settingsOpen = false
        howToOpen = false
        if (pausedForOverlay && vm.state.screen == Screen.GAME && vm.state.session?.paused == true) vm.togglePause()
        pausedForOverlay = false
    }
    fun launch(request: LaunchRequest) {
        if (request.daily) vm.startDaily() else request.themeId?.let { vm.startGame(it) }
    }
    fun requestLaunch(request: LaunchRequest) {
        val current = vm.state.session
        val resumesDaily = request.daily && current?.mode == GameMode.DAILY && current.day == java.time.LocalDate.now().toString()
        if (current != null && current.started && !current.completed && !resumesDaily) pendingLaunch = request else launch(request)
    }

    Scaffold(
        containerColor = Paper,
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            Column(Modifier.background(Paper).statusBarsPadding()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (state.screen == Screen.GAME) {
                        IconButton(onClick = { vm.navigate(Screen.HOME); tab = 0 }, modifier = Modifier.semantics { contentDescription = "Voltar ao laboratório" }) {
                            Text("←", fontSize = 27.sp, color = Forest)
                        }
                    } else {
                        Box(Modifier.size(35.dp).clip(RoundedCornerShape(11.dp)).background(Forest), contentAlignment = Alignment.Center) {
                            Text("L", color = PaperBright, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                        }
                        Spacer(Modifier.width(10.dp))
                    }
                    Column(Modifier.weight(1f)) {
                        Text("lexicon", fontSize = 26.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif, color = Forest, letterSpacing = (-1).sp)
                        Text("LABORATÓRIO DE PALAVRAS", style = MaterialTheme.typography.labelSmall, color = MutedInk, fontSize = 8.sp)
                    }
                    Surface(color = Sage, shape = RoundedCornerShape(20.dp)) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("✦ ", color = Gold)
                            AnimatedNumber(state.profile.xp, state.settings.reduceMotion)
                            Text(" XP", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    IconButton(onClick = { openOverlay(true) }, modifier = Modifier.semantics { contentDescription = "Abrir ajustes" }) {
                        Text("⚙", fontSize = 25.sp, color = Forest)
                    }
                }
                TextButton(onClick = vm::showPlayerPicker, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).semantics { contentDescription = "Trocar de perfil" }) {
                    PlayerAvatar(state.activePlayer?.avatar ?: "atom", Modifier.size(24.dp).clip(RoundedCornerShape(7.dp)))
                    Spacer(Modifier.width(8.dp))
                    Text(state.activePlayer?.name ?: "Meu perfil", maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelLarge)
                    Text("TROCAR PERFIL  ⇄", style = MaterialTheme.typography.labelSmall)
                }
                TextButton(onClick = { syncOpen = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text(state.syncStatus + "  ·  CONECTAR APARELHOS", style = MaterialTheme.typography.labelSmall)
                }
                HorizontalDivider(color = PaperLine)
            }
        },
        bottomBar = {
            if (state.screen != Screen.GAME) {
                NavigationBar(containerColor = PaperBright, tonalElevation = 0.dp) {
                    listOf("Laboratório" to "⌂", "Temas" to "▦", "Caderno" to "▤", "Perfil" to "◎").forEachIndexed { index, item ->
                        NavigationBarItem(
                            selected = tab == index,
                            onClick = {
                                tab = index
                                vm.navigate(when (index) { 2 -> Screen.NOTEBOOK; 3 -> Screen.PROFILE; else -> Screen.HOME })
                            },
                            icon = { Text(item.second, fontSize = 24.sp, fontWeight = FontWeight.Bold) },
                            label = { Text(item.first, fontSize = 10.sp, maxLines = 1) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Forest, indicatorColor = Sage, selectedTextColor = Forest, unselectedTextColor = MutedInk),
                        )
                    }
                }
            }
        },
        snackbarHost = {
            AnimatedVisibility(
                visible = state.feedback != null && state.feedback.kind != FeedbackKind.COMPLETE,
                enter = fadeIn(tween(if (state.settings.reduceMotion) 0 else 180)) + slideInVertically(tween(if (state.settings.reduceMotion) 0 else 220)) { it / 2 },
                exit = fadeOut(tween(if (state.settings.reduceMotion) 0 else 120)),
            ) {
                state.feedback?.let { FeedbackCard(it, vm::dismissFeedback) }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            if (state.screen == Screen.GAME && state.session != null) {
                GameScreen(state, vm, onHelp = { openOverlay(false) })
            } else when (tab) {
                1 -> ThemeScreen(state, vm, onStart = { requestLaunch(LaunchRequest(themeId = it)) })
                2 -> NotebookScreen(state)
                3 -> ProfileScreen(state, onSettings = { openOverlay(true) }, onSwitchPlayer = vm::showPlayerPicker)
                else -> HomeScreen(state, vm, onThemes = { tab = 1 }, onHelp = { openOverlay(false) }, onStart = { requestLaunch(LaunchRequest(themeId = it)) }, onDaily = { requestLaunch(LaunchRequest(daily = true)) })
            }
        }
    }

    val session = state.session
    if (state.screen == Screen.GAME && session != null && session.paused && !session.completed && !settingsOpen && !howToOpen) {
        AlertDialog(
            onDismissRequest = vm::togglePause,
            icon = { Text("Ⅱ", fontSize = 30.sp, color = Forest) },
            title = { Text("Uma pausa para pensar.", fontFamily = FontFamily.Serif) },
            text = { Text("Seu experimento está salvo. O tempo fica parado enquanto você descansa.") },
            confirmButton = { TextButton(onClick = vm::togglePause) { Text("CONTINUAR") } },
            dismissButton = { TextButton(onClick = { vm.navigate(Screen.HOME); tab = 0 }) { Text("LABORATÓRIO") } },
            containerColor = PaperBright,
        )
    }
    if (state.screen == Screen.GAME && session?.completed == true && dismissedVictory != session.puzzle.seed) {
        VictoryDialog(session, state.currentTheme?.title ?: "Experimento", state.settings.reduceMotion,
            onAgain = { dismissedVictory = session.puzzle.seed; vm.newRound() },
            onLibrary = { dismissedVictory = session.puzzle.seed; vm.navigate(Screen.HOME); tab = 1 },
        )
    }
    if (settingsOpen) SettingsDialog(rawState.settings, vm, onDismiss = { closeOverlay() })
    if (syncOpen) DeviceSyncDialog(rawState, vm) { syncOpen = false; vm.dismissError() }
    if (howToOpen) HowToDialog { closeOverlay() }
    pendingLaunch?.let { request ->
        AlertDialog(onDismissRequest = { pendingLaunch = null }, title = { Text("Uma nova descoberta?") },
            text = { Text("Você tem um experimento em andamento. Começar outro substituirá essa partida; o caderno e suas conquistas continuam salvos.") },
            confirmButton = { TextButton(onClick = { pendingLaunch = null; launch(request) }) { Text("COMEÇAR OUTRO") } },
            dismissButton = { TextButton(onClick = { pendingLaunch = null; vm.resumeGame() }) { Text("RETOMAR ATUAL") } },
            containerColor = PaperBright,
        )
    }
    state.errorMessage?.let { error ->
        AlertDialog(
            onDismissRequest = vm::dismissError, title = { Text(if (state.themes.isEmpty()) "Não foi possível abrir a biblioteca" else "Uma nota do laboratório") },
            text = { Text(error) }, confirmButton = { TextButton(onClick = vm::dismissError) { Text("ENTENDI") } },
        )
    }
}

@Composable
private fun HomeScreen(state: GameUiState, vm: GameViewModel, onThemes: () -> Unit, onHelp: () -> Unit, onStart: (String) -> Unit, onDaily: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item {
            PaperCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1.15f)) {
                        Eyebrow("CURIOSIDADE EM ESTADO PURO")
                        Spacer(Modifier.height(10.dp))
                        Text("Sua mente.\nNovas órbitas.", style = MaterialTheme.typography.displaySmall, fontSize = 33.sp, lineHeight = 36.sp)
                        Spacer(Modifier.height(10.dp))
                        Text("Palavras escondidas.\nGrandes descobertas.", style = MaterialTheme.typography.bodyMedium, color = MutedInk)
                    }
                    ScientistArt(state.settings.reduceMotion, Modifier.weight(.85f).height(180.dp))
                }
                Spacer(Modifier.height(18.dp))
                PrimaryButton("EXPLORAR OS TEMAS  →", onThemes)
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    Text("${state.themes.size} temas  ·  100% offline  ·  sem anúncios", style = MaterialTheme.typography.labelSmall, color = MutedInk, fontSize = 9.sp)
                }
            }
        }
        state.session?.takeIf { !it.completed }?.let { session ->
            item {
                Surface(onClick = vm::resumeGame, color = Sage, shape = RoundedCornerShape(18.dp)) {
                    Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("▶", color = Forest, fontSize = 25.sp)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Eyebrow("SEU EXPERIMENTO CONTINUA")
                            Text(state.currentTheme?.title ?: "Retomar partida", style = MaterialTheme.typography.titleMedium)
                            Text("${session.foundCount}/${session.totalCount} palavras · ${formatTime(session.seconds)}", color = MutedInk, style = MaterialTheme.typography.bodyMedium)
                        }
                        Text("→", fontSize = 24.sp)
                    }
                }
            }
        }
        item {
            Surface(color = Forest, shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.padding(22.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("EXPERIMENTO DO DIA", style = MaterialTheme.typography.labelLarge, color = PaperBright.copy(alpha = .7f))
                        Text("✦", color = Color(0xFFF0CC7D), fontSize = 20.sp)
                    }
                    Spacer(Modifier.height(10.dp))
                    Text("Um pequeno ritual\npara uma grande mente.", style = MaterialTheme.typography.headlineMedium, color = PaperBright)
                    Spacer(Modifier.height(10.dp))
                    Text("Um tema surpresa a cada dia. Continue sua sequência de descobertas.", color = PaperBright.copy(alpha = .78f), style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(18.dp))
                    Button(onClick = onDaily, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = PaperBright, contentColor = Forest), modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp)) {
                        Text("ACEITAR O DESAFIO   →", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("DESCOBERTAS", state.profile.words.toString(), Modifier.weight(1f))
                StatTile("EXPERIMENTOS", state.profile.wins.toString(), Modifier.weight(1f))
                StatTile("DIAS SEGUIDOS", state.profile.streak().toString(), Modifier.weight(1f))
            }
        }
        item { SectionTitle("Experimentos da casa", "Um universo para cada curiosidade.") }
        items(state.themes.take(3), key = { "home-${it.id}" }) { theme ->
            ThemeCard(theme, theme.id in state.favorites, state.selectedDifficulty, { onStart(theme.id) }, { vm.toggleFavorite(theme.id) })
        }
        item { OutlinedButton(onClick = onHelp, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = RoundedCornerShape(12.dp)) { Text("COMO FUNCIONA O LABORATÓRIO") } }
        item { FooterNote() }
    }
}

@Composable
private fun ThemeScreen(state: GameUiState, vm: GameViewModel, onStart: (String) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { SectionTitle("Escolha sua órbita.", "Heróis, ciência, história e ideias que atravessam o tempo.") }
        item {
            OutlinedTextField(value = state.query, onValueChange = vm::setQuery, modifier = Modifier.fillMaxWidth(), singleLine = true,
                placeholder = { Text("Buscar tema ou palavra…") }, label = { Text("Pesquisar na biblioteca") }, shape = RoundedCornerShape(14.dp),
                trailingIcon = { if (state.query.isNotEmpty()) IconButton(onClick = { vm.setQuery("") }) { Text("×", fontSize = 24.sp, modifier = Modifier.semantics { contentDescription = "Limpar pesquisa" }) } },
            )
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(selected = state.selectedCategory == null, onClick = { vm.setCategory(null) }, label = { Text("Todos") }) }
                items(state.categories, key = { it.id }) { category -> FilterChip(selected = state.selectedCategory == category.id, onClick = { vm.setCategory(category.id) }, label = { Text(category.label) }) }
            }
        }
        item {
            PaperCard {
                Eyebrow("INTENSIDADE DO EXPERIMENTO")
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Difficulty.entries.forEach { difficulty ->
                        val active = state.selectedDifficulty == difficulty
                        Surface(onClick = { vm.setDifficulty(difficulty) }, color = if (active) Forest else Paper, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).semantics { selected = active }) {
                            Column(Modifier.padding(vertical = 13.dp, horizontal = 3.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(difficulty.label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (active) PaperBright else Forest, maxLines = 1)
                                Text("${difficulty.size} × ${difficulty.size}", fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = if (active) PaperBright.copy(alpha = .65f) else MutedInk)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(7.dp))
                Text(if (state.selectedDifficulty == Difficulty.EASY) "Horizontal e vertical · ${state.selectedDifficulty.count} palavras" else "Todas as direções · ${state.selectedDifficulty.count} palavras", style = MaterialTheme.typography.bodyMedium, fontSize = 11.sp, color = MutedInk)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${state.filteredThemes.size} TEMAS DISPONÍVEIS", style = MaterialTheme.typography.labelSmall, color = MutedInk)
                FilterChip(selected = state.favoritesOnly, onClick = vm::toggleFavoritesOnly, label = { Text("★ Favoritos", fontSize = 12.sp) })
            }
        }
        if (state.filteredThemes.isEmpty()) item { EmptyState("Nenhum tema por aqui.", "Experimente outra palavra ou altere os filtros.", "⌕") }
        items(state.filteredThemes, key = { it.id }) { theme -> ThemeCard(theme, theme.id in state.favorites, state.selectedDifficulty, { onStart(theme.id) }, { vm.toggleFavorite(theme.id) }) }
        item { FooterNote() }
    }
}

@Composable
private fun GameScreen(state: GameUiState, vm: GameViewModel, onHelp: () -> Unit) {
    val session = state.session ?: return
    var enlarged by rememberSaveable(session.puzzle.seed) { mutableStateOf(false) }
    var showClues by rememberSaveable { mutableStateOf(false) }
    var pendingNewRound by remember { mutableStateOf(false) }
    val progress by animateFloatAsState(session.foundCount.toFloat() / session.totalCount.coerceAtLeast(1), tween(if (state.settings.reduceMotion) 0 else 350), label = "discovery progress")
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp, 18.dp, 12.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(15.dp)) {
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Eyebrow(if (session.mode == GameMode.DAILY) "EXPERIMENTO DO DIA" else "EXPERIMENTO EM ANDAMENTO")
                    Spacer(Modifier.height(5.dp))
                    Text(state.currentTheme?.title ?: "Laboratório", style = MaterialTheme.typography.headlineMedium)
                }
                IconButton(onClick = onHelp, modifier = Modifier.semantics { contentDescription = "Como selecionar palavras" }) { Text("?", color = Forest, fontSize = 22.sp, fontWeight = FontWeight.Bold) }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatTile("PALAVRAS", "${session.foundCount}/${session.totalCount}", Modifier.weight(1f))
                StatTile("TEMPO", formatTime(session.seconds), Modifier.weight(1f))
                StatTile("PONTOS", session.score.toString(), Modifier.weight(1f))
            }
        }
        item {
            LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth().height(5.dp).clip(CircleShape), color = Forest, trackColor = PaperLine)
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text(if (enlarged) "TOQUE NAS DUAS PONTAS" else "ARRASTE OU TOQUE NAS PONTAS", style = MaterialTheme.typography.labelSmall, fontSize = 9.sp, color = MutedInk, modifier = Modifier.weight(1f))
                TextButton(onClick = { vm.cancelSelection(); enlarged = !enlarged }) { Text(if (enlarged) "⊖ REDUZIR" else "⊕ AMPLIAR", fontSize = 11.sp) }
            }
            NativeBoard(session.puzzle, session.found, state.selection, session.hintCell,
                error = state.feedback?.kind == FeedbackKind.ERROR,
                enlarged = enlarged, reducedMotion = state.settings.reduceMotion,
                enabled = !session.paused && !session.completed,
                onTap = vm::tapCell, onDragStart = vm::beginSelection, onDragMove = vm::updateSelection,
                onDragEnd = vm::endSelection, onDragCancel = vm::cancelSelection,
            )
            if (enlarged) {
                Spacer(Modifier.height(7.dp))
                Text("Deslize para explorar. Toque na primeira e na última letra da palavra.", style = MaterialTheme.typography.bodyMedium, fontSize = 11.sp, color = MutedInk, modifier = Modifier.padding(horizontal = 4.dp))
            }
            if (state.selection.isNotEmpty()) {
                Row(Modifier.fillMaxWidth().padding(top = 5.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(state.selection.joinToString("") { session.puzzle.grid[it.row][it.col].toString() }, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = Forest, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    TextButton(onClick = vm::cancelSelection) { Text("LIMPAR", fontSize = 10.sp) }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = vm::requestHint, enabled = !session.completed && session.hintsRemaining > 0, modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(4.dp)) {
                    Text("✦ DICA (${session.hintsRemaining})", fontSize = 11.sp)
                }
                OutlinedButton(onClick = vm::togglePause, enabled = !session.completed, modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(4.dp)) {
                    Text("Ⅱ PAUSAR", fontSize = 11.sp)
                }
                OutlinedButton(onClick = { pendingNewRound = true }, modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(4.dp)) {
                    Text("↻ NOVO", fontSize = 11.sp)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Palavras em órbita", style = MaterialTheme.typography.titleLarge)
                TextButton(onClick = { showClues = !showClues }) { Text(if (showClues) "OCULTAR PISTAS" else "VER PISTAS", fontSize = 10.sp) }
            }
        }
        items(session.puzzle.placements, key = { it.normalized }) { placement ->
            val discovered = placement.normalized in session.found
            val background by animateColorAsState(if (discovered) Sage else PaperBright, tween(if (state.settings.reduceMotion) 0 else 300), label = "word discovery")
            Surface(color = background, shape = RoundedCornerShape(12.dp)) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (discovered) "✓" else "○", color = if (discovered) Forest else PaperLine, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(placement.word, fontWeight = FontWeight.SemiBold, color = if (discovered) MutedInk else Ink,
                            textDecoration = if (discovered) TextDecoration.LineThrough else TextDecoration.None)
                        if (showClues || discovered) {
                            Spacer(Modifier.height(3.dp))
                            Text(placement.clue, style = MaterialTheme.typography.bodyMedium, color = MutedInk, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
    if (pendingNewRound) AlertDialog(
        onDismissRequest = { pendingNewRound = false }, title = { Text("Começar outro experimento?") },
        text = { Text("A partida atual será substituída. Suas descobertas e conquistas já registradas continuam no perfil.") },
        confirmButton = { TextButton(onClick = { pendingNewRound = false; vm.newRound() }) { Text("COMEÇAR") } },
        dismissButton = { TextButton(onClick = { pendingNewRound = false }) { Text("CONTINUAR ESTA") } },
    )
}

@Composable
private fun NotebookScreen(state: GameUiState) {
    var query by rememberSaveable { mutableStateOf("") }
    val discoveries = state.profile.discoveries.filter { PuzzleEngine.normalizeWord("${it.word} ${it.clue} ${it.themeTitle}").contains(PuzzleEngine.normalizeWord(query)) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { SectionTitle("Caderno de descobertas", "Cada palavra encontrada guarda uma nova ideia.") }
        item { OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Buscar no caderno") }, singleLine = true, shape = RoundedCornerShape(14.dp)) }
        item { Text("${state.profile.discoveries.size} IDEIAS COLECIONADAS", style = MaterialTheme.typography.labelSmall, color = MutedInk) }
        if (discoveries.isEmpty()) item {
            EmptyState(if (query.isBlank()) "Seu próximo eureka começa aqui." else "Nenhuma descoberta encontrada.",
                if (query.isBlank()) "Encontre palavras em uma partida para preencher seu caderno. Ele fica salvo no celular." else "Tente buscar por outra palavra.", "✎")
        }
        items(discoveries, key = { "${it.word}-${it.themeTitle}" }) { discovery ->
            PaperCard {
                Eyebrow(discovery.themeTitle.ifBlank { "NOTAS DO LABORATÓRIO" })
                Spacer(Modifier.height(6.dp))
                Text(discovery.word, style = MaterialTheme.typography.headlineMedium, fontSize = 23.sp)
                Spacer(Modifier.height(7.dp))
                Text(discovery.clue, style = MaterialTheme.typography.bodyMedium, color = MutedInk)
            }
        }
    }
}

@Composable
private fun ProfileScreen(state: GameUiState, onSettings: () -> Unit, onSwitchPlayer: () -> Unit) {
    val profile = state.profile
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item {
            PaperCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    PlayerAvatar(state.activePlayer?.avatar ?: "atom", Modifier.size(66.dp).clip(RoundedCornerShape(18.dp)))
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) { Eyebrow("CREDENCIAL DO LABORATÓRIO"); Spacer(Modifier.height(5.dp)); Text(state.activePlayer?.name ?: "Meu perfil", style = MaterialTheme.typography.headlineMedium, fontSize = 22.sp); Text("${profile.level} · ${profile.xp} XP", color = MutedInk, fontSize = 12.sp) }
                }
                Spacer(Modifier.height(15.dp))
                Text("Seu progresso fica separado dos outros perfis e salvo neste aparelho.", style = MaterialTheme.typography.bodyMedium, color = MutedInk)
                TextButton(onClick = onSwitchPlayer) { Text("ESCOLHER OUTRO PERFIL  →") }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatTile("VITÓRIAS", profile.wins.toString(), Modifier.weight(1f))
                StatTile("PALAVRAS", profile.words.toString(), Modifier.weight(1f))
                StatTile("TEMAS", profile.themes.size.toString(), Modifier.weight(1f))
            }
        }
        item { SectionTitle("Pequenos grandes feitos", "${profile.achievements.size} de ${ACHIEVEMENTS.size} conquistas desbloqueadas.") }
        items(ACHIEVEMENTS, key = { it.id }) { achievement ->
            val unlocked = achievement.id in profile.achievements
            Surface(color = if (unlocked) Sage else PaperBright, shape = RoundedCornerShape(14.dp)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).clip(CircleShape).background(if (unlocked) Forest else Paper), contentAlignment = Alignment.Center) {
                        Text(if (unlocked) "✦" else "○", color = if (unlocked) PaperBright else MutedInk, fontSize = 22.sp)
                    }
                    Spacer(Modifier.width(13.dp))
                    Column(Modifier.weight(1f)) { Text(achievement.title, style = MaterialTheme.typography.titleMedium); Text(achievement.description, style = MaterialTheme.typography.bodyMedium, fontSize = 12.sp, color = MutedInk) }
                    if (unlocked) Text("✓", color = Forest, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { contentDescription = "Desbloqueada" })
                }
            }
        }
        if (profile.history.isNotEmpty()) {
            item { SectionTitle("Últimos experimentos", "Um registro das suas expedições.") }
            items(profile.history.take(10)) { entry ->
                Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(entry.title, fontWeight = FontWeight.SemiBold); Text("${entry.difficulty.label} · ${formatTime(entry.seconds)} · ${entry.day}", fontSize = 11.sp, color = MutedInk) }
                    Text("+${entry.xp} XP", style = MaterialTheme.typography.labelLarge, color = Forest)
                }
            }
        }
        item { OutlinedButton(onClick = onSettings, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = RoundedCornerShape(12.dp)) { Text("AJUSTES DO LABORATÓRIO") } }
        item { FooterNote() }
    }
}

@Composable
private fun ThemeCard(theme: Theme, favorite: Boolean, difficulty: Difficulty, onStart: () -> Unit, onFavorite: () -> Unit) {
    Surface(color = PaperBright, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, PaperLine)) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(Modifier.size(45.dp).clip(RoundedCornerShape(13.dp)).background(if (theme.color == "coral") Coral.copy(alpha = .13f) else Sage), contentAlignment = Alignment.Center) {
                    Text(categorySymbol(theme.category), fontSize = 25.sp, color = if (theme.color == "coral") Coral else Forest)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(theme.title, style = MaterialTheme.typography.titleLarge, fontSize = 18.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(theme.description, style = MaterialTheme.typography.bodyMedium, color = MutedInk, fontSize = 12.sp)
                }
                IconButton(onClick = onFavorite, modifier = Modifier.size(48.dp).semantics { contentDescription = if (favorite) "Remover ${theme.title} dos favoritos" else "Favoritar ${theme.title}" }) {
                    Text(if (favorite) "★" else "☆", color = if (favorite) Gold else MutedInk, fontSize = 25.sp)
                }
            }
            Spacer(Modifier.height(15.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${theme.words.size} PALAVRAS\n${difficulty.label.uppercase(Locale.ROOT)}", style = MaterialTheme.typography.labelSmall, color = MutedInk, lineHeight = 17.sp, modifier = Modifier.weight(1f))
                Button(onClick = onStart, shape = RoundedCornerShape(11.dp), modifier = Modifier.heightIn(min = 48.dp)) { Text("JOGAR  →", fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold) }
            }
        }
    }
}

@Composable
private fun VictoryDialog(session: GameSession, title: String, reducedMotion: Boolean, onAgain: () -> Unit, onLibrary: () -> Unit) {
    AlertDialog(
        onDismissRequest = onLibrary,
        icon = {
            Box(Modifier.size(110.dp), contentAlignment = Alignment.Center) {
                if (!reducedMotion) CelebrationDots()
                Text("✦", fontSize = 65.sp, color = Gold)
            }
        },
        title = { Text("Eureka!", style = MaterialTheme.typography.displaySmall, color = Forest) },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Você concluiu $title.", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(12.dp))
                Text("${session.totalCount} palavras · ${formatTime(session.seconds)}", color = MutedInk)
                Spacer(Modifier.height(14.dp))
                Text("+${session.earnedXP} XP", color = Forest, fontSize = 29.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text("Mais um experimento para a sua coleção de descobertas.", color = MutedInk, style = MaterialTheme.typography.bodyMedium)
            }
        },
        confirmButton = { TextButton(onClick = onAgain) { Text("JOGAR NOVAMENTE") } },
        dismissButton = { TextButton(onClick = onLibrary) { Text("OUTROS TEMAS") } },
        containerColor = PaperBright,
    )
}

@Composable
private fun SettingsDialog(settings: Settings, vm: GameViewModel, onDismiss: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Ajustes do laboratório", fontFamily = FontFamily.Serif) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                SettingSwitch("Sons de descoberta", "Pequenos sinais ao acertar e errar.", settings.sound, vm::toggleSound)
                SettingSwitch("Resposta ao toque", "Vibração suave nas descobertas.", settings.haptics, vm::toggleHaptics)
                SettingSwitch("Reduzir animações", "Menos movimento, a mesma curiosidade.", settings.reduceMotion, vm::toggleReduceMotion)
                Spacer(Modifier.height(10.dp))
                Text("Funciona sem internet desde a primeira abertura. Temas, partidas, caderno e conquistas ficam no aparelho.", color = MutedInk, fontSize = 12.sp)
            }
        }, confirmButton = { TextButton(onClick = onDismiss) { Text("PRONTO") } }, containerColor = PaperBright,
    )
}

@Composable
private fun SettingSwitch(title: String, subtitle: String, checked: Boolean, onToggle: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, color = MutedInk, fontSize = 11.sp, lineHeight = 16.sp) }
        Spacer(Modifier.width(8.dp))
        Switch(checked = checked, onCheckedChange = { onToggle() }, modifier = Modifier.semantics { contentDescription = title })
    }
}

@Composable
private fun HowToDialog(onDismiss: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Manual da curiosidade", fontFamily = FontFamily.Serif) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                Text("01  Arraste da primeira à última letra. Você também pode tocar nas duas pontas da palavra.")
                Text("02  No nível Aprendiz, procure na horizontal e vertical. Os outros níveis também têm diagonais e palavras ao contrário.")
                Text("03  Use Ampliar para letras maiores. Nesse modo, deslize pelo quadro e selecione com dois toques.")
                Text("04  Cada descoberta vai para o caderno. As três dicas destacam uma letra e mostram uma pista.")
                Text("O tempo não é um limite. Explore no seu ritmo.", fontStyle = FontStyle.Italic, color = Forest)
            }
        }, confirmButton = { TextButton(onClick = onDismiss) { Text("VAMOS EXPERIMENTAR") } }, containerColor = PaperBright,
    )
}

@Composable
private fun FeedbackCard(feedback: GameFeedback, onDismiss: () -> Unit) {
    val error = feedback.kind == FeedbackKind.ERROR
    Surface(modifier = Modifier.padding(12.dp).fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }, color = if (error) Color(0xFF8C3E2E) else Forest, shape = RoundedCornerShape(16.dp), shadowElevation = 6.dp) {
        Row(Modifier.padding(start = 16.dp, top = 10.dp, bottom = 10.dp, end = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(if (error) "↻" else "✦", color = if (error) PaperBright else Color(0xFFF0CC7D), fontSize = 25.sp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(feedback.title, fontWeight = FontWeight.Bold, color = PaperBright, fontSize = 14.sp)
                if (feedback.message.isNotBlank()) Text(feedback.message, color = PaperBright.copy(alpha = .82f), fontSize = 12.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            IconButton(onClick = onDismiss, modifier = Modifier.semantics { contentDescription = "Fechar mensagem" }) { Text("×", fontSize = 23.sp, color = PaperBright) }
        }
    }
}

@Composable
private fun PaperCard(content: @Composable ColumnScope.() -> Unit) {
    Surface(color = PaperBright, shape = RoundedCornerShape(20.dp), border = BorderStroke(1.dp, PaperLine)) { Column(Modifier.fillMaxWidth().padding(20.dp), content = content) }
}

@Composable
private fun SectionTitle(title: String, description: String) {
    Column { Text(title, style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.height(6.dp)); Text(description, style = MaterialTheme.typography.bodyMedium, color = MutedInk) }
}

@Composable
private fun Eyebrow(text: String) { Text(text.uppercase(Locale.ROOT), color = MutedInk, style = MaterialTheme.typography.labelSmall, fontSize = 9.sp) }

@Composable
private fun PrimaryButton(label: String, onClick: () -> Unit) {
    Button(onClick = onClick, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp), shape = RoundedCornerShape(12.dp)) { Text(label, style = MaterialTheme.typography.labelLarge) }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, color = PaperBright, shape = RoundedCornerShape(13.dp), border = BorderStroke(1.dp, PaperLine)) {
        Column(Modifier.padding(horizontal = 5.dp, vertical = 13.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Forest)
            Spacer(Modifier.height(3.dp))
            Text(label, fontFamily = FontFamily.Monospace, fontSize = 8.sp, color = MutedInk, maxLines = 1)
        }
    }
}

@Composable
private fun EmptyState(title: String, description: String, glyph: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 35.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(glyph, fontSize = 55.sp, color = Forest)
        Spacer(Modifier.height(15.dp))
        Text(title, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        Text(description, color = MutedInk, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun FooterNote() { Text("FEITO PARA MENTES CURIOSAS.\nLEXICON · LABORATÓRIO DE PALAVRAS", modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = MutedInk, lineHeight = 17.sp) }

@Composable
private fun AnimatedNumber(value: Int, reduceMotion: Boolean) {
    val shown by animateIntAsState(value, tween(if (reduceMotion) 0 else 500), label = "experience count")
    Text(shown.toString(), fontFamily = FontFamily.Monospace, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Forest)
}

@Composable
private fun ScientistArt(reduceMotion: Boolean, modifier: Modifier = Modifier) {
    val offset = if (!reduceMotion) {
        val transition = rememberInfiniteTransition(label = "scientist float")
        val value by transition.animateFloat(-4f, 4f, infiniteRepeatable(tween(2800, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "scientist offset")
        value
    } else 0f
    Image(painterResource(R.drawable.lab_genius), contentDescription = "Cientista com óculos em seu laboratório retrô", contentScale = ContentScale.Fit, modifier = modifier.graphicsLayer { translationY = offset })
}

@Composable
private fun CelebrationDots() {
    val transition = rememberInfiniteTransition(label = "eureka orbit")
    val phase by transition.animateFloat(0f, 6.2831855f, infiniteRepeatable(tween(6000, easing = LinearEasing)), label = "orbit phase")
    Canvas(Modifier.fillMaxSize()) {
        repeat(12) { index ->
            val angle = phase + index * 6.2831855f / 12
            val radius = size.minDimension * .43f
            drawCircle(if (index % 2 == 0) Coral else Forest, if (index % 3 == 0) 5f else 3f,
                center = Offset(size.width / 2 + cos(angle) * radius, size.height / 2 + sin(angle) * radius))
        }
    }
}

private fun categorySymbol(category: String): String = when (category) { "ciencia" -> "⚛"; "ficcao" -> "✧"; "historia" -> "⌛"; "filosofia" -> "∞"; "politica" -> "⚖"; else -> "✎" }
private fun formatTime(seconds: Int): String = "%02d:%02d".format(Locale.ROOT, seconds / 60, seconds % 60)
private data class LaunchRequest(val themeId: String? = null, val daily: Boolean = false)
