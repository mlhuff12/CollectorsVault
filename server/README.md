# Collectors Vault API

ASP.NET Core Web API (.NET 8) for managing books, movies, and games.

## Run Locally

```bash
dotnet restore
dotnet run
```

Base URL:

- `http://localhost:5000`

Swagger:

- UI: `http://localhost:5000/swagger`
- OpenAPI JSON: `http://localhost:5000/swagger/v1/swagger.json`

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