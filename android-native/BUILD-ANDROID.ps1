param([switch]$Release, [switch]$SkipTests)
$ErrorActionPreference = 'Stop'
$previousSigning = @{
    KeyStore = $env:LEXICON_KEYSTORE
    StorePassword = $env:LEXICON_STORE_PASSWORD
    KeyPassword = $env:LEXICON_KEY_PASSWORD
}
Push-Location $PSScriptRoot
try {
    # Prefer explicit SDK/JDK configuration; the isolated local installation is a fallback.
    $toolRoot = Join-Path (Split-Path (Split-Path $PSScriptRoot)) '.android-toolchain'
    if (!$env:JAVA_HOME -and (Test-Path "$toolRoot\jdk")) {
        $env:JAVA_HOME = (Get-ChildItem "$toolRoot\jdk" -Directory | Select-Object -First 1).FullName
    }
    if (!$env:ANDROID_HOME -and (Test-Path "$toolRoot\sdk")) { $env:ANDROID_HOME = "$toolRoot\sdk" }
    if (!$env:GRADLE_USER_HOME -and (Test-Path $toolRoot)) { $env:GRADLE_USER_HOME = "$toolRoot\gradle-cache" }
    if (!$env:JAVA_HOME) { throw 'Configure JAVA_HOME para um JDK 17.' }
    if (!$env:ANDROID_HOME -and !(Test-Path 'local.properties')) { throw 'Configure ANDROID_HOME para seu Android SDK.' }
    & node (Join-Path $PSScriptRoot '..\scripts\sync-android-assets.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao sincronizar os temas.' }
    # Java 17 on Windows reads launcher argfiles in the native codepage. An ASCII
    # junction keeps Gradle test classpaths correct when the source has accents.
    $gradleProject = $PSScriptRoot
    if ($PSScriptRoot -match '[^\x00-\x7F]') {
        New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
        $gradleProject = Join-Path $toolRoot 'project'
        if (Test-Path -LiteralPath $gradleProject) {
            $alias = Get-Item -LiteralPath $gradleProject
            if ($alias.LinkType -ne 'Junction' -or [string]$alias.Target -ne $PSScriptRoot) {
                throw "O caminho $gradleProject ja existe e nao aponta para este projeto. Nao foi alterado."
            }
        } else {
            New-Item -ItemType Junction -Path $gradleProject -Target $PSScriptRoot | Out-Null
        }
    }

    if ($Release -and !$env:LEXICON_KEYSTORE) {
        $signingDir = Join-Path $PSScriptRoot '.signing'
        $keyFile = Join-Path $signingDir 'lexicon-release.jks'
        $secretFile = Join-Path $signingDir 'password.xml'
        New-Item -ItemType Directory -Force -Path $signingDir | Out-Null
        if (!(Test-Path $keyFile)) {
            if (Test-Path $secretFile) { throw 'Senha existente sem chave. Verifique .signing antes de criar uma nova identidade.' }
            $bytes = [byte[]]::new(32)
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            $rng.GetBytes($bytes)
            $rng.Dispose()
            $newPassword = [Convert]::ToBase64String($bytes)
            ConvertTo-SecureString $newPassword -AsPlainText -Force | Export-Clixml -LiteralPath $secretFile
            $newPassword = $null
            $env:LEXICON_STORE_PASSWORD = [System.Net.NetworkCredential]::new('', (Import-Clixml -LiteralPath $secretFile)).Password
            $env:LEXICON_KEY_PASSWORD = $env:LEXICON_STORE_PASSWORD
            & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $keyFile -storepass:env LEXICON_STORE_PASSWORD -keypass:env LEXICON_KEY_PASSWORD -alias lexicon -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Lexicon, OU=Laboratorio de Palavras' -storetype JKS
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar a chave de assinatura.' }
        }
        if (!(Test-Path $secretFile)) { throw 'Senha de assinatura ausente. Restaure .signing ou informe as variaveis LEXICON_*.' }
        $env:LEXICON_KEYSTORE = $keyFile
        $env:LEXICON_STORE_PASSWORD = [System.Net.NetworkCredential]::new('', (Import-Clixml -LiteralPath $secretFile)).Password
        $env:LEXICON_KEY_PASSWORD = $env:LEXICON_STORE_PASSWORD
    }
    $tasks = @()
    if (!$SkipTests) { $tasks += @('testDebugUnitTest', 'lintDebug') }
    $tasks += $(if ($Release) { 'assembleRelease' } else { 'assembleDebug' })
    if (Test-Path "$toolRoot\gradle-8.11.1\bin\gradle.bat") {
        & "$toolRoot\gradle-8.11.1\bin\gradle.bat" -p $gradleProject @tasks --console=plain
    } else {
        & (Join-Path $gradleProject 'gradlew.bat') -p $gradleProject @tasks --console=plain
    }
    if ($LASTEXITCODE -ne 0) { throw 'Build Android falhou. Veja o erro acima.' }
    $variant = if ($Release) { 'release' } else { 'debug' }
    $apk = Join-Path $PSScriptRoot "app\build\outputs\apk\$variant\app-$variant.apk"
    $output = Join-Path $PSScriptRoot '..\output'
    New-Item -ItemType Directory -Force -Path $output | Out-Null
    $destination = Join-Path $output "Lexicon-Android-$variant.apk"
    Copy-Item -LiteralPath $apk -Destination $destination -Force
    Get-FileHash -LiteralPath $destination -Algorithm SHA256
    Write-Output "APK: $destination"
} finally {
    $env:LEXICON_KEYSTORE = $previousSigning.KeyStore
    $env:LEXICON_STORE_PASSWORD = $previousSigning.StorePassword
    $env:LEXICON_KEY_PASSWORD = $previousSigning.KeyPassword
    Pop-Location
}
