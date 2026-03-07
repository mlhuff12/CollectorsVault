# Contributing to CollectorsVault

Thanks for your interest in improving CollectorsVault.

## Development setup

1. Clone the repository.
2. Start API:
   - `cd server`
   - `dotnet restore`
   - `dotnet run`
3. Start client:
   - `cd client`
   - `npm install`
   - `npm start`

## Branching

- Create a feature branch from `main`.
- Keep PRs focused and small when possible.

## Code style

- Keep changes consistent with existing project style.
- Avoid unrelated refactors in feature/fix PRs.
- See [Documentation updates](#documentation-updates) for guidance on updating docs.

### Unit test style

Follow the conventions in [docs/testing-guidelines.md](docs/testing-guidelines.md):

- Name unit tests using `Method_Condition_Expected`.
- Use `// Arrange`, `// Act`, and `// Assert` comments in each unit test.
- Do not add a blank line immediately after `// Arrange`.
- Include one blank line before `// Act`.
- Include one blank line before `// Assert`.

## Documentation updates

- Update relevant docs whenever behavior, architecture, or workflows change.
- Keep API endpoint docs aligned with actual request/response contracts.
- If UI behavior changes, update user-facing docs with route and usage details.

## Tests and validation

See [docs/testing-guidelines.md](docs/testing-guidelines.md) for all test commands, conventions, and the pre-PR checklist.

- Run and report checks related to your change before opening a PR.
- At minimum, include results for:
   - `dotnet build CollectorsVault.sln`
   - `npm test` in `client` (when client code or behavior is affected)
   - `npm run build` in `client`
- For client build/tooling changes (including Vite migration work), also include:
   - `npm run verify:vite` in `client`
- Include any manual test steps performed (for example: create, list, delete flows).

## README updates

- Update `README.md` files when setup commands, routes, persistence, or API usage changes.
- Keep `README.md`, `client/README.md`, and `server/README.md` consistent with each other.
- If Swagger payloads change, update sample request bodies in `server/README.md`.

## Pull requests

- Use the PR template.
- Include a summary of what changed and why.
- Include testing notes (build/run/manual test results).

## Reporting issues

Please use the issue templates for bugs and feature requests.
