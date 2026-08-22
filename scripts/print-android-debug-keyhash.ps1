# Print Kakao Android key hash for com.jjoin.app debug keystore.
# Register in Kakao Developers → Android platform → 키 해시

$ErrorActionPreference = 'Stop'

$keytoolCandidates = @(
  "$env:JAVA_HOME\bin\keytool.exe",
  "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe"
)

$keytool = $keytoolCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $keytool) {
  Write-Error 'keytool not found. Install JDK or Android Studio JBR.'
}

$debugKeystore = Join-Path $env:USERPROFILE '.android\debug.keystore'
if (-not (Test-Path $debugKeystore)) {
  $androidHome = $env:ANDROID_HOME
  if (-not $androidHome) {
    $androidHome = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  }
  Write-Host 'Default ~/.android/debug.keystore not found.'
  Write-Host 'Run Gradle signingReport instead (after expo prebuild):'
  Write-Host "  `$env:ANDROID_HOME='$androidHome'"
  Write-Host '  cd apps/mobile/android'
  Write-Host '  .\gradlew.bat signingReport'
  Write-Host 'Use Variant: debug SHA1 -> Kakao Base64 hash below.'
  exit 0
}

Write-Host 'Package: com.jjoin.app'
Write-Host "Keystore: $debugKeystore"
Write-Host ''

$sha1Line = & $keytool -list -v -alias androiddebugkey -keystore $debugKeystore -storepass android -keypass android 2>$null |
  Where-Object { $_ -match 'SHA1:' } |
  Select-Object -First 1

if (-not $sha1Line) {
  Write-Error 'Could not read SHA1 from debug keystore'
}

$hex = ($sha1Line -replace '.*SHA1:\s*', '' -replace '\s', '').ToUpper()
$bytes = for ($i = 0; $i -lt $hex.Length; $i += 2) {
  [Convert]::ToByte($hex.Substring($i, 2), 16)
}
$hash = [Convert]::ToBase64String([byte[]]$bytes)

Write-Host "SHA1: $hex"
Write-Host "Kakao key hash (Base64): $hash"
