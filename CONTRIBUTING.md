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

For a quick overview of running the app locally, see [README Quick Start](README.md#quick-start).

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

These rules are enforced automatically by the `api-unit-test-style` CI job
(see `.github/workflows/api-ci.yml`), which runs `scripts/check-unit-test-style.py`
on every PR that touches `tests/CollectorsVault.Api.Tests/unit/`.
The CI job fails if any `[Fact]` or `[Theory]` test violates the naming
convention or is missing one of the required AAA comments.

## Documentation updates

- Update relevant docs whenever behavior, architecture, or workflows change.
- Keep API endpoint docs aligned with actual request/response contracts.
- If UI behavior changes, update user-facing docs with route and usage details.
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

## Linting

Run lint checks locally before opening a PR to catch style and code-quality issues early.
See [docs/server-lint-strategy.md](docs/server-lint-strategy.md) for the full decision
record and expected failure behavior.

- Client (from `client`):
  ```bash
  npm run lint
  ```
- Server (from the repository root):
  ```bash
  dotnet format CollectorsVault.sln --verify-no-changes
  ```
  To auto-fix server formatting issues before committing:
  ```bash
  dotnet format CollectorsVault.sln
  ```

CI runs both lint checks on every pull request and fails if violations are present.

### Testing command cheat sheet

| What | Command | Directory |
|------|---------|-----------|
| API unit tests | `dotnet test tests/CollectorsVault.Api.Tests/CollectorsVault.Api.Tests.csproj` | repo root |
| Solution build | `dotnet build CollectorsVault.sln` | repo root |
| Server lint check | `dotnet format CollectorsVault.sln --verify-no-changes` | repo root |
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
