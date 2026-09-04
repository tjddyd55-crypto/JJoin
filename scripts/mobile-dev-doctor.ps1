# Metro / USB dev environment doctor (Windows)
# Usage: pnpm mobile:doctor

$ErrorActionPreference = 'Continue'
Write-Host '== JJOINZONE mobile doctor ==' -ForegroundColor Cyan

function Test-Metro {
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8082/status' -TimeoutSec 5 -UseBasicParsing
    $body = [System.Text.Encoding]::UTF8.GetString($r.Content)
    Write-Host "[Metro] $body" -ForegroundColor Green
    return $true
  } catch {
    Write-Host '[Metro] NOT RUNNING or /status timeout on :8082' -ForegroundColor Red
    return $false
  }
}

function Show-PortOwner {
  $line = netstat -ano | Select-String ':8082' | Select-String 'LISTENING' | Select-Object -First 1
  if ($line) {
    $pid = ($line -split '\s+')[-1]
    Write-Host "[Port 8082] LISTENING PID=$pid" -ForegroundColor Yellow
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
