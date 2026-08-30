# dsh-music installer for DeepSeek Harness (web profile)
# Copies the plugin into ~/.dsh, installs NeteaseCloudMusicApi, and appends
# the two loader rows to the profile's cordis.patch.yml.

$ErrorActionPreference = "Stop"

$DSH_HOME = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME ".dsh" }
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function To-Forward([string]$p) { return ($p -replace '\\', '/') }

Write-Host ""
Write-Host "==> dsh-music installer" -ForegroundColor Cyan
Write-Host "    DSH_HOME: $DSH_HOME"
Write-Host "    source  : $root"

# --- 1. host plugin (spawns the NeteaseCloudMusicApi server on DSH startup) ---
$hostDest = Join-Path $DSH_HOME "plugins\dsh-music"
$apiDir   = Join-Path $hostDest "netease-api"
New-Item -ItemType Directory -Force -Path $apiDir | Out-Null
Copy-Item (Join-Path $root "host\index.js")               (Join-Path $hostDest "index.js")               -Force
Copy-Item (Join-Path $root "host\netease-api\launch.js")  (Join-Path $apiDir "launch.js")                -Force
Copy-Item (Join-Path $root "host\netease-api\package.json") (Join-Path $apiDir "package.json")           -Force
Write-Host "    host plugin -> $hostDest"

# --- 2. install NeteaseCloudMusicApi ---
Write-Host "    installing NeteaseCloudMusicApi (npm)..."
Push-Location $apiDir
try {
  npm install --no-audit --no-fund 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "npm install failed (check your npm proxy / registry)" }
} finally {
  Pop-Location
}
Write-Host "    netease-api ready"

# --- 3. client bundle (the music player UI) ---
$clientDest = Join-Path $DSH_HOME "profiles\node_modules\@deepseek-ai\dsh-client-ui-music"
New-Item -ItemType Directory -Force -Path (Join-Path $clientDest "lib") | Out-Null
Copy-Item (Join-Path $root "client\package.json") (Join-Path $clientDest "package.json") -Force
Copy-Item (Join-Path $root "client\lib\index.js") (Join-Path $clientDest "lib\index.js") -Force
Copy-Item (Join-Path $root "client\lib\client.js") (Join-Path $clientDest "lib\client.js") -Force
Write-Host "    client bundle -> $clientDest"

# --- 4. resolve node path ---
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = "node" }

$hostIndex    = To-Forward (Join-Path $hostDest "index.js")
$serverScript = To-Forward (Join-Path $apiDir "launch.js")
$nodePathFwd  = To-Forward $nodePath

# --- 5. patch the profile (idempotent) ---
$patchFile = Join-Path $DSH_HOME "profiles\web\cordis.patch.yml"
if (-not (Test-Path $patchFile)) {
  Write-Warning "    patch file not found: $patchFile"
  Write-Warning "    add the rows in README '手动安装' section yourself."
} else {
  $existing = Get-Content $patchFile -Raw -ErrorAction SilentlyContinue
  if ($existing -match 'id:\s*ui-music' -and $existing -match 'id:\s*tool-music-server') {
    Write-Host "    patch already contains dsh-music rows (skip)"
  } else {
    $row = @"

# dsh-music: Netease Cloud Music player (top-right overlay) + API server
- insert:
    - id: ui-music
      name: '@deepseek-ai/dsh-client-ui-music'
- insert:
    - id: tool-music-server
      name: 'file:///$hostIndex'
      config:
        nodePath: '$nodePathFwd'
        serverScript: '$serverScript'
        port: 3000
"@
    Add-Content -Path $patchFile -Value $row -Encoding UTF8
    Write-Host "    patch appended -> $patchFile"
  }
}

Write-Host ""
Write-Host "==> done. Restart DSH (or hard-refresh the page); the music player appears top-right." -ForegroundColor Green
