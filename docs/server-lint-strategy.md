# Server Lint Strategy

## Decision

Use **`dotnet format --verify-no-changes`** as the primary server-side lint/static-analysis
strategy for the ASP.NET Core project.

## Canonical Commands

### Check for violations (local and CI)

From the repository root:

```bash
dotnet format CollectorsVault.sln --verify-no-changes
```

Exits with a non-zero code if any C# file does not match the style rules in `.editorconfig`.
Use this command locally before opening a PR and in CI to gate merges.

### Auto-fix violations

From the repository root:

```bash
dotnet format CollectorsVault.sln
```

Run this to automatically apply all formatting corrections before committing.

## Rationale

### Options evaluated

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| `dotnet format --verify-no-changes` | Ships with .NET SDK, zero extra packages, fast, deterministic | Style only, not semantic | **Selected — primary strategy** |
| .NET analyzer warnings/errors in build | Catches real bugs, no extra tooling | Verbose output, many false positives in a small project | Deferred — revisit as project grows |
| Additional Roslyn analyzers (e.g. StyleCop) | Deep style enforcement | Extra package dependency, configuration overhead | Not selected |
| Combination (format + analyzers) | Maximum coverage | Higher CI cost, noisier for contributors | Deferred |

### Why `dotnet format` first

- **No additional packages required.** `dotnet format` is included in the .NET 8 SDK used
  by the project, so every contributor and every CI runner has the tool already.
- **Deterministic and fast.** On a small-to-medium project the format check completes in
  seconds and always produces the same result given the same source and `.editorconfig`.
- **Integrated with `.editorconfig`.** The repository root `.editorconfig` defines the
  canonical style rules (indentation, brace placement, using-directive ordering, final
  newlines, etc.).  Both `dotnet format` and compatible editors (VS, VS Code with C#
  extension, Rider) read the same file, so the local editor and CI agree.
- **Auto-fix available.** Contributors can run `dotnet format CollectorsVault.sln` to
  correct all violations in one step instead of fixing them by hand.

### Future evolution

If the project grows and style-only checks become insufficient, a combination strategy
can be added by enabling analyzer packages in `CollectorsVault.Api.csproj` and setting
severity levels in `.editorconfig`.  The lint CI job structure introduced with this
decision already supports that expansion without workflow changes.

## Expected Failure Behavior

When `dotnet format --verify-no-changes` finds violations it prints one line per offending
file and exits with code 1. Example:

```
server/Models/Book.cs(29,2): error FINALNEWLINE: Fix final newline. Insert '\n'.
server/Program.cs(1,1): error IMPORTS: Fix imports ordering.
```

In CI this causes the `server-lint` job to fail and blocks the PR from merging.
Run `dotnet format CollectorsVault.sln` locally to auto-correct and re-verify.

## CI Implementation

The `server-lint` job in `.github/workflows/api-ci.yml` runs the canonical command on
every pull request and push to `main` that touches server-side files.

## Related

- `.editorconfig` — formatting rules consumed by `dotnet format`
- `.github/workflows/api-ci.yml` — CI workflow containing the `server-lint` gate job
- `CONTRIBUTING.md` — contributor-facing lint instructions
