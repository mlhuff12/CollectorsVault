# Collectors Vault Client

React + TypeScript frontend for Collectors Vault.

## Features

- Navigation routes:
  - `/` (Home)
  - `/books`
  - `/movies`
  - `/games`
- Home page includes a type dropdown to switch between add forms (Book/Movie/Game).
- Category pages show filtered items only.
- Delete action available for items in all tabs.
- Uses Font Awesome trash icon for delete button.

## Run Locally

```bash
npm install
npm start
```

> **Note:** The dev server starts on `https://localhost:3000`.
> Camera/barcode access on mobile browsers usually requires HTTPS or localhost.

Production build:

```bash
npm run build
```

Alternate Vite commands:

```bash
npm run dev:vite
npm run build:vite
```

Environment variable for API URL:

- Primary (Vite): `VITE_API_BASE_URL`
- Backward-compatible (CRA): `REACT_APP_API_BASE_URL`

## UI Tests

Run tests in watch mode:

```bash
npm test
```

Run tests once (CI-friendly):

```bash
npm run test:ci
```

Run Vite-phase CI validation (Vite build + Vitest tests):

```bash
npm run verify:vite
```

### Mocking Strategy (No API Calls)

- UI tests mock `src/services/api.ts` with `vi.mock(...)`.
- Tests validate component behavior against mocked responses.
- The real backend is **not required** and is never called during these tests.

Current test coverage lives in:

- `src/pages/VaultPage.test.tsx`
- `src/setupTests.ts`

## Debug in VS Code

From **Run and Debug**, use:

- `Client: Start Dev Server` to run the React app
- `Client: Debug in Chrome` to debug the app in browser (opens `https://localhost:3000`)

For full-stack debugging, run `Full Stack: API + Client` from the workspace root launch profiles.

## Camera and HTTPS

- Desktop localhost testing works for camera in most browsers.
- For phone testing on LAN, the Vite dev server automatically reuses `server/.certs/lan-api-cert.pem` and `server/.certs/lan-api-key.pem` when present.
- If those files are missing, Vite falls back to a self-signed dev cert (`basic-ssl`), which may show as insecure in browsers.

## API Dependency

The frontend expects the API at:

- `https://localhost:5000/api/vault`

Make sure the server is running before using the app.

## Key Files

- `src/App.tsx` — route mapping
- `src/pages/VaultPage.tsx` — top-level page logic
- `src/components/BookForm.tsx`
- `src/components/MovieForm.tsx`
- `src/components/GameForm.tsx`
- `src/components/ItemList.tsx`
- `src/services/api.ts`
- `src/styles.css`

## Coding Standards

- **`if` / `else if` / `else` statements must always use curly braces** even for single-line bodies.

  ✅ Correct:
  ```ts
  if (result === null) {
      return;
  }
  ```

  ❌ Incorrect:
  ```ts
  if (result === null)
      return;
  ```