$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackagePath = Join-Path $SourceDir 'package.json'
if (-not (Test-Path $PackagePath)) { throw "Fant ikke package.json i $SourceDir" }
$Package = Get-Content -Raw -LiteralPath $PackagePath | ConvertFrom-Json
$RevisionNumber = [int]$Package.appRevision
$ExpectedUiRevision = ('REV {0:D2}' -f $RevisionNumber)

# Kan overstyres med miljo-variabler, men normalt trenger du aldri endre disse.
$RepoUrl = if ($env:FISTE_REPO_URL) { $env:FISTE_REPO_URL } else { 'https://github.com/aikongen2026/FISTE.git' }
$Branch = if ($env:FISTE_GIT_BRANCH) { $env:FISTE_GIT_BRANCH } else { 'main' }
$SiteUrl = if ($env:FISTE_SITE_URL) { $env:FISTE_SITE_URL.TrimEnd('/') } else { 'https://fiste.onrender.com' }

$WorkRoot = Join-Path $env:LOCALAPPDATA 'FisteAutoDeploy'
$RepoDir = Join-Path $WorkRoot 'FISTE-1'

function Write-Step([string]$Text) {
    Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Find-Git {
    $cmd = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        "$env:ProgramFiles\Git\cmd\git.exe",
        "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Git\cmd\git.exe"
    ) | Where-Object { $_ -and $_ -notmatch '^\\Git' }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }

    $desktopRoot = Join-Path $env:LOCALAPPDATA 'GitHubDesktop'
    if (Test-Path $desktopRoot) {
        $desktopApps = Get-ChildItem -Path $desktopRoot -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending
        foreach ($app in $desktopApps) {
            $candidate = Join-Path $app.FullName 'resources\app\git\cmd\git.exe'
            if (Test-Path $candidate) { return $candidate }
        }
    }

    return $null
}

function Refresh-GitPath {
    $git = Find-Git
    if ($git) {
        $gitDir = Split-Path -Parent $git
        if ($env:Path -notlike "*$gitDir*") { $env:Path = "$gitDir;$env:Path" }
        return $git
    }
    return $null
}

function Install-GitWithWinget {
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { return $false }

    Write-Step 'Git mangler. Installerer Git for Windows automatisk'
    $args = @(
        'install','--id','Git.Git','-e','--source','winget',
        '--accept-package-agreements','--accept-source-agreements','--silent'
    )
    & $winget.Source @args

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        if (Refresh-GitPath) { return $true }
    }
    return $false
}

function Ensure-Git {
    $git = Refresh-GitPath
    if ($git) { return $git }
    if (Install-GitWithWinget) {
        $git = Refresh-GitPath
        if ($git) { return $git }
    }
    throw 'Git kunne ikke finnes eller installeres automatisk.'
}

function Run-Git([string[]]$Arguments) {
    & $script:GitExe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git-kommando feilet: git $($Arguments -join ' ')"
    }
}

function Test-RepoRemote {
    if (-not (Test-Path (Join-Path $RepoDir '.git'))) { return }
    $remote = (& $script:GitExe -C $RepoDir remote get-url origin 2>$null)
    if ($LASTEXITCODE -eq 0 -and $remote -and ($remote.Trim() -ne $RepoUrl)) {
        Write-Step 'Oppdaterer lagret GitHub-adresse for Fiste'
        Run-Git @('-C',$RepoDir,'remote','set-url','origin',$RepoUrl)
    }
}

try {
    Write-Host 'FISTE - AUTOMATISK OPPDATERING' -ForegroundColor Green
    Write-Host "Kilde: $SourceDir"
    Write-Host "Versjon: $ExpectedUiRevision"
    Write-Host 'Du trenger ikke a apne GitHub eller Render manuelt.'

    $script:GitExe = Ensure-Git
    Write-Step "Git er klar: $script:GitExe"
    New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null

    if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
        if (Test-Path $RepoDir) { Remove-Item $RepoDir -Recurse -Force }
        Write-Step 'Kloner Fiste-repoet (bare forste gang)'
        Run-Git @('clone','--branch',$Branch,'--single-branch',$RepoUrl,$RepoDir)
    }
    else {
        Test-RepoRemote
        Write-Step 'Henter siste versjon automatisk'
        Run-Git @('-C',$RepoDir,'fetch','origin',$Branch,'--prune')
        Run-Git @('-C',$RepoDir,'checkout',$Branch)
        Run-Git @('-C',$RepoDir,'reset','--hard',"origin/$Branch")
    }

    Write-Step 'Synkroniserer denne versjonen til deploy-repoet'
    $roboArgs = @(
        $SourceDir,
        $RepoDir,
        '/MIR','/R:2','/W:1','/NFL','/NDL','/NP','/NJH','/NJS',
        '/XD','.git','.github','node_modules','.deploy-cache',
        '/XF','1-OPPDATER-OG-APNE-FISTE.bat','deploy-fiste.ps1','DEPLOY-INFO.txt','AUTO-DEPLOY.txt'
    )
    & robocopy.exe @roboArgs | Out-Null
    $roboExit = $LASTEXITCODE
    if ($roboExit -ge 8) { throw "Robocopy feilet med kode $roboExit" }

    Run-Git @('-C',$RepoDir,'config','user.name','Fiste AutoDeploy')
    Run-Git @('-C',$RepoDir,'config','user.email','fiste-autodeploy@users.noreply.github.com')
    Run-Git @('-C',$RepoDir,'add','-A')

    $changes = & $script:GitExe -C $RepoDir status --porcelain
    if ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese Git-status.' }

    if ($changes) {
        $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
        Write-Step "Lager automatisk commit for $ExpectedUiRevision"
        Run-Git @('-C',$RepoDir,'commit','-m',"Deploy Fiste $ExpectedUiRevision - $stamp")

        Write-Step 'Sender til GitHub automatisk'
        # Git Credential Manager husker godkjenningen etter forste innlogging.
        # Forste gang kan et Microsoft/GitHub-vindu dukke opp for sikker godkjenning.
        $env:GCM_INTERACTIVE = 'Auto'
        $env:GIT_TERMINAL_PROMPT = '1'
        Run-Git @('-C',$RepoDir,'push','origin',$Branch)
    }
    else {
        Write-Step 'Ingen filendringer - repoet har allerede denne versjonen'
    }

    Write-Step 'Venter pa Render Auto-Deploy'
    $healthUrl = "$SiteUrl/api/health"
    $deployed = $false
    $lastHealth = $null
    for ($i = 1; $i -le 90; $i++) {
        Start-Sleep -Seconds 4
        try {
            $lastHealth = Invoke-RestMethod -Uri ($healthUrl + '?t=' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()) -TimeoutSec 10 -Headers @{'Cache-Control'='no-cache'}
            $healthRevision = [string]$lastHealth.revision
            if ($healthRevision -eq $ExpectedUiRevision -or $healthRevision -eq ("REV $RevisionNumber")) {
                $deployed = $true
                break
            }
            Write-Host '.' -NoNewline
        }
        catch {
            Write-Host '.' -NoNewline
        }
    }
    Write-Host ''

    if ($deployed) {
        Write-Host "FERDIG: $ExpectedUiRevision er live pa Render." -ForegroundColor Green
    }
    else {
        $seen = if ($lastHealth -and $lastHealth.revision) { [string]$lastHealth.revision } else { 'ingen respons' }
        Write-Host "Koden er sendt til GitHub, men Render bekreftet ikke $ExpectedUiRevision innen 6 minutter. Sist sett: $seen" -ForegroundColor Yellow
        Write-Host 'Render fortsetter normalt deployen i bakgrunnen hvis Auto-Deploy er aktivert.'
    }

    Write-Step 'Apner den ferdige appen - ikke GitHub'
    $cacheBust = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    Start-Process "$SiteUrl/?deploy=$cacheBust"
    exit 0
}
catch {
    Write-Host "`nFEIL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
    Write-Host 'Du skal normalt ikke bruke GitHub-nettsiden.'
    Write-Host 'Hvis dette er aller forste kjøring, kan Git Credential Manager kreve en engangsinnlogging.'
    exit 1
}
