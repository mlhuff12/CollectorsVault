# LAN HTTPS Certificate Setup (Computer + Phone)

This guide shows how to run CollectorsVault over HTTPS on your local network and trust the certificate on both your computer and your phone.

## Goal

Access these URLs from your phone without certificate warnings:

- `https://<YOUR_PC_IP>:3000` (client)
- `https://<YOUR_PC_IP>:5000/swagger` (API)

## Prerequisites

- Windows PC on the same Wi-Fi network as your phone.
- `CollectorsVault` workspace opened in VS Code.
- Ports `3000` and `5000` allowed on Private network in Windows Firewall.

## Computer Setup

### Option A: Use VS Code tasks (recommended)

1. Run task `API: Setup LAN HTTPS Cert`.
2. Run task `API: Export Phone Trust CA`.
3. Run task `Full Stack: API + Client`.

What these tasks do:

- Create/update API cert files:
  - `server/.certs/lan-api-cert.pem`
  - `server/.certs/lan-api-key.pem`
- Export trust CA file for phone install:
  - `server/.certs/phone-trust/rootCA.pem`
- Start API on `https://0.0.0.0:5000` using the generated cert.

### Option B: Use terminal commands

```powershell
winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements --silent
$mkcertPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe\mkcert.exe"
& $mkcertPath -install
& $mkcertPath -cert-file ".\server\.certs\lan-api-cert.pem" -key-file ".\server\.certs\lan-api-key.pem" localhost 127.0.0.1 ::1 <YOUR_PC_IP>
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\scripts\export-phone-trust-ca.ps1
```

## Phone Setup

Install this file on your phone:

- `server/.certs/phone-trust/rootCA.pem`

How you transfer it is up to you (email to self, cloud drive, USB, local share, etc.).

### iPhone (iOS)

1. Open `rootCA.pem` on the phone and install the profile.
2. Go to `Settings` > `General` > `VPN & Device Management` and confirm it is installed.
3. Go to `Settings` > `General` > `About` > `Certificate Trust Settings`.
4. Enable full trust for the installed root certificate.

### Android

1. Open `rootCA.pem` on the phone and install the certificate.
2. On most Android versions, use:
   - `Settings` > `Security` > `Encryption & credentials` > `Install a certificate` > `CA certificate`
3. Confirm/install the certificate when prompted.

Note: Menu names vary by Android version/vendor.

## Verify

1. On PC, confirm API is running:
   - `https://localhost:5000/swagger`
2. On phone, open:
   - `https://<YOUR_PC_IP>:3000`
   - `https://<YOUR_PC_IP>:5000/swagger`

If both load without browser cert warnings, setup is complete.

## When To Regenerate

Regenerate certs whenever your PC LAN IP changes.

Quick path:

1. Run `API: Setup LAN HTTPS Cert`
2. Run `API: Export Phone Trust CA`
3. Reinstall updated `rootCA.pem` on phone if required

## Troubleshooting

- Phone cannot connect at all:
  - Check both devices are on same Wi-Fi.
  - Check Windows Firewall inbound rules for `3000` and `5000`.
- API starts but cert warning persists on phone:
  - Confirm phone has `rootCA.pem` installed and trusted.
  - Re-run `API: Export Phone Trust CA` and reinstall.
- API task fails looking for cert files:
  - Run `API: Setup LAN HTTPS Cert` first.
- Browser says site is unreachable:
  - Confirm `Full Stack: API + Client` is running.
  - Verify current LAN IP via `ipconfig` and use that IP in phone URL.
