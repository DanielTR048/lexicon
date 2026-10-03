# Lexicon para Android

Aplicativo nativo em **Kotlin e Jetpack Compose**, com interface e motor próprios. Requer Android 8.0/API 26 ou superior; o projeto compila e tem como alvo a API 35. O APK inclui os 42 temas, 756 palavras e a ilustração. O jogo funciona offline desde a primeira abertura após a instalação e não solicita permissão de internet.

Inclui três dificuldades, desafio diário, dicas, XP, conquistas, favoritos, caderno, pausa, sons opcionais, resposta tátil e redução de movimento. O progresso é local e independente do navegador. Temas personalizados e impressão permanecem exclusivos da versão web nesta versão.

## Preparar o ambiente

Use **JDK 17**, Android SDK com **Platform 35** e **Build Tools 35.0.0**, Node.js e o Gradle Wrapper incluído (Gradle 8.11.1). A primeira compilação baixa dependências; o funcionamento offline do aplicativo não exige que a compilação também ocorra offline.

O ambiente desta máquina está isolado em `F:\Github\Jogos\.android-toolchain`. `BUILD-ANDROID.ps1` usa essa instalação como alternativa quando `JAVA_HOME` e `ANDROID_HOME` não estiverem definidos. Em outra máquina, configure os caminhos do seu JDK/SDK ou abra esta pasta no Android Studio:

```powershell
$env:JAVA_HOME = 'C:\caminho\para\jdk-17'
$env:ANDROID_HOME = 'C:\caminho\para\Android\Sdk'
```

Também é possível definir `sdk.dir` em `local.properties`, que é ignorado pelo controle de versão. As licenças dos componentes do SDK precisam estar aceitas no ambiente que fará o build.

## Compilar e instalar

Na raiz do projeto web, acima desta pasta:

```powershell
npm run android:sync
.\android-native\BUILD-ANDROID.ps1
.\android-native\BUILD-ANDROID.ps1 -Release
```

O primeiro comando atualiza `app/src/main/assets/catalog.json` e a ilustração a partir da biblioteca web. Ambos os builds também fazem essa sincronização automaticamente. Sem `-Release`, o resultado é `output/Lexicon-Android-debug.apk`. Com `-Release`, é `output/Lexicon-Android-release.apk`, assinado para distribuição direta. O script executa `testDebugUnitTest` e `lintDebug` antes de montar o APK e interrompe a entrega caso algum comando falhe. `-SkipTests` existe para uso explícito durante desenvolvimento; o padrão mantém a validação.

Transfira o APK para o celular, abra o arquivo e confirme a instalação. Se o Android solicitar, autorize a instalação por essa origem nas configurações exibidas pelo sistema. Para desenvolvimento com depuração USB autorizada, também é possível usar `adb install -r` com o caminho do APK. APK debug e APK release usam certificados diferentes; uma variante não substitui a outra sem desinstalação, que pode apagar o progresso local.

## Assinatura e atualizações

Na primeira compilação release sem `LEXICON_KEYSTORE`, o script gera a chave privada `.signing/lexicon-release.jks`, com alias `lexicon`. A senha aleatória é guardada em `.signing/password.xml`, protegida pelo **DPAPI do Windows**. A senha não é impressa; o script a disponibiliza ao Gradle por variáveis de ambiente e limpa as variáveis de senha ao terminar.

Toda a pasta `.signing/`, arquivos de chave e APKs estão no `.gitignore`. Preserve a chave e sua senha em backup privado e seguro: a mesma identidade de assinatura é necessária para atualizar uma instalação existente. O arquivo `password.xml` depende da conta e do Windows que o criaram; copiá-lo sozinho para outra máquina não garante recuperação. Para transportar a assinatura, guarde a senha também em um cofre de segredos adequado.

Para usar uma identidade de assinatura existente, forneça ao processo de build:

| Variável                 | Conteúdo                                               |
| ------------------------ | ------------------------------------------------------ |
| `LEXICON_KEYSTORE`       | Caminho absoluto do arquivo JKS                        |
| `LEXICON_STORE_PASSWORD` | Senha do armazenamento, fornecida por um cofre/segredo |
| `LEXICON_KEY_PASSWORD`   | Senha da chave de alias `lexicon`                      |

Não coloque senhas no código, no README ou em comandos que fiquem gravados no histórico. Para uma nova versão distribuída, aumente `versionCode` e atualize `versionName` em `app/build.gradle.kts`, mantendo o identificador `com.lexicon.lab` e a chave de assinatura.

## Validação e integração contínua

No Windows com Java 17, o iniciador usa uma junction ASCII na pasta isolada de ferramentas quando o caminho do projeto tem acentos. Isso evita um problema de leitura do classpath em arquivos de argumentos do Java; os fontes permanecem na pasta original. Prefira `BUILD-ANDROID.ps1` neste ambiente.

O Gradle Wrapper está incluído com checksum da distribuição. Dentro desta pasta, os comandos equivalentes para um ambiente já configurado são:

```powershell
.\gradlew.bat testDebugUnitTest lintDebug assembleDebug --console=plain
# Para release, com as variáveis de assinatura configuradas:
.\gradlew.bat assembleRelease --console=plain
```

O workflow `../.github/workflows/android.yml` instala JDK 17 e Gradle 8.11.1, sincroniza os recursos, executa testes e lint e gera um **APK debug de prévia**, anexado como artefato `Lexicon-Android-preview`. Ele também disponibiliza os relatórios de validação. O workflow não usa a chave privada local, não gera a distribuição release e não publica na Play Store. Não há execução remota de CI confirmada enquanto o projeto não estiver em um repositório configurado.

Testes e lint automatizados não substituem a verificação em aparelho físico: instalação, toque/arrasto, teclado de acessibilidade, vibração, som, rotação, retomada da partida e primeira abertura em modo avião devem ser conferidos no dispositivo de destino.

## Arquivos principais

- `Models.kt`, `PuzzleEngine.kt`: catálogo, regras, modelos e geração do tabuleiro.
- `GameRepository.kt`, `GameViewModel.kt`: persistência, sessão, progressão e comandos do jogo.
- `LexiconApp.kt`, `NativeBoard.kt`: telas Compose, tabuleiro, gestos e animações.
- `app/src/main/assets/catalog.json`: catálogo gerado pelo comando de sincronização.
- `app/src/test/`: testes automatizados do Android.

Os arquivos Kotlin ficam em `app/src/main/java/com/lexicon/lab/`. O catálogo web em `../src/data.js` continua sendo a fonte editorial dos temas; edite-o e execute a sincronização para refletir mudanças no APK.
