# Contributing to CollectorsVault

Thanks for your interest in improving CollectorsVault.

## Table of Contents

- [Development Setup](#development-setup)
- [Branching and Scope](#branching-and-scope)
- [Code and Test Style](#code-and-test-style)
- [Validation Before PR](#validation-before-pr)
- [Documentation Expectations](#documentation-expectations)
- [Pull Requests](#pull-requests)
- [Reporting Issues](#reporting-issues)

## Development Setup

1. Clone the repository.
2. Start API:
   1. `cd server`
   2. `dotnet restore`
   3. `dotnet run`
3. Start client:
   1. `cd client`
   2. `npm install`
   3. `npm start`

## Branching and Scope

- Create a feature branch from `main`.
- Keep PRs focused and small when possible.
- Avoid unrelated refactors in feature/fix PRs.

## Code and Test Style

- Keep changes consistent with existing project style.
- See [Documentation expectations](#documentation-expectations) for guidance on updating docs.

### API Unit Test Style (`tests/CollectorsVault.Api.Tests/unit`)

Follow the conventions in [docs/testing-guidelines.md](docs/testing-guidelines.md):

- Name unit tests using `Method_Condition_Expected`.
- Use `// Arrange`, `// Act`, and `// Assert` comments in each unit test.
- Do not add a blank line immediately after `// Arrange`.
- Include one blank line before `// Act`.
- Include one blank line before `// Assert`.
- For API unit tests (`tests/CollectorsVault.Api.Tests/unit`), use `Moq` to mock and configure collaborators.
- Use `MockBehavior.Strict` for all Moq mocks by default. The only recognized exception is mocks that also set `CallBase = true` (e.g., EF Core `DbContext` subclass mocks). See [docs/testing-guidelines.md](docs/testing-guidelines.md) for the full policy and examples.
- Do not use EF in-memory setup in API unit tests when a mocked collaborator can cover the scenario.
- Use `tests/CollectorsVault.Api.Tests/unit/API_UNIT_TEST_TEMPLATE.md` as the baseline pattern for test naming and `// Arrange`, `// Act`, `// Assert` structure.

## Validation Before PR

See [docs/testing-guidelines.md](docs/testing-guidelines.md) for all test commands, conventions, and the pre-PR checklist.

- Run and report checks related to your change before opening a PR.
- At minimum, include results for:
  - `dotnet build CollectorsVault.sln`
  - `npm test` in `client` (when client code or behavior is affected)
  - `npm run build` in `client`
- For client build/tooling changes (including Vite migration work), also include:
  - `npm run verify:vite` in `client`
- Include any manual test steps performed (for example: create, list, delete flows).

### Testing command cheat sheet

| What | Command | Directory |
|------|---------|-----------|
| API unit tests | `dotnet test tests/CollectorsVault.Api.Tests/CollectorsVault.Api.Tests.csproj` | repo root |
| Solution build | `dotnet build CollectorsVault.sln` | repo root |
| Client tests | `npm test` | `client/` |
| Client build | `npm run build` | `client/` |
| Vite verify (build + tests) | `npm run verify:vite` | `client/` |

## Documentation Expectations

- Update relevant docs whenever behavior, architecture, or workflows change.
- Keep API endpoint docs aligned with actual request/response contracts.
- If UI behavior changes, update user-facing docs with route and usage details.

### README Updates

- Update `README.md` files when setup commands, routes, persistence, or API usage changes.
- Keep `README.md`, `client/README.md`, and `server/README.md` consistent with each other.
- If Swagger payloads change, update sample request bodies in `server/README.md`.

## Pull Requests

- Use the PR template.
- Include a summary of what changed and why.
- Include testing notes (build/run/manual test results).

## Reporting issues

Please use the issue templates for bugs and feature requests.
