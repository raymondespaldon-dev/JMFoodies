<#
  Run B launcher for JMFoodies Slice 3.

  Starts the two independent workers in parallel, each in its own new child
  worktree, following Orca's parallel-start rules: one spec file per worker,
  each start gets its own receipt file, and every receipt is read afterwards.

  Preconditions checked before anything starts:
    - SLICE_3_SPEC.md exists (the frozen contract)
    - git working tree is clean
    - the branch is feat/booking-hardening

  Usage:
    .\scripts\run-run-b.ps1
    .\scripts\run-run-b.ps1 -SkipDb          # only the web worker
    .\scripts\run-run-b.ps1 -SkipWeb         # only the db worker
    .\scripts\run-run-b.ps1 -AgentDb opencode -AgentWeb opencode

  REMINDER: confirm the Freebuff high window is open before running with
  -AgentDb freebuff. Starting that worker outside a window leaves a dead worker.
#>
[CmdletBinding()]
param(
  [string]$AgentDb  = 'freebuff',
  [string]$AgentWeb = 'opencode',
  [switch]$SkipDb,
  [switch]$SkipWeb
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Fail($msg) { Write-Host "ABORT: $msg" -ForegroundColor Red; exit 1 }

# --- preconditions -----------------------------------------------------------
if (-not (Test-Path (Join-Path $repo 'SLICE_3_SPEC.md'))) {
  Fail 'SLICE_3_SPEC.md not found. Run Orca Run A (slice3-contract) first and freeze the contract.'
}

$specs = @{}
if (-not $SkipDb)  { $specs['slice3-db']  = $AgentDb }
if (-not $SkipWeb) { $specs['slice3-web'] = $AgentWeb }
if ($specs.Count -eq 0) { Fail 'Nothing to start: both workers were skipped.' }

foreach ($name in $specs.Keys) {
  $spec = Join-Path $repo ".orca\specs\$name.md"
  if (-not (Test-Path $spec)) { Fail "Missing worker spec: $spec" }
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'feat/booking-hardening') {
  Write-Host "WARNING: on branch '$branch', expected 'feat/booking-hardening'." -ForegroundColor Yellow
}

$dirty = (git status --porcelain)
if ($dirty) {
  Write-Host 'WARNING: working tree is not clean. Workers branch from the current commit.' -ForegroundColor Yellow
  $dirty | ForEach-Object { Write-Host "  $_" }
}

if (-not (Select-String -Path (Join-Path $repo '.env') -Pattern '^\s*SUPABASE_DB_URL\s*=' -Quiet -ErrorAction SilentlyContinue)) {
  Write-Host 'NOTE: SUPABASE_DB_URL is not set, so slice3-db cannot execute its SQL tests.' -ForegroundColor Yellow
  Write-Host '      The worker will still write them, but they will be unverified.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Starting workers:' -ForegroundColor Cyan
foreach ($name in $specs.Keys) { Write-Host ("  {0,-12} -> {1}" -f $name, $specs[$name]) }
Write-Host ''

# --- parallel start ----------------------------------------------------------
$d = Join-Path $env:TEMP ("jmfoodies-runb-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $d | Out-Null

$starts = foreach ($name in $specs.Keys) {
  $orcaArgs = @(
    'orchestration', 'worker-start',
    '--environment', 'local',
    '--spec-file', ".orca/specs/$name.md",
    '--worktree', 'new-child',
    '--name', $name,
    '--agent', $specs[$name]
  )
  $p = Start-Process -FilePath 'orca' -NoNewWindow -PassThru -WorkingDirectory $repo `
    -ArgumentList $orcaArgs `
    -RedirectStandardOutput (Join-Path $d "$name.out") `
    -RedirectStandardError  (Join-Path $d "$name.err")
  $null = $p.Handle
  [pscustomobject]@{ Name = $name; Process = $p }
}

$exit = @{}
foreach ($s in $starts) {
  $s.Process.WaitForExit()
  $exit[$s.Name] = $s.Process.ExitCode
  Write-Host ("{0} exit {1}" -f $s.Name, $s.Process.ExitCode) -ForegroundColor $(if ($s.Process.ExitCode -eq 0) { 'Green' } else { 'Red' })
}

Write-Host ''
Write-Host "Receipts in $d" -ForegroundColor Cyan
Get-ChildItem $d | ForEach-Object {
  Write-Host "== $($_.Name)" -ForegroundColor Cyan
  Get-Content $_.FullName | Out-Host
}

# A non-zero exit or a missing receipt is an unknown outcome. Never blindly retry.
$bad = $exit.GetEnumerator() | Where-Object { $_.Value -ne 0 }
if ($bad) {
  Write-Host ''
  Write-Host 'One or more starts failed. Run this before retrying anything:' -ForegroundColor Yellow
  Write-Host '  orca orchestration worker-list --environment local'
  exit 1
}

Write-Host ''
Write-Host 'Workers started. End your turn now - Orca wakes you when they report. Do not poll.' -ForegroundColor Green
