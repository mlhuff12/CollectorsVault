# Testing Guidelines

This guide covers all testing conventions, commands, and patterns for CollectorsVault.

## Running Tests

### API unit tests

From the repo root:

```bash
dotnet test tests/CollectorsVault.Api.Tests/CollectorsVault.Api.Tests.csproj
```

### Client tests

From `client`:

```bash
npm test
```

### Vite validation pipeline

From `client`:

```bash
npm run verify:vite
```

This runs the Vite production build plus the full Vitest suite. Run this for any client build or tooling changes.

### CI test command

From `client`:

```bash
npm run test:ci
```

## Unit Test Conventions

### Naming

Test method names must follow `Method_Condition_Expected`.

Examples:

- `AddBookAsync_WhenCalled_PersistsAllBasicFields`
- `LookupByIsbnAsync_WhenNoWorksKey_UsesEditionDescription`

### Structure

Each test body must use `// Arrange`, `// Act`, and `// Assert` section comments:

- Do **not** add a blank line immediately after `// Arrange`.
- Include one blank line before `// Act`.
- Include one blank line before `// Assert`.

Example:

```csharp
[Fact]
public async Task LookupByIsbnAsync_WhenNoWorksKey_UsesEditionDescription()
{
	// Arrange
	var (service, _) = CreateService(("/api/books", Ok("{}")));

	// Act
	var result = await service.LookupByIsbnAsync("9780547928227");

	// Assert
	Assert.NotNull(result);
}
```

### Test categories

Test classes are categorized using xUnit `[Trait]` attributes:

- `[Trait("Category", "Unit")]` — unit tests in `tests/CollectorsVault.Api.Tests/unit/`
- `[Trait("Category", "Integration")]` — integration tests in `tests/CollectorsVault.Api.Tests/integration/`

### API unit tests (Moq, no database)

API unit tests are in `tests/CollectorsVault.Api.Tests`. They mock `IVaultService` with Moq and do not hit SQLite or the database.

### Client unit tests

UI tests mock API service calls (`client/src/services/api.ts`) and do not hit the backend.

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

## Pre-PR Checklist

Before opening a pull request, run and report results for:

- `dotnet build CollectorsVault.sln`
- `npm test` in `client` (when client code or behavior is affected)
- `npm run build` in `client`
- `npm run verify:vite` in `client` (for client build/tooling changes)
- Any manual test steps performed (for example: create, list, delete flows)
