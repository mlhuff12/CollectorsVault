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

> **Note:** The dev server starts on `https://localhost:3000` (HTTPS is enabled by default
> to allow the barcode/camera scanner to work on mobile devices).

Production build:

```bash
npm run build
```

## UI Tests

Run tests in watch mode:

```bash
npm test
```

Run tests once (CI-friendly):

```bash
npm run test:ci
```

### Mocking Strategy (No API Calls)

- UI tests mock `src/services/api.ts` with `jest.mock(...)`.
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

## API Dependency

The frontend expects the API at:

- `https://localhost:5001/api/vault`

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