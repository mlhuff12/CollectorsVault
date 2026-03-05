# Client Migration Plan: CRA to Vite

## Goal

Migrate `client/` from Create React App (`react-scripts`) to Vite with minimal downtime, while preserving current behavior and test coverage.

## Why migrate

- Faster startup and rebuilds in local development.
- Better long-term ecosystem support than CRA.
- Easier control of modern bundling, env handling, and build output.
- Cleaner path to React 18+ and modern testing toolchains.

## Current state (March 2026)

- React 18 + TypeScript.
- Vite is the default dev/build toolchain.
- React Router v5.
- Vitest + React Testing Library tests in `src/tests/`.

## Migration strategy

Use a phased approach to reduce risk.

### Phase 0: Baseline and branch safety

1. Create a dedicated branch: `chore/client-vite-migration`.
2. Record baseline metrics and behavior:
   - `npm run build`
   - `npm run test:ci`
   - Load major routes manually (`/login`, `/signup`, `/vault`).
3. Freeze feature work touching client build config during migration window.

### Phase 1: React 18 compatibility prep (still on CRA)

1. Upgrade React runtime and types:
   - `react`, `react-dom`, `@types/react`, `@types/react-dom`.
2. Update `src/index.tsx` (and `src/main.tsx` if used) from `ReactDOM.render` to `createRoot`.
3. Upgrade testing libraries to React 18-compatible versions.
4. Re-run `npm run test:ci` and fix `act(...)` warnings where practical.

Exit criteria:

- Build passes on CRA.
- Test suite passes on CRA.
- No runtime regression in auth flow and item CRUD flows.

### Phase 2: Introduce Vite scaffold

1. Add Vite dependencies:
   - `vite`
   - `@vitejs/plugin-react`
2. Add Vite files:
   - `client/vite.config.ts`
   - `client/index.html` (Vite entry)
3. Keep existing source tree (`src/`) unchanged where possible.
4. Add scripts:
   - `dev:vite`, `build:vite`, `preview:vite`

Exit criteria:

- `npm run dev:vite` starts and renders app.
- `npm run build:vite` produces production output.

### Phase 3: Env and asset migration

1. Convert CRA env usage (`process.env.REACT_APP_*`) to Vite style (`import.meta.env.VITE_*`).
2. Rename env keys:
   - `REACT_APP_API_BASE_URL` -> `VITE_API_BASE_URL` (example)
3. Validate static assets and CSS imports from `public/` and `src/`.
4. Ensure API base URL works in local/dev/prod contexts.

Exit criteria:

- All env-dependent flows work under Vite.
- No missing asset path issues in dev or build.

### Phase 4: Testing and lint alignment

1. Migrate tests from CRA/Jest runner to Vitest.
2. Keep test coverage and mocking behavior equivalent after migration.
3. Update CI commands to run Vite build + Vitest pipeline.

Exit criteria:

- CI green with Vite build.
- Existing test suite still green.

### Phase 5: Cutover and cleanup

1. Switch default scripts:
   - `start` -> Vite dev server
   - `build` -> Vite build
2. Remove CRA-only dependencies and config:
   - `react-scripts`
   - obsolete CRA workarounds in scripts
3. Update README and onboarding docs.

Exit criteria:

- Team uses Vite as default local workflow.
- CRA dependency removed.

## Risks and mitigations

- Risk: peer dependency conflicts during React 18 move.
  - Mitigation: complete Phase 1 and stabilize before introducing Vite.

- Risk: subtle env variable regressions.
  - Mitigation: explicit env key mapping table and route smoke tests.

- Risk: test instability from tooling shifts.
   - Mitigation: keep broad regression coverage and run full suite in CI (`npm run verify:vite`).

## Suggested implementation order

1. Phase 1 in a dedicated PR.
2. Phase 2 + Phase 3 in a second PR.
3. Phase 5 cleanup in a final PR after a short bake period.

## Progress status

- Phase 1: completed.
- Phase 2: completed.
- Phase 3: completed.
- Phase 4: completed.
- Phase 5: completed.
