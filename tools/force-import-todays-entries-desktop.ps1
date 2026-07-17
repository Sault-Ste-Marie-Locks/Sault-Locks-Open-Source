param(
  [string]$JsonPath = "",
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"

function Write-Step($Text) {
  Write-Host ""
  Write-Host "==== $Text ===="
}

if (-not $JsonPath) {
  $JsonPath = Join-Path (Split-Path -Parent $PSCommandPath) "..\sault-locks-today-2026-07-16.json"
}
$JsonPath = [System.IO.Path]::GetFullPath($JsonPath)
if (-not (Test-Path -LiteralPath $JsonPath)) {
  throw "JSON file was not found: $JsonPath"
}

$log = Join-Path ([Environment]::GetFolderPath("Desktop")) "lock-release-v24-force-import-log.txt"
Start-Transcript -Path $log -Force | Out-Null

try {
  Write-Step "Loading JSON"
  $data = Get-Content -Raw -LiteralPath $JsonPath | ConvertFrom-Json
  $records = @($data.records)
  if ($records.Count -lt 1) { throw "No records were found in the JSON file." }
  $date = [string]$data.date
  if (-not $date) { $date = [string]$records[0].date }
  Write-Host "JSON: $JsonPath"
  Write-Host "Date: $date"
  Write-Host "Source records: $($records.Count)"

  $ports = @(6117,6115,6116,3000)
  $base = $null

  function Test-AppPort([int]$Port) {
    try {
      $u = "http://127.0.0.1:$Port/health"
      $h = Invoke-RestMethod $u -TimeoutSec 2
      if ($h.ok) { return "http://127.0.0.1:$Port" }
    } catch {}
    return $null
  }

  Write-Step "Finding running Lock Release app"
  foreach ($p in $ports) {
    $candidate = Test-AppPort $p
    if ($candidate) { $base = $candidate; break }
  }

  if (-not $base -and -not $NoLaunch) {
    Write-Host "App API is not running. Trying to launch Lock Release..."
    $exeCandidates = @(
      "$env:LOCALAPPDATA\LockReleaseDesktop\Lock Release-win32-x64\Lock Release.exe",
      "$env:LOCALAPPDATA\Lock Release Desktop\Lock Release-win32-x64\Lock Release.exe"
    )
    $exe = $exeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($exe) {
      Start-Process -FilePath $exe | Out-Null
      for ($i=0; $i -lt 40 -and -not $base; $i++) {
        Start-Sleep -Milliseconds 750
        foreach ($p in $ports) {
          $candidate = Test-AppPort $p
          if ($candidate) { $base = $candidate; break }
        }
      }
    } else {
      Write-Host "Lock Release exe was not found in the normal install path."
    }
  }

  if (-not $base) {
    throw "The Lock Release local API is not running. Open Lock Release, wait 15 seconds, then run this again."
  }

  Write-Host "Using app API: $base"

  Write-Step "Checking DB before import"
  try {
    $debugBefore = Invoke-RestMethod "$base/api/debug/db" -TimeoutSec 10
    Write-Host "DB path: $($debugBefore.dbFile)"
    Write-Host "Total before: $($debugBefore.total)"
  } catch {
    Write-Host "DB debug endpoint is not available yet. Continuing with older app API."
  }

  $beforeDay = 0
  try {
    $before = Invoke-RestMethod "$base/api/records/day?date=$date&limit=5000" -TimeoutSec 20
    $beforeDay = @($before.traffic).Count
  } catch {
    Write-Host "Could not read day count before import: $($_.Exception.Message)"
  }
  Write-Host "$date records before: $beforeDay"

  Write-Step "Importing records"
  $usedNewEndpoint = $false
  try {
    $body = Get-Content -Raw -LiteralPath $JsonPath
    $result = Invoke-RestMethod "$base/api/import/json" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 120
    $usedNewEndpoint = $true
    Write-Host "Used V24 /api/import/json endpoint."
    Write-Host "DB path: $($result.dbFile)"
    Write-Host "$($result.date) records: $($result.before) -> $($result.after)"
    Write-Host "Imported/updated: $($result.addedOrUpdated)"
  } catch {
    Write-Host "V24 endpoint unavailable or failed: $($_.Exception.Message)"
    Write-Host "Falling back to per-entry import through /api/dashboard/entry/update..."
    $n = 0
    foreach ($r in $records) {
      $id = [string]$r.dashboardId
      if (-not $id) { $id = [string]$r.id }
      if (-not $id) { $id = [string]$r.mobileId }
      $payload = [pscustomobject]@{
        id = $id
        entry = $r
      }
      Invoke-RestMethod "$base/api/dashboard/entry/update" -Method POST -Body ($payload | ConvertTo-Json -Depth 100) -ContentType "application/json" -TimeoutSec 60 | Out-Null
      $n++
      Write-Host "Imported $n / $($records.Count): $($r.time) $($r.vessel)"
    }
  }

  Write-Step "Verifying import"
  Start-Sleep -Seconds 1
  $after = Invoke-RestMethod "$base/api/records/day?date=$date&limit=5000" -TimeoutSec 30
  $afterRecords = @($after.traffic)
  Write-Host "$date records after: $($afterRecords.Count)"

  $exportPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "lock-release-after-import-$date.json"
  try {
    $export = Invoke-RestMethod "$base/api/export" -TimeoutSec 60
    $export | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $exportPath -Encoding UTF8
    Write-Host "Export saved: $exportPath"
  } catch {
    Write-Host "Could not save export: $($_.Exception.Message)"
  }

  if ($afterRecords.Count -lt 1) {
    throw "The API still shows 0 records for $date after import. Send this log: $log"
  }

  Write-Host ""
  Write-Host "SUCCESS."
  Write-Host "If Records is still blank, press Ctrl+R in Lock Release or fully Quit from the tray and reopen."
  Write-Host "Log saved: $log"
} catch {
  Write-Host ""
  Write-Host "FAILED: $($_.Exception.Message)"
  Write-Host "Send this log: $log"
  exit 1
} finally {
  try { Stop-Transcript | Out-Null } catch {}
}
