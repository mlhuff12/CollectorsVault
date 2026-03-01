# Collectors Vault API

ASP.NET Core Web API (.NET 8) for managing books, movies, and games.

## Run Locally

```bash
dotnet restore
dotnet run
```

Base URL:

- `http://localhost:5000`

## Configuration & Secrets

Sensitive values (`Jwt:Key` and optionally `ConnectionStrings:DefaultConnection`) are managed
via [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets)
and are **never committed to the repository**.

### First-time setup

```bash
cd server
dotnet user-secrets set "Jwt:Key" "<your-strong-secret-key>"
# Optional: override the default SQLite path
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Data Source=Data/collectorsvault.db"
```

See `secrets.json.example` for the expected structure. Share values with teammates via a
password manager or secrets vault rather than in the repo.

### How it works

- `appsettings.json` contains non-sensitive defaults (logging, CORS, JWT issuer, DB path).
- User Secrets (stored outside the repo in `%APPDATA%\Microsoft\UserSecrets\collectorsvault-server-secrets\secrets.json`) override `appsettings.json` at runtime in the `Development` environment.
- The application falls back to a hard-coded development key when `Jwt:Key` is not configured, and **logs a warning** to alert you. Do not rely on this fallback in any shared or production environment.

## Debug in VS Code

From **Run and Debug**, use `API: Launch .NET`.

- Builds `server/CollectorsVault.Api.csproj`
- Launches API with debugger attached
- Opens Swagger when the API is ready

Swagger:

- UI: `http://localhost:5000/swagger`
- OpenAPI JSON: `http://localhost:5000/swagger/v1/swagger.json`

## API Documentation

- Swagger/OpenAPI is enabled in all environments.
- XML documentation comments from controllers are included in Swagger output.
- Open `http://localhost:5000/swagger` to browse and test endpoints.

## Persistence

Uses SQLite with file-based persistence.

- Configured in `appsettings.json`
- Default path: `Data/collectorsvault.db`
- API startup logs the resolved DB path

## Endpoints

- `GET /api/vault` — list all items (includes category)
- `POST /api/vault/books` — add a book
- `POST /api/vault/movies` — add a movie
- `POST /api/vault/games` — add a game
- `DELETE /api/vault/{id}` — delete an item

## Testing With Swagger

1. Open `http://localhost:5000/swagger`
2. Expand an endpoint.
3. Click **Try it out**.
4. Paste a sample request body.
5. Click **Execute**.

### Sample: `POST /api/vault/books`

```json
{
	"title": "The Hobbit",
	"authors": ["J.R.R. Tolkien"],
	"isbn": "978-0547928227",
	"year": 1937,
	"genre": "Fantasy"
}
```

### Sample: `POST /api/vault/books` (minimal required fields)

```json
{
	"title": "Good Omens",
	"authors": ["Neil Gaiman", "Terry Pratchett"]
}
```

### Sample: `POST /api/vault/movies`

```json
{
	"title": "Interstellar",
	"director": "Christopher Nolan",
	"releaseYear": 2014,
	"genre": "Sci-Fi"
}
```

### Sample: `POST /api/vault/games`

```json
{
	"title": "Elden Ring",
	"platform": "PC",
	"releaseDate": "2022-02-25"
}
```

### Sample: `DELETE /api/vault/{id}`

- Use an existing ID from `GET /api/vault`.
- Example: `DELETE /api/vault/3`

## Notes

- CORS is enabled for development use.
- Root path `/` redirects to Swagger UI.

## Unit Tests (Moq, no database)

API unit tests are in:

- `tests/CollectorsVault.Api.Tests`

Run tests:

```bash
dotnet test tests/CollectorsVault.Api.Tests/CollectorsVault.Api.Tests.csproj
```

Tests mock `IVaultService` with Moq and do not hit SQLite/database.