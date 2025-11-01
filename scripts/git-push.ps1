param(
  [string]$message = "",
  [switch]$dryRun,
  [switch]$skipChecks,
  [string]$createBranch = "",
  [switch]$createPr,
  [string]$exclude = "",
  [switch]$noVerify,
  [switch]$force
)

function Write-Log { param($m) Write-Host "[gp] $m" }

Set-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent) | Out-Null
Set-Location -Path ..

$cwd = Get-Location
Write-Log "Working directory: $cwd"

# Collect changed files (tracked and untracked)
$status = git status --porcelain
if ($status -eq $null) { $status = "" }
$files = @()
if ($status.Trim() -ne "") {
  $status -split "\n" | ForEach-Object {
    $parts = ($_ -replace '^[\s]+' , '') -split '\s+',2
    if ($parts.Length -ge 2) { $files += $parts[1].Trim() }
  }
}

if ($files.Count -eq 0) {
  Write-Log "Nessuna modifica da committare. Uscita."
  exit 0
}

# Apply excludes (comma-separated list of explicit paths)
$excludes = @()
if ($exclude -and $exclude.Trim() -ne "") {
  $excludes = $exclude -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
}

if ($dryRun) {
  Write-Log "DRY RUN: i seguenti file verrebbero aggiunti/committati/pushati:"
  $files | ForEach-Object { Write-Host " - $_" }
  if ($excludes.Count -gt 0) { Write-Host "Excludes: $($excludes -join ', ')" }
  exit 0
}

# Pre-checks (lint + build) unless skipped
if (-not $skipChecks) {
  if ((Get-Command npm -ErrorAction SilentlyContinue) -ne $null) {
    if (Get-Content package.json | ConvertFrom-Json | Get-Member -Name scripts -ErrorAction SilentlyContinue) {
      $pkg = Get-Content package.json | ConvertFrom-Json
      if ($pkg.scripts.lint) {
        Write-Log "Eseguo: npm run lint"
        npm run lint
        if ($LASTEXITCODE -ne 0) { Write-Error "lint fallito. Abort."; exit $LASTEXITCODE }
      }
      if ($pkg.scripts.build) {
        Write-Log "Eseguo: npm run build"
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Error "build fallita. Abort."; exit $LASTEXITCODE }
      }
    }
  } else {
    Write-Log "npm non trovato: salto i check (se volevi i check installa npm o passa -skipChecks)."
  }
}

# Stage all changes, then unstage excludes (if any)
Write-Log "Eseguo: git add -A"
git add -A
if ($excludes.Count -gt 0) {
  foreach ($e in $excludes) {
    Write-Log "Escludo dal commit: $e"
    git reset --quiet -- $e 2>$null
  }
}

# Recompute staged files
$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Log "Nessun file staged dopo l'esclusione. Uscita."
  exit 0
}

# Build commit message (verbose by default if not provided)
if (-not $message -or $message.Trim() -eq "") {
  $fileList = ($staged -split "\n") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
  $short = "chore: aggiornamento automatico — files: $($fileList -join ', ')"
  $body = "Files modificati:`n" + ($fileList | ForEach-Object { "- $_" } ) -join "`n"
  $message = $short + "`n`n" + $body
}

Write-Log "Commit message:\n$message"

# Commit
if ($noVerify) { git commit -m $message --no-verify } else { git commit -m $message }
if ($LASTEXITCODE -ne 0) { Write-Error "Commit fallito (forse non ci sono variazioni effettive). Abort."; exit $LASTEXITCODE }

# Create branch if requested
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($createBranch -and $createBranch.Trim() -ne "") {
  Write-Log "Creo branch: $createBranch"
  git checkout -b $createBranch
  $pushTarget = $createBranch
} else {
  $pushTarget = $currentBranch
}

# Push
if ($force) { Write-Log "Attenzione: push forzato abilitato (user requested)"; git push origin HEAD --force } else { git push origin HEAD }
if ($LASTEXITCODE -ne 0) { Write-Error "git push fallito."; exit $LASTEXITCODE }

Write-Log "Push completato su branch $pushTarget"

# Optionally create PR using gh
if ($createPr) {
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Log "Creazione PR con gh..."
    $title = ($message -split "`n")[0]
    gh pr create --base main --head $pushTarget --title $title --body "$message"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Creazione PR fallita con gh." }
  } else {
    Write-Warning "GitHub CLI (gh) non trovato: apro URL PR nel browser per crearlo manualmente.";
    $repoUrl = git remote get-url origin
    if ($repoUrl -match "github.com[:/](.+)/(.+)(\.git)?") {
      $owner = $Matches[1]; $repo = $Matches[2]
      $prUrl = "https://github.com/$owner/$repo/compare/main...$pushTarget?expand=1"
      Start-Process $prUrl
    }
  }
}

Write-Log "Done."
