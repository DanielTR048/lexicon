package com.lexicon.lab

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp

@Composable
internal fun DeviceSyncDialog(state: GameUiState, vm: GameViewModel, onDismiss: () -> Unit) {
    var input by rememberSaveable { mutableStateOf("") }
    val clipboard = LocalClipboardManager.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Conectar seus aparelhos") },
        text = {
            Column {
                Text("Use o mesmo código no site e no app Android para continuar os perfis Daniel e Larissa. Quem tem o código pode acessar os dois perfis.")
                Spacer(Modifier.height(18.dp))
                if (state.syncCode.isEmpty()) {
                    Button(onClick = { vm.connectDevices(vm.newSyncCode(), true) }, enabled = !state.syncing, modifier = Modifier.fillMaxWidth()) { Text("CRIAR CÓDIGO") }
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(input, onValueChange = { input = it; vm.dismissError() }, label = { Text("Código do outro aparelho") }, singleLine = false, enabled = !state.syncing, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(onClick = { vm.connectDevices(input) }, enabled = input.isNotBlank() && !state.syncing, modifier = Modifier.fillMaxWidth()) { Text("CONECTAR APARELHOS") }
                } else {
                    OutlinedTextField(vm.formattedSyncCode(), onValueChange = {}, readOnly = true, label = { Text("Código dos aparelhos") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { clipboard.setText(AnnotatedString(vm.formattedSyncCode())) }, modifier = Modifier.fillMaxWidth()) { Text("COPIAR CÓDIGO") }
                    if (state.activePlayerId != null) TextButton(onClick = { vm.syncNow() }, enabled = !state.syncing, modifier = Modifier.fillMaxWidth()) { Text("SINCRONIZAR AGORA") }
                }
                Spacer(Modifier.height(12.dp))
                Text(if (state.syncing) "Conectando…" else state.syncStatus, style = MaterialTheme.typography.bodySmall)
                state.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("CONCLUIR") } },
        containerColor = PaperBright,
    )
}
