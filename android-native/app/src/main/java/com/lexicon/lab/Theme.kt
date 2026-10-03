package com.lexicon.lab

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

internal val Paper = Color(0xFFF5F0E5)
internal val PaperBright = Color(0xFFFFFCF4)
internal val Forest = Color(0xFF254D3F)
internal val Ink = Color(0xFF213B33)
internal val Coral = Color(0xFFE57657)
internal val MutedInk = Color(0xFF6E786B)
internal val PaperLine = Color(0xFFDCDCCB)
internal val Sage = Color(0xFFE2E8D8)
internal val Gold = Color(0xFFC79035)

@Composable
fun LexiconTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Forest, onPrimary = PaperBright, primaryContainer = Sage,
            onPrimaryContainer = Forest, secondary = Coral, onSecondary = Ink,
            background = Paper, onBackground = Ink, surface = PaperBright,
            onSurface = Ink, surfaceVariant = Sage, onSurfaceVariant = MutedInk,
            outline = PaperLine, error = Color(0xFFAA422D),
        ),
        typography = Typography(
            displaySmall = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 38.sp, lineHeight = 42.sp),
            headlineLarge = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 30.sp, lineHeight = 35.sp),
            headlineMedium = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 25.sp, lineHeight = 30.sp),
            titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 25.sp),
            titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
            bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
            bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
            labelLarge = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 0.5.sp),
            labelSmall = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 10.sp, letterSpacing = 0.8.sp),
        ),
        content = content,
    )
}
