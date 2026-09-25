$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$RepoUrl = 'https://github.com/aikongen2026/FISTE.git'
$Branch = 'main'
$SiteUrl = 'https://fiste.onrender.com'
$ExpectedHealthVersion = 'v15-rev39'
$ExpectedUiRevision = 'REV 39'
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkRoot = Join-Path $env:LOCALAPPDATA 'FisteAutoDeploy'
$RepoDir = Join-Path $WorkRoot 'FISTE'

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

    Write-Step 'Git mangler. Installerer Git for Windows automatisk med winget'
    Write-Host 'Windows kan vise ett installasjons-/UAC-vindu. Godkjenn dette hvis du blir spurt.' -ForegroundColor Yellow

    $args = @(
        'install','--id','Git.Git','-e','--source','winget',
        '--accept-package-agreements','--accept-source-agreements',
        '--silent'
    )

    & $winget.Source @args
    $code = $LASTEXITCODE

    # Winget can return a non-zero status when the package is already installed.
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        if (Refresh-GitPath) { return $true }
    }

    if ($code -ne 0) {
        Write-Host "Winget returnerte kode $code. Prover direkte installasjon som reserve." -ForegroundColor Yellow
    }
    return $false
}

function Install-GitDirect {
    Write-Step 'Prover direkte installasjon av offisiell Git for Windows'
    $tempExe = Join-Path $env:TEMP 'Fiste-GitForWindows-Setup.exe'

    try {
        $headers = @{ 'User-Agent' = 'Fiste-AutoDeploy' }
        $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers $headers -TimeoutSec 30
        $asset = $release.assets |
            Where-Object { $_.name -match '^Git-.*-64-bit\.exe$' -and $_.name -notmatch 'Portable' } |
            Select-Object -First 1

        if (-not $asset) { throw 'Fant ikke 64-bit Git-installasjonsfil i siste offisielle utgivelse.' }

        Write-Host "Laster ned $($asset.name)..."
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tempExe -Headers $headers -UseBasicParsing -TimeoutSec 180

        Write-Host 'Starter Git-installasjon for gjeldende Windows-bruker...'
        $proc = Start-Process -FilePath $tempExe -ArgumentList @('/VERYSILENT','/NORESTART','/NOCANCEL','/SP-','/CURRENTUSER') -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            throw "Git-installasjonen returnerte kode $($proc.ExitCode)."
        }

        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Seconds 2
            if (Refresh-GitPath) { return $true }
        }
    }
    catch {
        Write-Host "Direkte installasjon feilet: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    finally {
        Remove-Item $tempExe -Force -ErrorAction SilentlyContinue
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

    if (Install-GitDirect) {
        $git = Refresh-GitPath
        if ($git) { return $git }
    }

    Write-Host ''
    Write-Host 'Kunne ikke installere Git automatisk.' -ForegroundColor Red
    Write-Host 'Den offisielle Git-siden apnes na. Installer x64-versjonen og dobbeltklikk deretter denne filen pa nytt.'
    Start-Process 'https://git-scm.com/install/windows'
    return $null
}

function Run-Git([string[]]$Arguments) {
    & $script:GitExe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git-kommando feilet: git $($Arguments -join ' ')"
    }
}

try {
    Write-Host 'FISTE - ETT KLIKK TIL GITHUB + RENDER' -ForegroundColor Green
    Write-Host 'Denne filen installerer Git ved behov, synkroniserer Fiste til GitHub og venter pa Render.'

    $script:GitExe = Ensure-Git
    if (-not $script:GitExe) { exit 10 }

    Write-Step "Git er klar: $script:GitExe"
    New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null

    if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
        if (Test-Path $RepoDir) { Remove-Item $RepoDir -Recurse -Force }
        Write-Step 'Kloner FISTE-repoet forste gang'
        Run-Git @('clone','--branch',$Branch,'--single-branch',$RepoUrl,$RepoDir)
    } else {
        Write-Step 'Henter siste versjon fra GitHub'
        Run-Git @('-C',$RepoDir,'fetch','origin',$Branch,'--prune')
        Run-Git @('-C',$RepoDir,'checkout',$Branch)
        Run-Git @('-C',$RepoDir,'reset','--hard',"origin/$Branch")
    }

    Write-Step 'Synkroniserer de nye appfilene'
    $roboArgs = @(
        $SourceDir,
        $RepoDir,
        '/MIR','/R:2','/W:1','/NFL','/NDL','/NP','/NJH','/NJS',
        '/XD','.git','node_modules','.deploy-cache',
        '/XF','1-OPPDATER-OG-APNE-FISTE.bat','deploy-fiste.ps1','DEPLOY-INFO.txt'
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
        Write-Step "Lager commit: Fiste $ExpectedUiRevision"
        Run-Git @('-C',$RepoDir,'commit','-m',"Deploy Fiste $ExpectedUiRevision - $stamp")

        Write-Step 'Laster opp til GitHub'
        Write-Host 'Forste gang kan GitHub/Git Credential Manager apne nettleseren for innlogging. Godkjenn en gang.' -ForegroundColor Yellow
        $env:GCM_INTERACTIVE = 'Always'
        $env:GIT_TERMINAL_PROMPT = '1'
        Run-Git @('-C',$RepoDir,'push','origin',$Branch)
    } else {
        Write-Step 'Ingen filendringer a sende til GitHub'
    }

    Write-Step 'Venter pa at Render skal bygge den nye versjonen'
    $healthUrl = "$SiteUrl/api/health"
    $deployed = $false
    for ($i = 1; $i -le 72; $i++) {
        Start-Sleep -Seconds 5
        try {
            $health = Invoke-RestMethod -Uri ($healthUrl + '?t=' + [DateTimeOffset]::Now.ToUnixTimeSeconds()) -TimeoutSec 10 -Headers @{'Cache-Control'='no-cache'}
            if ($health.version -eq $ExpectedHealthVersion -or $health.revision -eq $ExpectedUiRevision) {
                $deployed = $true
                break
            }
            Write-Host '.' -NoNewline
        } catch {
            Write-Host '.' -NoNewline
        }
    }
    Write-Host ''

    if ($deployed) {
        Write-Host "FERDIG: GitHub og Render viser $ExpectedUiRevision." -ForegroundColor Green
    } else {
        Write-Host 'GitHub er oppdatert, men Render bekreftet ikke ny versjon innen 6 minutter.' -ForegroundColor Yellow
        Write-Host 'Hvis Render Auto-Deploy star pa On Commit, bygger den normalt ferdig av seg selv.'
    }

    Write-Step 'Apner Fiste i nettleseren'
    $cacheBust = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    Start-Process "$SiteUrl/?deploy=$cacheBust"
    exit 0
}
catch {
    Write-Host "`nFEIL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
    Write-Host 'Vanligste arsak er at GitHub-innlogging ikke er fullfort, eller at repoet ikke kan pushes.'
    Write-Host 'Repo: https://github.com/aikongen2026/FISTE'
    exit 1
}
