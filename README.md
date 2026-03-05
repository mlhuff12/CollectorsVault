# Collectors Vault

Collectors Vault is a full-stack app for managing personal collections of books, movies, and games.

- Frontend: React + TypeScript
- Backend: ASP.NET Core Web API (.NET 8)
- Database: SQLite (file-based persistence)

## Current Features

- Add books, movies, and games.
- View all items from `Home`.
- Filtered tabs and routes for each category:
	- `/`
	- `/books`
	- `/movies`
	- `/games`
- Delete items from any tab.
- Swagger UI for interactive API testing.

## Quick Start

### 1) Run the API

From `server`:

```bash
dotnet run
```

API base URL: `https://localhost:5001`

Swagger UI: `https://localhost:5001/swagger`

### 2) Run the client

From `client`:

```bash
npm install
npm start
```

Client URL (default): `https://localhost:3000`

### 3) Run UI tests

From `client`:

```bash
npm run test:ci
```

### 4) Run Vite validation pipeline (Phase 4)

From `client`:

```bash
npm run verify:vite
```

This runs the Vite production build plus the Vitest suite.

UI tests mock API service calls (`client/src/services/api.ts`) and do not hit the backend.

## Debugging in VS Code

This repository includes preconfigured VS Code debug files:

- `.vscode/launch.json`
- `.vscode/tasks.json`

Use **Run and Debug** and choose one of:

- `API: Launch .NET`
- `Client: Start Dev Server`
- `Client: Debug in Edge`
- `Full Stack: API + Client`

`Full Stack: API + Client` starts the API and client together and opens browser debugging.

## Local Phone Testing (LAN)

Use this when testing the app from a phone on your local Wi-Fi.

### 1) Start API + client with LAN binding

From VS Code, run task:

- `Full Stack: API + Client`

The workspace tasks are configured to bind:

- API to `https://0.0.0.0:5000`
- Client dev server to `0.0.0.0:3000`

### 2) Find your computer's local IPv4 address

On Windows PowerShell:

```powershell
ipconfig
```

Look for your active adapter's `IPv4 Address` (example: `192.168.50.53`).

### 3) Open from phone

On your phone browser (same Wi-Fi network):

- Client UI: `https://<YOUR_PC_IP>:3000`
- API Swagger: `https://<YOUR_PC_IP>:5000/swagger`

If Swagger opens on phone, API networking is working.

### 4) Firewall check (if phone cannot connect)

Allow inbound TCP on ports `3000` and `5000` in Windows Defender Firewall (Private network).

### 5) Generate a trusted LAN HTTPS cert (recommended)

Run VS Code task:

- `API: Setup LAN HTTPS Cert`

Equivalent PowerShell (if you prefer terminal):

```powershell
winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements --silent
$mkcertPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe\mkcert.exe"
& $mkcertPath -install
& $mkcertPath -cert-file ".\server\.certs\lan-api-cert.pem" -key-file ".\server\.certs\lan-api-key.pem" localhost 127.0.0.1 ::1 <YOUR_PC_IP>
```

The `API: Run .NET` task is configured to use `server/.certs/lan-api-cert.pem` and `server/.certs/lan-api-key.pem` automatically.

Important for phone trust:

- `mkcert -install` trusts the CA on your PC only.
- To remove HTTPS warnings on your phone, install the generated `rootCA.pem` from `$(mkcert -CAROOT)` on the phone and trust it for apps/VPN.
- Use task `API: Export Phone Trust CA` to copy it into `server/.certs/phone-trust/rootCA.pem` for easy transfer.

### 6) Notes about API base URL

`client/src/services/api.ts` rewrites `localhost` API URLs to the current browser host when opened from another device on LAN. This lets the same local config work on both desktop and phone.

## Persistence

Data persists in the SQLite file:

- `server/Data/collectorsvault.db`

The API logs the resolved database path at startup.

## Project Structure

- `client/` — React frontend
- `server/` — ASP.NET Core API
- `CollectorsVault.sln` — solution file

For module-level details, see:

- `client/README.md`
- `server/README.md`
- `docs/lan-https-certificate-setup.md`