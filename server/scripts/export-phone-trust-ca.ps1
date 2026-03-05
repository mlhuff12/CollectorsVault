Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-MkcertPath {
    $command = Get-Command mkcert.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $winGetPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe\mkcert.exe'
    if (Test-Path $winGetPath) {
        return $winGetPath
    }

    return $null
}

$mkcertPath = Get-MkcertPath
if (-not $mkcertPath) {
    throw "mkcert.exe was not found. Install it first: winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements --silent"
}

$caroot = & $mkcertPath -CAROOT
$sourceCaFile = Join-Path $caroot 'rootCA.pem'
if (-not (Test-Path $sourceCaFile)) {
    throw "rootCA.pem was not found at: $sourceCaFile"
}

$serverRoot = Split-Path -Parent $PSScriptRoot
$exportDir = Join-Path $serverRoot '.certs\phone-trust'
$exportCaFile = Join-Path $exportDir 'rootCA.pem'

New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
Copy-Item -Path $sourceCaFile -Destination $exportCaFile -Force

Write-Host ''
Write-Host 'Phone trust CA exported.' -ForegroundColor Green
Write-Host "Source:      $sourceCaFile"
Write-Host "Export file: $exportCaFile"
Write-Host ''
Write-Host 'Install this root CA file on your phone and mark it trusted for VPN and apps.'
