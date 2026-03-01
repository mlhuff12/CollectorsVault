## Test structure

- `ui/`: React UI tests (component/page behavior with mocked services)
- `unit/`: Pure unit tests for utilities and isolated logic
- `integration/`: Cross-module tests that still run locally in Jest

## Naming

- Use `*.test.ts` or `*.test.tsx`
- Place files in the folder that best matches scope (`ui`, `unit`, `integration`)

## Commands

- `npm run test:ui`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:all`
