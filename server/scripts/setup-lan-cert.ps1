param(
    [string]$IpAddress
)

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

function Get-PreferredLanIp {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.ValidLifetime -ne [TimeSpan]::Zero
        } |
        Sort-Object -Property SkipAsSource

    return ($candidates | Select-Object -First 1 -ExpandProperty IPAddress)
}

$mkcertPath = Get-MkcertPath
if (-not $mkcertPath) {
    throw "mkcert.exe was not found. Install it first: winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements --silent"
}

if ([string]::IsNullOrWhiteSpace($IpAddress)) {
    $IpAddress = Get-PreferredLanIp
}

if ([string]::IsNullOrWhiteSpace($IpAddress)) {
    throw 'Could not determine a LAN IPv4 address automatically. Rerun with -IpAddress <YOUR_PC_IP>.'
}

$serverRoot = Split-Path -Parent $PSScriptRoot
$certDir = Join-Path $serverRoot '.certs'
$certFile = Join-Path $certDir 'lan-api-cert.pem'
$keyFile = Join-Path $certDir 'lan-api-key.pem'

New-Item -ItemType Directory -Path $certDir -Force | Out-Null

& $mkcertPath -install | Out-Host
& $mkcertPath -cert-file $certFile -key-file $keyFile localhost 127.0.0.1 ::1 $IpAddress | Out-Host

$caroot = & $mkcertPath -CAROOT
$rootCaPem = Join-Path $caroot 'rootCA.pem'

Write-Host ''
Write-Host 'LAN HTTPS certificate generated.' -ForegroundColor Green
Write-Host "LAN IP: $IpAddress"
Write-Host "API cert: $certFile"
Write-Host "API key:  $keyFile"
Write-Host "Phone trust file: $rootCaPem"
Write-Host ''
Write-Host 'Next steps:'
Write-Host "1) Start API task 'API: Run .NET'"
Write-Host "2) Open https://${IpAddress}:5000/swagger on your phone"
Write-Host '3) If phone warns, install rootCA.pem on the phone and mark it trusted for VPN and apps'
