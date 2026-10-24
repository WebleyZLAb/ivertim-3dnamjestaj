param([switch]$NoWindow, [switch]$Quiet)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
$launchLog = Join-Path $repoRoot 'ivertim-launch.log'
if ($Quiet) { Set-Content -LiteralPath $launchLog -Value ('Pokretanje: ' + (Get-Date -Format o)) -Encoding utf8 }
$port = 4317
$url = "http://127.0.0.1:$port"
try {
    $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (!$node) { throw 'Instaliraj Node.js 22.12 ili noviji, pa ponovo pokreni ovaj fajl.' }
    $nodeVersion = & $node -p 'process.versions.node'
    if ([version]$nodeVersion -lt [version]'22.12.0') { throw 'Potreban je Node.js 22.12 ili noviji.' }
    $lockPath = Join-Path $repoRoot 'pnpm-lock.yaml'
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $lockHash = [BitConverter]::ToString($hasher.ComputeHash([System.IO.File]::ReadAllBytes($lockPath))).Replace('-', '')
    $hasher.Dispose()
    $stampPath = Join-Path $repoRoot 'node_modules\.ivertim-lock'
    $needsInstall = !(Test-Path -LiteralPath 'node_modules\electron\cli.js') -or !(Test-Path -LiteralPath 'node_modules\vite\bin\vite.js') -or !(Test-Path -LiteralPath $stampPath) -or (Get-Content -LiteralPath $stampPath -Raw).Trim() -ne $lockHash
    if ($needsInstall) {
        Write-Host 'Pripremam pakete za IVERTIM 3D. Prvo pokretanje traje duze...'
        $pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
        if ($pnpm) { & $pnpm.Source install --frozen-lockfile }
        else {
            $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
            if (!$npx) { throw 'Node.js instalacija mora sadrzati npm/npx.' }
            $packageVersion = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).packageManager
            & $npx.Source --yes $packageVersion install --frozen-lockfile
        }
        if ($LASTEXITCODE -ne 0) { throw 'Instalacija paketa nije uspjela. Provjeri internet vezu.' }
        Set-Content -LiteralPath $stampPath -Value $lockHash -Encoding ascii
    }
    $distIndex = Join-Path $repoRoot 'dist\index.html'
    $needsBuild = !(Test-Path -LiteralPath $distIndex)
    if (!$needsBuild) {
        $buildTime = (Get-Item -LiteralPath $distIndex).LastWriteTimeUtc
        $sources = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'src'),(Join-Path $repoRoot 'lib'),(Join-Path $repoRoot 'public') -Recurse -File) + @(Get-Item -LiteralPath 'index.html','package.json','pnpm-lock.yaml','vite.config.ts','tsconfig.json')
        $needsBuild = [bool]($sources | Where-Object { $_.LastWriteTimeUtc -gt $buildTime } | Select-Object -First 1)
    }
    if ($needsBuild) {
        Write-Host 'Pripremam aplikaciju...'
        & $node 'node_modules\typescript\bin\tsc' --noEmit
        if ($LASTEXITCODE -ne 0) { throw 'Provjera programa nije prosla.' }
        & $node 'node_modules\vite\bin\vite.js' build
        if ($LASTEXITCODE -ne 0) { throw 'Izrada aplikacije nije uspjela.' }
    }
    function Test-CorpusServer {
        try {
            $health = Invoke-RestMethod -Uri "$url/__ivertim_health" -TimeoutSec 2
            return $health.app -eq 'ivertim-corpus' -and $health.root -eq $repoRoot
        } catch { return $false }
    }
    if (!(Test-CorpusServer)) {
        $serverScript = Join-Path $PSScriptRoot 'serve-corpus.mjs'
        $process = Start-Process -FilePath $node -ArgumentList @(('"' + $serverScript + '"')) -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $repoRoot 'corpus-server.log') -RedirectStandardError (Join-Path $repoRoot 'corpus-server-error.log') -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if (Test-CorpusServer) { $ready = $true; break }
            if ($process.HasExited) { break }
            Start-Sleep -Milliseconds 300
        }
        if (!$ready) { throw 'Program se nije pokrenuo. Port 4317 je mozda zauzet. Pogledaj corpus-server-error.log.' }
    }
    if (!$NoWindow) {
        & (Join-Path $PSScriptRoot 'create-shortcut.ps1')
        $electronCli = Join-Path $repoRoot 'node_modules\electron\cli.js'
        if (!(Test-Path -LiteralPath $electronCli)) { throw 'Nedostaje desktop pokretac. Pokreni instalaciju paketa ponovo.' }
        Write-Host 'Pripremam desktop prozor (prvi put se preuzima dodatni paket)...'
        & $node (Join-Path $repoRoot 'node_modules\electron\install.js')
        if ($LASTEXITCODE -ne 0) { throw 'Preuzimanje desktop pokretaca nije uspjelo. Provjeri internet vezu i pokreni ponovo.' }
        $desktopScript = Join-Path $PSScriptRoot 'desktop-corpus.cjs'
        Start-Process -FilePath $node -ArgumentList @(('"' + $electronCli + '"'), ('"' + $desktopScript + '"')) -WorkingDirectory $repoRoot -WindowStyle Hidden
    }
    if ($Quiet) { Add-Content -LiteralPath $launchLog -Value 'Ivertim 3D je spreman.' -Encoding utf8 }
    Write-Host 'Ivertim 3D je spreman.'
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($Quiet) {
        Add-Content -LiteralPath $launchLog -Value $_.Exception.Message -Encoding utf8
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show($_.Exception.Message, 'Ivertim 3D', 'OK', 'Error') | Out-Null
    }
    exit 1
}

