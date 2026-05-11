# Local Voice Control – Setup Script
# Downloads Sherpa-ONNX WASM files with bundled English (zipformer) ASR model.
# The bundle is the official k2-fsa release for English-only streaming ASR:
#   sherpa-onnx-wasm-simd-v{VERSION}-en-asr-zipformer.tar.bz2
#
# Prerequisites:
#   - PowerShell 7+
#
# Usage: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

$SherpaRelease = "1.10.30"   # Update to latest sherpa-onnx release
$BundleName    = "sherpa-onnx-wasm-simd-v${SherpaRelease}-en-asr-zipformer"
$GhUrl         = "https://github.com/k2-fsa/sherpa-onnx/releases/download/v$SherpaRelease"

$ScriptDir = Split-Path -Parent $PSScriptRoot
$PublicDir = Join-Path $ScriptDir "public"
$SherpaDir = Join-Path $PublicDir "sherpa-onnx"
$ModelsDir = Join-Path $PublicDir "models"
$TmpDir    = Join-Path $env:TEMP "sherpa-setup"

function Download {
    param([string]$Url, [string]$Dest)
    Write-Host "  Downloading $(Split-Path -Leaf $Dest) ..."
    Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
}

# ── 1. Create directories ────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $SherpaDir | Out-Null
New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null
New-Item -ItemType Directory -Force -Path $TmpDir    | Out-Null

# ── 2. Download Sherpa-ONNX WASM bundle (English model bundled in .data) ─────
Write-Host "`n[1/2] Downloading Sherpa-ONNX English WASM bundle (v$SherpaRelease, ~200 MB)..."

$archive = "${BundleName}.tar.bz2"
$archiveDest = Join-Path $TmpDir $archive

try {
    Download "$GhUrl/$archive" $archiveDest
} catch {
    Write-Warning "Could not download $archive. Check release version at:"
    Write-Warning "  https://github.com/k2-fsa/sherpa-onnx/releases"
    Write-Warning "Then update `$SherpaRelease in this script."
    exit 1
}

Write-Host "  Extracting..."
Push-Location $TmpDir
tar -xjf $archive
Pop-Location

$extractedDir = Join-Path $TmpDir $BundleName
Get-ChildItem $extractedDir -File | Where-Object { $_.Name -match '^sherpa-onnx' } |
    ForEach-Object { Copy-Item $_.FullName $SherpaDir -Force; Write-Host "  Copied $($_.Name)" }

# ── 3. Copy .env ──────────────────────────────────────────────────────────────
Write-Host "`n[2/2] Creating .env file..."

$EnvExample = Join-Path $ScriptDir ".env.example"
$EnvFile    = Join-Path $ScriptDir ".env"

if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host "  Created .env from .env.example"
} else {
    Write-Host "  .env already exists, skipping"
}

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host "`n✅ Setup complete!"
Write-Host "   WASM files : $SherpaDir"
Write-Host "   Model files: $ModelsDir"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1.  npm install"
Write-Host "  2.  npm run ollama:up      (start Ollama via Docker)"
Write-Host "  3.  npm run ollama:pull    (pull qwen2.5:0.5b model)"
Write-Host "  4.  npm run dev"
