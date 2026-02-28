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

API base URL: `http://localhost:5000`

Swagger UI: `http://localhost:5000/swagger`

### 2) Run the client

From `client`:

```bash
npm install
npm start
```

Client URL (default): `http://localhost:3002`

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