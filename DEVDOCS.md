# DevDocs (Deployment + DevOps)

This document consolidates and updates the repository’s deployment and DevOps guidance.

If you’re looking for API endpoints, database schema, coding standards, and troubleshooting, see `DOCUMENTATION.md`.

---

## Contents

- Quick facts
- CI (GitHub Actions)
- Deployment (recommended: Vercel + Railway)
- Deployment options (Docker / alternative builds)
- Runtime configuration (env vars)
- Operational checks

---

## Quick facts

- Frontend: React (CRA) in `frontend/`
- Backend: Node.js/Express in `backend/`
- Database: MongoDB (Atlas recommended for hosted environments)
- Auth: JWT (Bearer) with password/pattern login and optional WebAuthn ("fingerprint") endpoints
- Accessibility + language:
  - UI language in preferences (`uiLanguage`: english/tamil/hindi)
  - Bilingual lesson text mode (`bilingualTextMode`: off/english_tamil/english_hindi)
- TTS:
  - Preferred: Python + `gTTS` via `backend/python_services/tts_gen.py`
  - Fallback: Node streams Google Translate TTS URL (disabled in tests)

---

## CI (GitHub Actions)

Workflow: `.github/workflows/ci-cd.yml`

What it actually does today:

- Backend job: install → optional lint → tests (coverage uploaded to Codecov if configured)
- Frontend job: install → optional lint → tests (non-blocking) → build (artifacts uploaded)
- Security job: `npm audit` (advisory / non-blocking)

Notes:

- Despite the name “CI/CD Pipeline”, the workflow currently implements CI (tests/build/audit) and does not deploy to production automatically.
- If you want CD, add a deployment job (e.g., Railway/Vercel deploy) behind branch/tag conditions + secrets.

---

## Deployment (recommended: Vercel + Railway)

This repo is easiest to deploy as two services:

1) Frontend (static React build)
2) Backend (Node service)

MongoDB runs separately (Atlas).

### 1) Deploy backend on Railway

You can deploy the backend from either repo root or `backend/` depending on which build strategy you choose.

#### Option A (recommended when you want Python TTS available): Dockerfile builder

This repo contains two Dockerfiles:

- `Dockerfile` (repo root): expects build context at repo root; runs backend from `/app/backend`
- `backend/Dockerfile`: expects build context at `backend/`

Both install Python and `gTTS` and set `PYTHON_EXECUTABLE` to a venv interpreter.

Railway setup:

- Create a new Railway service from GitHub
- Choose **Dockerfile** builder
- Select the appropriate Dockerfile based on your service root directory
- Set backend environment variables (see “Runtime configuration” below)

#### Option B (Node-only runtime; rely on TTS fallback)

If you do not need Python-based TTS in production, you can deploy the backend as a standard Node service.

- `POST /api/tts/speak` can still work via the Node fallback in non-test environments
- `GET /api/tts/health` will report Python unavailable if Python isn’t present

#### Option C (Nixpacks)

The repo includes `nixpacks.toml` (root) which installs Node + Python and Python requirements.

If your host supports Nixpacks-style builds, this can enable Python TTS without Docker.

### 2) Deploy frontend on Vercel

This repo includes `vercel.json` which builds the React app from the monorepo.

Required frontend env var:

- `REACT_APP_API_URL` = `https://<your-backend-host>/api`

Important:

- Include `/api` exactly once. The frontend will call routes like `/api/auth/login` under this base URL.

---

## Runtime configuration (env vars)

Backend (`backend/.env` locally; host-provided in production):

Required:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE` (example: `7d`)

Recommended:

- `NODE_ENV=production`
- `PORT` (Railway/hosts usually inject this)
- `FRONTEND_URL` (used by CORS allowlist in `backend/server.js`)

Optional:
- `GEMINI_API_KEY` / `GEMINI_MODEL`
- `PYTHON_EXECUTABLE` (if you want to force a specific Python)
- `TTS_DEBUG=true` (more verbose TTS health/errors)
- `TTS_DISABLE_GOOGLE_FALLBACK=true` (disable Node fallback)
- `HINT_TRIGGER_ATTEMPTS` (attempt threshold for returning hints; default 2)

Frontend:

- `REACT_APP_API_URL` (production only; dev uses CRA proxy)

---

## Operational checks

After deployment, verify:

- Backend health:
  - `GET /health`
  - `GET /api/health`
- Auth:
  - `POST /api/auth/login`
  - `GET /api/auth/me` (with token)
- TTS:
  - `GET /api/tts/health`
  - `POST /api/tts/speak` returns `audio/mpeg`
- Frontend:
  - Registration + login works
  - Lessons load, interactions submit, progress updates

---

## Notes on CORS

CORS is configured in `backend/server.js` with an allowlist including:

- `http://localhost:3000`
- `http://localhost:5002`
- `FRONTEND_URL` (if set)

If your deployed frontend origin differs, set `FRONTEND_URL` to the deployed frontend URL.
