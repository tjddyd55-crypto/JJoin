# Metro / USB dev environment doctor (Windows)
# Usage: pnpm mobile:doctor

$ErrorActionPreference = 'Continue'
Write-Host '== JJOINZONE mobile doctor ==' -ForegroundColor Cyan

function Test-Metro {
  try {
    $body = & curl.exe -s -m 10 http://127.0.0.1:8082/status
    if ($LASTEXITCODE -ne 0 -or -not $body) {
      Write-Host '[Metro] NOT RUNNING or /status timeout on :8082' -ForegroundColor Red
      return $false
    }
    Write-Host "[Metro] $body" -ForegroundColor Green
    return $body -match 'packager-status:running'
  } catch {
    Write-Host '[Metro] NOT RUNNING or /status timeout on :8082' -ForegroundColor Red
    return $false
  }
}

function Show-PortOwner {
  $line = netstat -ano | Select-String ':8082' | Select-String 'LISTENING' | Select-Object -First 1
  if ($line) {
    $listenPid = ($line -split '\s+')[-1]
    Write-Host "[Port 8082] LISTENING PID=$listenPid" -ForegroundColor Yellow
  } else {
    Write-Host '[Port 8082] not listening' -ForegroundColor Yellow
  }
}

Show-PortOwner
Test-Metro | Out-Null

Write-Host ''
Write-Host '== ADB ==' -ForegroundColor Cyan
adb devices -l
Write-Host ''
Write-Host '== adb reverse ==' -ForegroundColor Cyan
adb reverse --list

Write-Host ''
Write-Host 'Restart Metro safely: pnpm mobile:metro:recover' -ForegroundColor Cyan
