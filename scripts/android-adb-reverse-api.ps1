# Android USB → Local Nest API (ADB reverse)
# Usage (PowerShell): pwsh -File scripts/android-adb-reverse-api.ps1
# Does not print secrets. Railway not required.

$ErrorActionPreference = 'Stop'
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"

$port = 3000
$envFile = Join-Path $PSScriptRoot '..\apps\mobile\.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*EXPO_PUBLIC_API_URL=https?://[^:]+:(\d+)') {
      $port = [int]$Matches[1]
    }
  }
}

Write-Host "API_PORT=$port"
adb start-server | Out-Null
$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (-not $devices) {
  Write-Host 'ADB_DEVICE=NONE — connect USB debugging device, then re-run.'
  exit 1
}
Write-Host "ADB_DEVICE=OK"
adb reverse --remove-all 2>$null | Out-Null
adb reverse "tcp:$port" "tcp:$port"
Write-Host 'REVERSE_LIST:'
adb reverse --list
Write-Host "Done. Mobile EXPO_PUBLIC_API_URL should be http://127.0.0.1:$port"
Write-Host 'Restart Metro (expo start --dev-client) if URL env just changed.'
