# JJOINZONE one-click USB DEV device connection (Windows)
# Usage: pnpm dev:device
# SSOT Metro port: 8082. Never kills other projects' Metros (8081/8084/...).
# Never touches Production package com.jjoin.app.

$ErrorActionPreference = 'Stop'
$MetroPort = 8082
$DevPackage = 'com.jjoin.app.dev'
$ProdPackage = 'com.jjoin.app'
$Scheme = 'jjoindev'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$MobileDir = Join-Path $RepoRoot 'apps\mobile'

function Write-Step([string]$msg) { Write-Host "`n== $msg ==" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Get-Adb {
  $adb = Get-Command adb -ErrorAction SilentlyContinue
  if (-not $adb) { throw 'adb not found on PATH. Install Android platform-tools.' }
  return $adb.Source
}

function Get-UsbDeviceSerial {
  # Force array: a single match is a [string], and $s[0] would be the first char.
  $lines = @(& adb devices | Where-Object { $_ -match '\tdevice$' })
  if ($lines.Count -eq 0) { return $null }
  $serial = ($lines[0] -split '\s+')[0]
  return $serial
}

function Test-PackageInstalled([string]$serial, [string]$pkg) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & adb -s $serial shell pm path $pkg 2>$null
  $ok = ($LASTEXITCODE -eq 0 -and "$out" -match 'package:')
  $ErrorActionPreference = $prev
  return $ok
}

function Get-ListenerPid([int]$port) {
  $line = netstat -ano | Select-String ":$port" | Select-String 'LISTENING' | Select-Object -First 1
  if (-not $line) { return $null }
  return [int](($line.ToString() -split '\s+')[-1])
}

function Stop-JjoinzoneMetroOnly {
  $pidOnPort = Get-ListenerPid $MetroPort
  if (-not $pidOnPort) {
    Write-Ok "Port $MetroPort is free"
    return
  }
  $cmd = ''
  try {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$pidOnPort").CommandLine
  } catch {}
  $isJjoin =
    ($cmd -match 'jjoin' -or $cmd -match 'apps[\\/]mobile' -or $cmd -match 'expo start' -or $cmd -match "port $MetroPort" -or $cmd -match "--port=$MetroPort")
  if (-not $isJjoin -and $cmd) {
    Write-Fail "Port $MetroPort held by non-JJOINZONE process PID=$pidOnPort"
    Write-Host "  CommandLine: $cmd"
    throw "Refusing to kill non-JJOINZONE process on $MetroPort. Free the port manually or use pnpm mobile:metro:recover after confirming ownership."
  }
  Write-Warn "Stopping JJOINZONE Metro listener PID=$pidOnPort on :$MetroPort"
  Stop-Process -Id $pidOnPort -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  if (Get-ListenerPid $MetroPort) {
    throw "Failed to free port $MetroPort (PID $pidOnPort still listening)"
  }
  Write-Ok "Freed port $MetroPort"
}

function Ensure-AdbReverse([string]$serial) {
  # Only remove+recreate 8082 ??NEVER adb reverse --remove-all
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & adb -s $serial reverse --remove "tcp:$MetroPort" 2>$null | Out-Null
  & adb -s $serial reverse "tcp:$MetroPort" "tcp:$MetroPort"
  $rc = $LASTEXITCODE
  $list = & adb -s $serial reverse --list
  $ErrorActionPreference = $prev
  if ($rc -ne 0) { throw "adb reverse tcp:$MetroPort failed" }
  $joined = (@($list) -join "`n")
  if ($joined -notmatch "tcp:$MetroPort") {
    throw "adb reverse tcp:$MetroPort not present after setup. Got:`n$joined"
  }
  Write-Ok "adb reverse tcp:$MetroPort -> tcp:$MetroPort"
  Write-Host $joined
}

function Wait-MetroReady([int]$timeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    foreach ($hostAddr in @('127.0.0.1', 'localhost', '[::1]')) {
      try {
        $body = & curl.exe -s -m 2 "http://${hostAddr}:$MetroPort/status"
        if ($body -match 'packager-status:running') {
          Write-Ok "Metro ready via ${hostAddr}: $body"
          return $true
        }
      } catch {}
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Start-Metro {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
  $env:APP_VARIANT = 'development'
  $log = Join-Path $env:TEMP 'jjoin-metro-8082.log'
  if (Test-Path $log) { Remove-Item $log -Force }
  Write-Step "Starting Metro on :$MetroPort"
  Write-Host "log: $log"
  $arg = "/c cd /d `"$MobileDir`" && set REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1&& set APP_VARIANT=development&& pnpm exec expo start --dev-client --port $MetroPort --host lan > `"$log`" 2>&1"
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList $arg -WindowStyle Minimized -PassThru
  Write-Ok "Metro launcher PID=$($p.Id)"
  if (-not (Wait-MetroReady 120)) {
    Write-Fail 'Metro did not become ready in time'
    if (Test-Path $log) { Get-Content $log -Tail 40 }
    throw 'Metro start timeout'
  }
  $listenPid = Get-ListenerPid $MetroPort
  Write-Ok "Metro listening PID=$listenPid on :$MetroPort"
  return $listenPid
}

function Launch-DevApp([string]$serial) {
  $url = "${Scheme}://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$MetroPort"
  Write-Step 'Launching DEV app deep link'
  & adb -s $serial shell am force-stop $DevPackage 2>$null | Out-Null
  Start-Sleep -Milliseconds 500
  & adb -s $serial shell am start -a android.intent.action.VIEW -d $url $DevPackage
  if ($LASTEXITCODE -ne 0) {
    & adb -s $serial shell am start -a android.intent.action.VIEW -d $url
  }
  Write-Ok "Launched $DevPackage via $url"
}

# ---- main ----
Write-Host 'JJOINZONE pnpm dev:device' -ForegroundColor Magenta
Write-Host "Metro SSOT port: $MetroPort | DEV package: $DevPackage | never touch: $ProdPackage"

Get-Adb | Out-Null
Write-Step 'Device check'
$serial = Get-UsbDeviceSerial
if (-not $serial) {
  Write-Fail 'No authorized USB device (adb devices must show device state)'
  & adb devices -l
  throw 'No USB device'
}
Write-Ok "Device serial=$serial"
& adb devices -l

Write-Step "DEV package $DevPackage"
if (-not (Test-PackageInstalled $serial $DevPackage)) {
  Write-Fail "$DevPackage not installed. Install DEV build first (EAS preview / local)."
  throw 'DEV package missing'
}
Write-Ok "$DevPackage installed"
if (Test-PackageInstalled $serial $ProdPackage) {
  Write-Ok "$ProdPackage present (left untouched)"
}

Write-Step "Port $MetroPort occupancy (JJOINZONE-only kill)"
Stop-JjoinzoneMetroOnly

Write-Step "ADB reverse tcp:$MetroPort only (no --remove-all)"
Ensure-AdbReverse $serial

$metroPid = Start-Metro

Launch-DevApp $serial

Write-Step 'Summary'
Write-Host "serial=$serial"
Write-Host "metroPort=$MetroPort metroPid=$metroPid"
Write-Host 'adb reverse:'
& adb -s $serial reverse --list
Write-Ok 'dev:device complete. Open DEV app; if red screen, shake device and Reload.'
Write-Host 'Recovery: pnpm mobile:metro:recover   Doctor: pnpm mobile:doctor'
