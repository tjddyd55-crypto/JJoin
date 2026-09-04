# Recover from Metro hang on port 8082 (Windows)
# Kills only the PID listening on 8082 — never blanket node.exe kill.

$ErrorActionPreference = 'Stop'
$line = netstat -ano | Select-String ':8082' | Select-String 'LISTENING' | Select-Object -First 1
if ($line) {
  $pid = [int](($line -split '\s+')[-1])
  Write-Host "Stopping Metro listener PID=$pid on :8082"
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
} else {
  Write-Host 'No listener on :8082'
}

Write-Host ''
Write-Host 'Start Metro with:' -ForegroundColor Cyan
Write-Host "  cd apps/mobile"
Write-Host "  `$env:REACT_NATIVE_PACKAGER_HOSTNAME='127.0.0.1'"
Write-Host "  npx expo start --dev-client --port 8082"
