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

Production build:

```bash
npm run build
```

## API Dependency

The frontend expects the API at:

- `http://localhost:5000/api/vault`

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