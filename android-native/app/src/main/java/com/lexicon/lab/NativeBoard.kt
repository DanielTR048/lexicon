package com.lexicon.lab

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitTouchSlopOrCancellation
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** A real Compose board: hit regions never animate, and zoom uses explicit endpoint taps. */
@Composable
internal fun NativeBoard(
    puzzle: Puzzle,
    found: Map<String, List<Cell>>,
    selection: List<Cell>,
    hintCell: Cell?,
    error: Boolean,
    enlarged: Boolean,
    reducedMotion: Boolean,
    enabled: Boolean,
    onTap: (Cell) -> Unit,
    onDragStart: (Cell) -> Unit,
    onDragMove: (Cell) -> Unit,
    onDragEnd: () -> Unit,
    onDragCancel: () -> Unit,
) {
    val selectionNow by rememberUpdatedState(selection)
    val startNow by rememberUpdatedState(onDragStart)
    val moveNow by rememberUpdatedState(onDragMove)
    val endNow by rememberUpdatedState(onDragEnd)
    val cancelNow by rememberUpdatedState(onDragCancel)
    val palette = remember { listOf(Forest, Coral, Gold, Color(0xFF5D84A6), Color(0xFF87739D), Color(0xFF729260)) }
    val foundColors = remember(found) {
        buildMap<Cell, Color> { found.values.forEachIndexed { index, cells -> cells.forEach { put(it, palette[index % palette.size]) } } }
    }
    val borderColor by animateColorAsState(if (error) Coral else PaperLine, tween(if (reducedMotion) 0 else 180), label = "board feedback")
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val cellSize = if (enlarged) 44.dp else (maxWidth - 12.dp) / puzzle.size
        val scroll = rememberScrollState()
        Box(Modifier.fillMaxWidth().then(if (enlarged) Modifier.horizontalScroll(scroll) else Modifier)) {
            Box(
                Modifier.width(cellSize * puzzle.size + 12.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(PaperBright)
                    .border(if (error) 2.dp else 1.dp, borderColor, RoundedCornerShape(16.dp))
                    .padding(6.dp)
                    .then(if (enabled && !enlarged) Modifier.pointerInput(puzzle.seed, puzzle.size) {
                        fun cellAt(point: Offset): Cell = Cell(
                            (point.y / (size.height.toFloat() / puzzle.size)).toInt().coerceIn(0, puzzle.size - 1),
                            (point.x / (size.width.toFloat() / puzzle.size)).toInt().coerceIn(0, puzzle.size - 1),
                        )
                        awaitEachGesture {
                            // Remember the actual down cell, before the touch slop consumes a letter.
                            val down = awaitFirstDown(requireUnconsumed = false)
                            val initialCell = cellAt(down.position)
                            val dragStart = awaitTouchSlopOrCancellation(down.id) { change, _ -> change.consume() }
                            if (dragStart != null) {
                                startNow(initialCell)
                                moveNow(cellAt(dragStart.position))
                                val finished = drag(dragStart.id) { change ->
                                    moveNow(cellAt(change.position))
                                    change.consume()
                                }
                                if (finished) endNow() else cancelNow()
                            }
                        }
                    } else Modifier),
            ) {
                Canvas(Modifier.size(cellSize * puzzle.size)) {
                    val step = size.width / puzzle.size
                    fun center(cell: Cell) = Offset((cell.col + .5f) * step, (cell.row + .5f) * step)
                    found.values.forEachIndexed { i, cells ->
                        if (cells.isNotEmpty()) drawLine(palette[i % palette.size].copy(alpha = .16f), center(cells.first()), center(cells.last()), step * .82f, StrokeCap.Round)
                    }
                    val cells = selectionNow
                    if (cells.isNotEmpty()) {
                        val color = if (error) Coral else Forest
                        if (cells.size == 1) drawCircle(color.copy(alpha = .2f), step * .41f, center(cells.first()))
                        else drawLine(color.copy(alpha = .22f), center(cells.first()), center(cells.last()), step * .82f, StrokeCap.Round)
                    }
                }
                Column {
                    puzzle.grid.forEachIndexed { rowIndex, row ->
                        Row {
                            row.forEachIndexed { colIndex, letter ->
                                val cell = Cell(rowIndex, colIndex)
                                val selected = selection.contains(cell)
                                val discovered = foundColors.containsKey(cell)
                                val hinted = hintCell == cell
                                Box(
                                    Modifier.size(cellSize)
                                        .then(if (hinted) Modifier.border(2.dp, Gold, RoundedCornerShape(7.dp)) else Modifier)
                                        .semantics {
                                            contentDescription = "$letter, linha ${rowIndex + 1}, coluna ${colIndex + 1}" +
                                                (if (selected) ", selecionada" else "") + (if (discovered) ", encontrada" else "") + (if (hinted) ", dica" else "")
                                        }
                                        .clickable(enabled = enabled, onClickLabel = "Selecionar letra") { onTap(cell) },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(letter.toString(), color = if (selected) Forest else foundColors[cell] ?: Ink,
                                        fontSize = if (enlarged) 20.sp else when { puzzle.size > 13 -> 12.sp; puzzle.size > 10 -> 14.sp; else -> 17.sp },
                                        fontWeight = if (selected || discovered) FontWeight.Bold else FontWeight.Medium,
                                        fontFamily = FontFamily.Monospace,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
