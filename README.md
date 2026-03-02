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