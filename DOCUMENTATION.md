# Project Documentation

This is the main technical reference for running and extending the platform: local development, environment variables, API endpoints, database/schema notes, coding standards, and troubleshooting.

---

## Table of contents

- [Quick start (local dev)](#quick-start-local-dev)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Database schema (MongoDB/Mongoose)](#database-schema-mongodbmongoose)
- [Coding standards](#coding-standards)
- [Troubleshooting](#troubleshooting)

---

## Quick start (local dev)

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Optional: Python 3 for best-quality TTS via `gTTS` (the backend can fall back to a Node-based Google TTS URL streamer in non-test environments)

### Install + run

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm start
```

### Ports

- Backend defaults to port **5002** (see `backend/server.js`). If the port is busy, it retries `PORT+1` up to `PORT_RETRIES` times.
- Frontend (CRA) defaults to port **3000**.
- Frontend dev proxy targets `http://localhost:5002` (see `frontend/package.json`).

### Useful scripts

Repo root:

- `npm run build` → builds frontend
- `npm test` → runs backend tests

Backend:

- `npm run dev` → nodemon
- `npm start` → production start
- `npm test` → Jest/Supertest backend suite

Frontend:

- `npm start` → dev server
- `npm test` → Jest/RTL frontend suite
- `npm run build` → production build

---

## Environment variables

Backend reads environment variables from `backend/.env` (loaded by `dotenv`).

### Required

- `MONGODB_URI` — Mongo connection string
- `JWT_SECRET` — used to sign JWTs
- `JWT_EXPIRE` — token expiry string (example: `7d`)

### Common / optional

- `PORT` — backend port (default: `5002`)
- `PORT_RETRIES` — number of incremental port retries if `PORT` is taken (default: `10`)
- `FRONTEND_URL` — allowed CORS origin in addition to localhost

### AI (Gemini)

- `GEMINI_API_KEY` — enables Gemini-backed responses. If missing/invalid, the API returns mock/fallback data.
- `GEMINI_MODEL` — optional override (default used in code: `gemini-2.5-flash`)

### TTS (Text-to-Speech)

- `PYTHON_EXECUTABLE` — optional explicit Python path for TTS (otherwise tries `./.venv/bin/python`, `python3`, then `python`)
- `TTS_DEBUG` — if truthy, increases debug detail in TTS health responses
- `TTS_DISABLE_GOOGLE_FALLBACK` — if truthy, disables Node-based Google TTS fallback (note: fallback is already disabled when `NODE_ENV=test`)

---

## API reference

### Base URLs

Local development:

- Backend: `http://localhost:5002`
- API namespace: `/api`

### Authentication

Most endpoints are protected and require a JWT:

- Header: `Authorization: Bearer <token>`

Protected routes use `protect` middleware in `backend/middleware/auth.js`.

### Common response conventions

- Success responses typically include `success: true`.
- Error responses typically include `success: false` and a `message`.
- Validation failures often include an `errors` array (from `express-validator`).

### Health

- `GET /health` — server status
- `GET /api/health` — API status

### Auth (`/api/auth`)

- `POST /register` — create account
  - Supports `authMethod: "password" | "pattern"` (default password)
  - Optional `role: "learner" | "parent"` (default learner)
- `POST /login` — login via password or pattern (must match the account’s `authMethod`)
- `GET /me` — current user (protected)
- `POST /logout` — no server-side JWT invalidation; returns a success response (protected)

WebAuthn (“fingerprint”) endpoints:

- `POST /fingerprint/register/options` (protected) — returns WebAuthn registration options
- `POST /fingerprint/register/verify` (protected) — verifies response and stores credential id
- `POST /fingerprint/login/options` — returns login options by email
- `POST /fingerprint/login/verify` — verifies response and issues JWT

Notes:

- WebAuthn is intentionally simplified (credential IDs are stored; attestation verification is not a full production-grade implementation).

### Preferences (`/api/preferences`) (protected)

- `GET /` — get current user preferences
- `PUT /` — replace/initialize preferences
- `PATCH /accessibility` — core accessibility settings (font size/family/contrast, etc.)
- `PATCH /dyslexia` — dyslexia-specific preferences
- `PATCH /adhd` — ADHD-specific preferences
- `PATCH /autism` — autism-specific preferences
- `DELETE /reset` — reset preferences to defaults
- `DELETE /language` — clears language selections

Language/i18n model:

- `Preferences.uiLanguage`: UI labels language (dashboards/settings)
- `Preferences.bilingualTextMode`: bilingual rendering on lesson/question surfaces only (`off | english_tamil | english_hindi`)

### Users (`/api/users`) (protected)

- `GET /profile` — current user profile
- `PUT /profile` — update profile fields
- `POST /complete-lesson` — mark a lesson as completed (supports DB ids or logical keys)
- `GET /completed-lessons` — list completed lesson keys

### Lessons (`/api/lessons`) (protected)

- `GET /search?query=...` — search lessons
- `GET /:id` — get lesson by Mongo id
- `GET /:lessonId/sections` — get ordered lesson sections for a lesson

Lesson content supports optional `*I18n` fields for bilingual text (English/Tamil/Hindi). See schema section.

### Interactions (`/api/interactions`) (protected)

- `POST /submit` — submit an answer/interaction result
- `POST /help` — request help (records interaction + may return hinting)

### Progress (`/api/progress`) (protected)

- `GET /next-lesson` — next lesson recommendation
- `GET /summary` — progress summary
- `GET /:lessonId` — progress for a specific lesson
- `POST /update` — update progress (section completion, interaction state)

### TTS (`/api/tts`)

- `GET /health` — probes whether Python + `gTTS` is available (optionally `?probeGoogle=1`)
- `POST /speak` — returns an `audio/mpeg` stream

TTS runtime behavior:

- Preferred: spawns Python and uses `backend/python_services/tts_gen.py` (requires Python + `gTTS`).
- Fallback (non-test environments): streams a Google Translate TTS URL via `google-tts-api`.

### AI (`/api/ai`)

These endpoints are designed to work with Gemini when configured, but return mock/fallback data if `GEMINI_API_KEY` is missing/invalid.

- `POST /generate-questions`
- `POST /story-quiz`
- `GET /adhd/recommendations/next`
- `GET /adhd/recommendations/learning-path`
- `GET /adhd/recommendations/motivation`
- `GET /autism/recommendations/next`
- `GET /autism/recommendations/learning-path`
- `GET /autism/recommendations/motivation`

### Dev-only (`/api/dev`) (non-production only)

Mounted only when `NODE_ENV !== 'production'`.

- `POST /create-test-lesson` — helper to seed a test lesson

---

## Database schema (MongoDB/Mongoose)

Models live in `backend/models/`.

### Relationships (high level)

- User (1) → Preferences (1)
  - `User.preferences` references `Preferences`
  - `Preferences.user` references `User` and is unique
- User (1) → UserProgress (many)
  - `UserProgress.userId` references `User`
- Lesson (1) → LessonSection (many)
  - `LessonSection.lessonId` references `Lesson`
- User (1) + Lesson (1) → UserInteraction (many)
  - `UserInteraction.userId` + `lessonId` + `interactionId` identifies an interaction record

### Common i18n subdocument

Many lesson fields support bilingual text via an optional `I18nString` subdocument:

```json
{
  "english": "...",
  "tamil": "...",
  "hindi": "..."
}
```

The base (non-i18n) string field remains the canonical default; i18n is an optional enhancement.

### User (`backend/models/User.js`)

Key fields:

- Identity: `name`, `email`
- Auth:
  - `authMethod`: `password | pattern`
  - `password` (bcrypt hash, `select:false`)
  - `patternHash` (bcrypt hash, `select:false`)
- Roles: `role`: `learner | parent`
- WebAuthn:
  - `fingerprintEnabled`: boolean
  - `webAuthnCredentials`: array of `{ credentialId, transports, createdAt }`
- Minor/parental control: `age`, `isMinor`, `parentEmail`, `requiresParentalApproval`
- Learning profile: `learningCondition`: `dyslexia | adhd | autism | none`
- Preferences link: `preferences` (ObjectId)
- Lightweight completion tracking:
  - `completedLessons`: string keys (ObjectId strings or logical keys)
  - `completedLessonsMeta`: `{ key, completedAt }`

Indexes:

- Unique index on `email`.

### Preferences (`backend/models/Preferences.js`)

Key fields:

- `user` (unique ref)
- Accessibility: `fontSize`, `fontFamily`, `contrastTheme`, `letterSpacing`, `wordSpacing`, `lineHeight`, `colorOverlay`
- ADHD: `learningPace`, `sessionDuration`, `breakReminders`, `distractionFreeMode`
- Autism: `reduceAnimations`, `simplifiedLayout`, `soundEffects`
- i18n:
  - `uiLanguage`: `english | tamil | hindi`
  - `bilingualTextMode`: `off | english_tamil | english_hindi`
  - (legacy) `preferredLanguage`: includes combined values like `english_tamil`

Indexes:

- Unique index on `user`.

### Lesson (`backend/models/Lesson.js`)

A full lesson stored in a single document (used by dyslexia-style flows).

- `title`, `textContent` plus optional `titleI18n`, `textContentI18n`
- `visuals`, `visualAids`, `highlights`
- `interactions[]` supports optional i18n for:
  - `questionI18n`, `optionsI18n[]`, `hintI18n`, `explanationI18n`, `feedbackI18n.correct/incorrect`

Indexes:

- Text index on `title` and `textContent`.

### LessonSection (`backend/models/LessonSection.js`)

Normalized section-by-section lesson model.

- `lessonId` (ref)
- `title`, `textContent` plus optional `titleI18n`, `textContentI18n`
- `visuals[]`, `visualAids[]`
- `interactions[]` supports the same i18n pattern as `Lesson`
- `order` determines section ordering

Indexes:

- Compound index on `lessonId + order`.

### UserProgress (`backend/models/UserProgress.js`)

Tracks per-user progress per lesson.

- `userId` (ref)
- `lessonId` (ref)
- `currentSectionId`, `completedSections[]`
- `interactionStates` (Mixed)
- `completed`, `completedAt`, `lastAccessedAt`

Indexes:

- Unique compound index on `userId + lessonId`.

### UserInteraction (`backend/models/UserInteraction.js`)

Stores interaction attempt history per lesson.

- `userId` (ref)
- `lessonId` (ref)
- `interactionId` (string)
- `attempts`, `lastAnswer`, `isCorrect`

Recommended indexes:

- Compound index on `userId + lessonId + interactionId`.

---

## Coding standards

### Languages and modules

- Backend: Node.js + CommonJS (`require`, `module.exports`)
- Frontend: React + ES modules (`import`, `export`)

### Formatting

Follow existing repo style:

- Indentation: 2 spaces
- Semicolons: used
- Quotes: single quotes in JavaScript where practical
- JSX: prefer readable multi-line props for complex components

Avoid large “format-only” diffs.

### Naming

- React components: `PascalCase.js`
- Backend controllers/services: `camelCase.js`
- Backend routes: lowercase filenames
- Variables/functions: `camelCase` with descriptive names

### API conventions

- Namespace: `/api/...`
- Use HTTP status codes consistently (`200/201/400/401/403/404/409/500`)
- Prefer consistent response envelopes (`{ success, message, ... }`)
- Validate inputs early (use `express-validator` where already established)

### Auth and authorization

- Use `protect` for JWT-protected routes.
- Use `authorize(...)` for role-based access where needed.
- Do not log sensitive data (passwords, JWTs, secrets).

### Frontend API access

- Prefer the shared Axios instance in `frontend/src/utils/api.js` for token/header consistency.
- Prefer central API wrappers under `frontend/src/services/` rather than ad-hoc calls.

### State management

- Auth: `frontend/src/context/AuthContext.js`
- Preferences: `frontend/src/context/PreferencesContext.js`
- For new cross-cutting state, prefer a context/provider to avoid prop drilling.

### Data modeling

- Keep Mongoose schemas explicit; use enums for constrained values.
- Add indexes for repeated query patterns.
- Prefer `lean()` for read-heavy list endpoints when document methods aren’t needed.

### Comments and traceability

This repo uses inline EPIC identifiers (example: `EPIC 6.4.1`). Keep them short and near relevant code.

---

## Troubleshooting

### Frontend loads but API calls fail (401/403)

- Ensure the frontend is using the correct token (check local storage/session per your auth flow).
- Verify requests include `Authorization: Bearer <token>`.
- Confirm backend `JWT_SECRET` matches the one used to mint the token.

### CORS errors in browser

- Backend allows origins: `http://localhost:3000`, `http://localhost:5002`, plus `FRONTEND_URL`.
- If your frontend is running on a different origin, set `FRONTEND_URL` accordingly.

### Backend can’t connect to MongoDB

- Verify `MONGODB_URI` is set and reachable.
- If using local Mongo, ensure the daemon is running.
- If using Atlas, ensure your IP is allowlisted.

### Port already in use

- Backend auto-retries ports. Check logs for the selected port.
- If you rely on the frontend proxy, keep backend on `5002` or update the proxy in `frontend/package.json`.

### TTS returns 500 / unavailable

- Call `GET /api/tts/health` to see whether Python + `gTTS` is available.
- If Python is installed but `gTTS` is missing:
  - Create a venv at repo root: `python3 -m venv .venv`
  - Install deps: `pip install -r backend/python_services/requirements.txt`
- If running in production without Python:
  - The backend may use a Node fallback unless `TTS_DISABLE_GOOGLE_FALLBACK` is set.

### AI endpoints return mock responses

- Set `GEMINI_API_KEY` and restart backend.
- If you set `GEMINI_MODEL`, ensure your key has access to that model.

### Tests fail due to environment variables

- Backend tests may assume `NODE_ENV=test` and will disable some fallbacks (example: Google TTS fallback).
- Use a dedicated `.env.test` setup if you want separate secrets for CI.
