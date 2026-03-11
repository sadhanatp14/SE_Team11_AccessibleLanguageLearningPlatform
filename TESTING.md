# Testing

This project includes backend API tests, frontend UI tests, and end-to-end (E2E) browser tests.

## What testing exists

### Backend (Jest + Supertest)
- **Type:** Mostly integration-style API tests (HTTP request → Express route → Mongoose models), plus some model/middleware unit tests.
- **Where:**
  - `backend/routes/__tests__/` (API route tests)
  - `backend/models/__tests__/` (schema/model tests)
  - `backend/middleware/__tests__/` (auth middleware tests)
- **How it works:**
  - Uses `mongodb-memory-server` for an isolated in-memory MongoDB.
  - Shared setup is in `backend/__tests__/setup.js`.

### Frontend (Jest + React Testing Library)
- **Type:** Component tests and “integration-ish” UI tests (components rendered together with mocked services).
- **Where:**
  - `frontend/src/**/__tests__/**/*.test.js`
  - `frontend/src/components/**/__tests__/**/*.test.js`
- **How it works:**
  - Runs in JSDOM via CRA (`react-scripts test`).
  - Uses Testing Library + `user-event`.
  - Uses MSW in some tests for API mocking (see `frontend/src/mocks/`).
  - Global setup is in `frontend/src/setupTests.js`.

### End-to-End (Cypress)
- **Type:** Real-browser flows (navigate pages, fill forms, verify redirects, basic learning flows).
- **Where:** `frontend/cypress/e2e/`
- **Config:** `frontend/cypress.config.ts`

### Regression coverage
There is no separate “regression test runner”. Regression protection is provided by keeping Jest/Cypress tests for previously fixed/critical flows.

### Supplemental/course artifacts
There are additional test artifacts and course-oriented suites under:
- `tests/` (EPIC-style test packs)
- `testing/` (unit-test writeups and supporting files)

These are not guaranteed to be executed by the default npm scripts unless you explicitly wire them into your test commands.

## How to run tests

### From repo root
- Backend tests (default):
  - `npm test`
- Frontend production build:
  - `npm run build`

### Backend
```bash
cd backend
npm test
# coverage
npm run test:coverage
```

### Frontend
```bash
cd frontend
npm test
# production build
npm run build
```

### Cypress E2E
Start backend + frontend first, then run Cypress.

```bash
cd frontend
npx cypress open
# or headless
npx cypress run
```

## CI notes (GitHub Actions)
- Workflow: `.github/workflows/ci-cd.yml`
- CI runs backend tests and frontend build; frontend tests are invoked but configured as non-blocking in the workflow (they won’t fail the pipeline if they fail).
