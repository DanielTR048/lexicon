package com.lexicon.lab

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.UUID

data class SyncOutcome(val kind: String, val message: String, val game: SavedGame? = null)
private class SyncHttpError(val status: Int, message: String) : Exception(message)

class CloudSync(private val repository: GameRepository, private val api: String = "https://lexicon-laboratorio.nexcoreadm.chatgpt.site") {
    private val conflicts = mutableMapOf<String, String>()
    fun newCode(): String = UUID.randomUUID().toString().replace("-", "")
    fun format(code: String): String = "LEX-" + code.uppercase(Locale.ROOT).chunked(4).joinToString("-")
    fun connect(input: String, create: Boolean): String {
        val code = input.trim().replace(Regex("^LEX-", RegexOption.IGNORE_CASE), "").replace(Regex("[-\\s]"), "").lowercase(Locale.ROOT)
        require(code.matches(Regex("[a-f0-9]{32}"))) { "Copie o código completo, começando com LEX-." }
        check(request("family", code, if (create) "POST" else "GET") != null) { "Código não encontrado. Copie o código do outro aparelho." }
        check(repository.connectCode(code)) { "O aparelho não conseguiu guardar o código." }
        conflicts.clear()
        return code
    }

    @Synchronized fun sync(id: String, themes: List<Theme>, resolve: String? = null): SyncOutcome {
        val code = repository.syncCode()
        if (code.isEmpty() || id !in listOf("daniel", "larissa")) return SyncOutcome("local", "Salvo neste aparelho")
        return runCatching {
            val local = repository.load(id) ?: return SyncOutcome("local", "Perfil não encontrado")
            val before = CloudCodec.encode(local)
            val meta = repository.syncMeta(id)
            val remote = request("profiles/$id", code)
            if (repository.syncCode() != code || CloudCodec.encode(repository.load(id)!!) != before) return SyncOutcome("pending", "Alterações aguardando envio")
            val etag = remote?.getString("etag")
            val remoteGame = remote?.let { CloudCodec.decode(it.getJSONObject("save").toString(), themes) }
            val dirty = meta.optBoolean("dirty", true) || (meta.has("snapshot") && meta.optString("snapshot") != before)
            fun conflict(): SyncOutcome {
                conflicts[id] = etag.orEmpty()
                return SyncOutcome("conflict", "Neste aparelho: ${local.profile.xp} XP, ${local.profile.words} palavras. Online: ${remoteGame?.profile?.xp ?: 0} XP, ${remoteGame?.profile?.words ?: 0} palavras.")
            }
            if (resolve != null && remote != null && conflicts[id] != etag) return conflict()
            if (remote != null && dirty && meta.optString("etag") != etag && CloudCodec.meaningful(local) && resolve == null && CloudCodec.encode(remoteGame!!) != before) return conflict()
            if (remote != null && (resolve == "cloud" || !dirty || (!CloudCodec.meaningful(local) && meta.optString("etag") != etag))) {
                if (resolve == "cloud") check(repository.keepBackup(id, before))
                if (!repository.saveCloud(id, remoteGame!!, etag!!, before, code)) return SyncOutcome("pending", "Alterações aguardando envio")
                conflicts.remove(id)
                return SyncOutcome("loaded", "Sincronizado", remoteGame)
            }
            if (remote != null && CloudCodec.encode(remoteGame!!) == before) {
                check(repository.setSyncMeta(id, JSONObject().put("etag", etag).put("dirty", false).put("snapshot", before)))
                conflicts.remove(id)
                return SyncOutcome("saved", "Sincronizado")
            }
            if (resolve == "local" && remote != null) check(repository.keepBackup(id, remote.getJSONObject("save").toString()))
            val headers = if (remote == null) mapOf("If-None-Match" to "*") else mapOf("If-Match" to "\"$etag\"")
            val result = request("profiles/$id", code, "PUT", before, headers) ?: error("Não foi possível enviar o progresso.")
            if (repository.syncCode() != code) return SyncOutcome("pending", "Alterações aguardando envio")
            val changed = CloudCodec.encode(repository.load(id)!!) != before
            check(repository.setSyncMeta(id, JSONObject().put("etag", result.getString("etag")).put("dirty", changed).put("snapshot", before)))
            conflicts.remove(id)
            SyncOutcome(if (changed) "pending" else "saved", if (changed) "Alterações aguardando envio" else "Sincronizado")
        }.getOrElse {
            SyncOutcome("offline", if (it is IllegalArgumentException) it.message.orEmpty() else if (it is SyncHttpError && it.status == 409) "Progresso mudou em outro aparelho. Toque em sincronizar." else "Salvo no aparelho · aguardando conexão")
        }
    }

    private fun request(path: String, code: String, method: String = "GET", body: String? = null, headers: Map<String, String> = emptyMap()): JSONObject? {
        val connection = URL("$api/api/$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 12000; connection.readTimeout = 12000
            connection.setRequestProperty("Authorization", "Bearer $code")
            connection.setRequestProperty("Content-Type", "application/json")
            headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }
            if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            if (status == 404) return null
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader(Charsets.UTF_8)?.use { JSONObject(it.readText()) } ?: JSONObject()
            if (status !in 200..299) throw SyncHttpError(status, response.optString("error", "Não foi possível sincronizar."))
            return response
        } finally { connection.disconnect() }
    }
}
