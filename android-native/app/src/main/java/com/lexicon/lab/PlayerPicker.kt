package com.lexicon.lab

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val avatarLabels = linkedMapOf(
    "atom" to "Átomo", "rocket" to "Foguete", "flask" to "Poção",
    "planet" to "Planeta", "brain" to "Mente", "flower" to "Flor",
)

@Composable
internal fun PlayerPicker(state: GameUiState, vm: GameViewModel) {
    var managing by rememberSaveable { mutableStateOf(false) }
    var editingId by rememberSaveable { mutableStateOf<String?>(null) }
    var creating by rememberSaveable { mutableStateOf(false) }
    var connecting by rememberSaveable { mutableStateOf(false) }
    var entered by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { entered = true }
    val entrance by animateFloatAsState(if (entered) 1f else 0f, tween(if (state.settings.reduceMotion) 0 else 360), label = "profile entrance")
    BackHandler(managing && !creating && editingId == null) { managing = false }

    Surface(color = Paper, modifier = Modifier.fillMaxSize()) {
        BoxWithConstraints(Modifier.fillMaxSize().safeDrawingPadding()) {
            val columns = if (maxWidth >= 560.dp) 3 else 2
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 26.dp, vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("lexicon", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 31.sp, color = Forest, letterSpacing = (-1).sp)
                Text("LABORATÓRIO DE PALAVRAS", style = MaterialTheme.typography.labelSmall, color = MutedInk, fontSize = 8.sp)
                Spacer(Modifier.height(34.dp))
                Column(Modifier.widthIn(max = 600.dp).graphicsLayer { alpha = entrance; translationY = (1f - entrance) * 24.dp.toPx() }, horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (managing) "Cada mente,\nseu universo." else "Quem vai\ndescobrir hoje?", style = MaterialTheme.typography.displaySmall, fontSize = 36.sp, lineHeight = 39.sp, color = Forest, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(12.dp))
                    Text(if (managing) "Toque em um perfil para mudar o nome e o avatar." else "Escolha sua credencial e continue de onde parou.", color = MutedInk, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(30.dp))
                    val cards = state.players.map { it.id } + if (state.players.size < 6) listOf("new-player") else emptyList()
                    cards.chunked(columns).forEach { row ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                            row.forEach { id ->
                                val player = state.players.firstOrNull { it.id == id }
                                Column(
                                    Modifier.weight(1f).clip(RoundedCornerShape(19.dp)).clickable {
                                        if (player == null) creating = true
                                        else if (managing) editingId = player.id
                                        else vm.selectPlayer(player.id)
                                    }.padding(4.dp).semantics {
                                        contentDescription = if (player == null) "Adicionar perfil" else if (managing) "Editar perfil ${player.name}" else "Jogar como ${player.name}"
                                    },
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(18.dp)).border(1.dp, PaperLine, RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
                                        if (player == null) {
                                            Box(Modifier.fillMaxSize().background(PaperBright), contentAlignment = Alignment.Center) { Text("+", fontSize = 60.sp, fontWeight = FontWeight.Light, color = MutedInk) }
                                        } else {
                                            PlayerAvatar(player.avatar, Modifier.fillMaxSize())
                                            if (managing) Surface(color = Forest, shape = RoundedCornerShape(8.dp), modifier = Modifier.align(Alignment.BottomEnd).padding(8.dp)) { Text("EDITAR", modifier = Modifier.padding(7.dp), style = MaterialTheme.typography.labelSmall, color = PaperBright) }
                                        }
                                    }
                                    Spacer(Modifier.height(11.dp))
                                    Text(player?.name ?: "Adicionar perfil", style = MaterialTheme.typography.titleMedium, color = Forest, textAlign = TextAlign.Center, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    Spacer(Modifier.height(4.dp))
                                    Text(if (player == null) "Uma nova mente" else "${player.xp} XP · ${player.wins} vitórias", color = MutedInk, fontSize = 10.sp, textAlign = TextAlign.Center, maxLines = 2)
                                }
                            }
                            repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                        }
                        Spacer(Modifier.height(22.dp))
                    }
                    OutlinedButton(onClick = { managing = !managing }, shape = RoundedCornerShape(10.dp), modifier = Modifier.heightIn(min = 48.dp)) {
                        Text(if (managing) "CONCLUIR EDIÇÃO" else "GERENCIAR PERFIS", style = MaterialTheme.typography.labelLarge)
                    }
                    Spacer(Modifier.height(24.dp))
                    OutlinedButton(onClick = { connecting = true }, modifier = Modifier.heightIn(min = 48.dp)) {
                        Text(if (state.syncCode.isEmpty()) "CONECTAR SITE E APP" else "CÓDIGO DOS APARELHOS")
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Daniel e Larissa sincronizam com o site usando o mesmo código. Perfis adicionais ficam neste aparelho. Todos funcionam offline.", color = MutedInk, textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 19.sp, modifier = Modifier.widthIn(max = 340.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("ATÉ 6 MENTES CURIOSAS · SEM LOGIN", style = MaterialTheme.typography.labelSmall, fontSize = 8.sp, color = MutedInk)
                }
            }
        }
    }
    if (creating || editingId != null) {
        val edited = state.players.firstOrNull { it.id == editingId }
        PlayerEditor(edited, state.errorMessage, onDismiss = { creating = false; editingId = null; vm.dismissError() }, onChanged = vm::dismissError) { name, avatar ->
            val saved = if (edited == null) vm.createPlayer(name, avatar) else vm.updatePlayer(edited.id, name, avatar)
            if (saved) { creating = false; editingId = null }
        }
    } else if (!connecting) state.errorMessage?.let { error ->
        AlertDialog(onDismissRequest = vm::dismissError, title = { Text("Uma nota do laboratório") }, text = { Text(error) }, confirmButton = { TextButton(onClick = vm::dismissError) { Text("ENTENDI") } }, containerColor = PaperBright)
    }
    if (connecting) DeviceSyncDialog(state, vm) { connecting = false; vm.dismissError() }
}

@Composable
private fun PlayerEditor(player: PlayerSummary?, error: String?, onDismiss: () -> Unit, onChanged: () -> Unit, onSave: (String, String) -> Unit) {
    var name by rememberSaveable(player?.id) { mutableStateOf(player?.name ?: "") }
    var avatar by rememberSaveable(player?.id) { mutableStateOf(player?.avatar ?: "rocket") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (player == null) "Uma nova mente." else "Sua credencial.", fontFamily = FontFamily.Serif) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text("Um nome e um símbolo para o seu universo.", color = MutedInk)
                Spacer(Modifier.height(18.dp))
                OutlinedTextField(name, onValueChange = { name = it.take(24); onChanged() }, label = { Text("Nome do perfil") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), isError = error != null)
                Spacer(Modifier.height(18.dp))
                Text("ESCOLHA SEU AVATAR", style = MaterialTheme.typography.labelSmall, color = Forest)
                Spacer(Modifier.height(10.dp))
                avatarLabels.entries.chunked(3).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { (id, label) ->
                            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                                PlayerAvatar(id, Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(12.dp)).border(if (avatar == id) 3.dp else 1.dp, if (avatar == id) Forest else PaperLine, RoundedCornerShape(12.dp)).clickable { avatar = id; onChanged() }.semantics { contentDescription = "Avatar $label"; selected = avatar == id })
                                Text(label, fontSize = 10.sp, color = Forest, modifier = Modifier.padding(top = 5.dp))
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                if (error != null) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                Text("Partidas e progresso ficam separados por perfil.", color = MutedInk, style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = { TextButton(onClick = { onSave(name, avatar) }, enabled = name.isNotBlank()) { Text(if (player == null) "CRIAR PERFIL" else "SALVAR PERFIL") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("CANCELAR") } },
        containerColor = PaperBright,
    )
}

/** Small vector badges stay sharp on every display and ship inside the offline APK. */
@Composable
internal fun PlayerAvatar(avatar: String, modifier: Modifier = Modifier) {
    val background = when (avatar) { "rocket" -> Color(0xFFEFC2A0); "flask" -> Color(0xFFCEDDB5); "planet" -> Color(0xFFD2CCD9); "brain" -> Color(0xFFF1D397); "flower" -> Color(0xFFEABBB1); else -> Color(0xFFC5DCD0) }
    Canvas(modifier.background(background)) {
        withTransform({ scale(size.width / 100f, size.height / 100f, pivot = Offset.Zero) }) {
            val line = Stroke(3.2f, cap = StrokeCap.Round)
            drawCircle(PaperBright.copy(alpha = .34f), 34f, Offset(50f, 49f))
            drawCircle(Forest.copy(alpha = .25f), 2f, Offset(17f, 24f)); drawCircle(Forest.copy(alpha = .25f), 1.5f, Offset(82f, 71f))
            when (avatar) {
                "rocket" -> {
                    rotate(35f, Offset(50f, 50f)) {
                        val body = Path().apply { moveTo(50f, 18f); cubicTo(34f, 34f, 35f, 53f, 39f, 67f); lineTo(61f, 67f); cubicTo(65f, 53f, 66f, 34f, 50f, 18f); close() }
                        drawPath(body, PaperBright); drawPath(body, Forest, style = line)
                        drawCircle(Forest, 7f, Offset(50f, 42f)); drawCircle(background, 3f, Offset(50f, 42f))
                        drawLine(Forest, Offset(38f, 50f), Offset(28f, 65f), 3f, StrokeCap.Round); drawLine(Forest, Offset(62f, 50f), Offset(72f, 65f), 3f, StrokeCap.Round)
                        drawLine(Coral, Offset(44f, 73f), Offset(44f, 80f), 3f, StrokeCap.Round); drawLine(Coral, Offset(50f, 73f), Offset(50f, 86f), 3f, StrokeCap.Round); drawLine(Coral, Offset(56f, 73f), Offset(56f, 80f), 3f, StrokeCap.Round)
                    }
                }
                "flask" -> {
                    val flask = Path().apply { moveTo(41f, 23f); lineTo(59f, 23f); lineTo(59f, 43f); lineTo(76f, 70f); quadraticBezierTo(79f, 77f, 70f, 78f); lineTo(30f, 78f); quadraticBezierTo(21f, 77f, 24f, 70f); lineTo(41f, 43f); close() }
                    drawPath(flask, PaperBright); drawPath(flask, Forest, style = line)
                    val liquid = Path().apply { moveTo(35f, 60f); lineTo(65f, 60f); lineTo(72f, 73f); lineTo(28f, 73f); close() }
                    drawPath(liquid, Coral); drawLine(Forest, Offset(38f, 23f), Offset(62f, 23f), 3f, StrokeCap.Round)
                    drawCircle(Forest, 2.5f, Offset(52f, 51f)); drawCircle(Forest, 2f, Offset(49f, 14f)); drawCircle(Coral, 3f, Offset(61f, 9f))
                }
                "planet" -> {
                    drawCircle(PaperBright, 24f, Offset(50f, 50f)); drawCircle(Forest, 24f, Offset(50f, 50f), style = line)
                    rotate(-25f, Offset(50f, 50f)) { drawOval(Forest, Offset(12f, 38f), Size(76f, 24f), style = line) }
                    drawCircle(Coral, 4f, Offset(72f, 20f)); drawCircle(Forest, 2f, Offset(27f, 78f))
                    drawLine(Forest, Offset(40f, 34f), Offset(45f, 32f), 3f, StrokeCap.Round)
                }
                "brain" -> {
                    listOf(Offset(39f, 32f), Offset(58f, 32f), Offset(30f, 47f), Offset(67f, 47f), Offset(34f, 63f), Offset(63f, 63f), Offset(44f, 68f), Offset(54f, 68f)).forEach { drawCircle(Forest, 12f, it); drawCircle(PaperBright, 9f, it) }
                    drawCircle(PaperBright, 23f, Offset(49f, 48f))
                    drawLine(Forest, Offset(49f, 27f), Offset(49f, 73f), 3f, StrokeCap.Round)
                    drawPath(Path().apply { moveTo(36f, 38f); quadraticBezierTo(45f, 44f, 36f, 50f); moveTo(61f, 38f); quadraticBezierTo(52f, 44f, 61f, 50f); moveTo(36f, 58f); quadraticBezierTo(44f, 57f, 44f, 66f); moveTo(61f, 58f); quadraticBezierTo(54f, 57f, 54f, 66f) }, Forest, style = line)
                }
                "flower" -> {
                    repeat(6) { turn -> rotate(turn * 60f, Offset(50f, 45f)) { drawOval(PaperBright, Offset(41f, 17f), Size(18f, 26f)); drawOval(Forest, Offset(41f, 17f), Size(18f, 26f), style = line) } }
                    drawCircle(Coral, 10f, Offset(50f, 45f)); drawCircle(Forest, 10f, Offset(50f, 45f), style = line)
                    drawLine(Forest, Offset(50f, 68f), Offset(50f, 83f), 3f, StrokeCap.Round); drawLine(Forest, Offset(50f, 77f), Offset(62f, 70f), 3f, StrokeCap.Round)
                }
                else -> {
                    repeat(3) { turn -> rotate(turn * 60f, Offset(50f, 50f)) { drawOval(Forest, Offset(18f, 37f), Size(64f, 26f), style = line) } }
                    drawCircle(Coral, 6f, Offset(50f, 50f)); drawCircle(Forest, 4f, Offset(77f, 61f))
                }
            }
        }
    }
}
