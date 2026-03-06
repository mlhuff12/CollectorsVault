# Collectors Vault API

ASP.NET Core Web API (.NET 8) for managing books, movies, and games.

## Run Locally

```bash
dotnet restore
dotnet run
```

Base URLs:

- `https://localhost:5000` (HTTPS — used by the client and required for camera access)
- `http://localhost:5001` (HTTP — redirects to HTTPS)

For LAN phone testing in this workspace, VS Code task `API: Run .NET` starts the API at:

- `https://0.0.0.0:5000` (open as `https://<YOUR_PC_IP>:5000`)

For a trusted certificate on your LAN IP (instead of browser warnings), generate a local cert:

- VS Code task: `API: Setup LAN HTTPS Cert`

```powershell
winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements --silent
$mkcertPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe\mkcert.exe"
& $mkcertPath -install
& $mkcertPath -cert-file ".\server\.certs\lan-api-cert.pem" -key-file ".\server\.certs\lan-api-key.pem" localhost 127.0.0.1 ::1 <YOUR_PC_IP_1> <YOUR_PC_IP_2>
```

The `API: Setup LAN HTTPS Cert` task now auto-includes all active LAN IPv4 addresses on your PC.
If needed, you can run the script directly with a custom list:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\scripts\setup-lan-cert.ps1 -IpAddress "192.168.1.10,10.0.0.25"
```

`API: Run .NET` is preconfigured to use `server/.certs/lan-api-cert.pem` and `server/.certs/lan-api-key.pem`.

Note: trusting `mkcert` on the PC does not trust your phone automatically. Install `rootCA.pem` from `$(mkcert -CAROOT)` on your phone to remove HTTPS certificate warnings there.

For easier transfer to your phone, run task `API: Export Phone Trust CA`. It copies the CA file to:

- `server/.certs/phone-trust/rootCA.pem`

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

### HTTPS dev certificate

The API serves HTTPS on `https://localhost:5000`. Trust the .NET development certificate
once per machine so browsers do not show certificate warnings:

```bash
dotnet dev-certs https --trust
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

- UI: `https://localhost:5000/swagger`
- OpenAPI JSON: `https://localhost:5000/swagger/v1/swagger.json`

## API Documentation

- Swagger/OpenAPI is enabled in all environments.
- XML documentation comments from controllers are included in Swagger output.
- Open `https://localhost:5000/swagger` to browse and test endpoints.

## Persistence

Uses SQLite with file-based persistence. Each concrete item type (Book, Movie, Game) is stored in its own dedicated table using the Table Per Concrete Type (TPC) inheritance strategy — there is no shared `VaultItem` table.

- Configured in `appsettings.json`
- Default path: `Data/collectorsvault.db`
- API startup logs the resolved DB path
- Database tables: `User`, `Book`, `Movie`, `Game`

## Database Schema Standards

When adding or modifying database schema, follow these conventions:

- **Table names** must be **singular** (e.g., `User`, `Book`, `Movie`, `Game`).
- **Boolean/bit column names** must use the `{columnName}Ind` suffix (e.g., `AdminInd`).
- Configure table names explicitly with `.ToTable("TableName")` in `OnModelCreating`.

## Coding Standards

- **`if` / `else if` / `else` statements must always use curly braces** even for single-line bodies.

  ✅ Correct:
  ```csharp
  if (result == null)
  {
      return NotFound();
  }
  ```

  ❌ Incorrect:
  ```csharp
  if (result == null)
      return NotFound();
  ```

## Endpoints

- `GET /api/vault` — list all items (includes category)
- `POST /api/vault/books` — add a book
- `POST /api/vault/movies` — add a movie
- `POST /api/vault/games` — add a game
- `DELETE /api/vault/{id}` — delete an item

## Testing With Swagger

1. Open `https://localhost:5000/swagger`
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