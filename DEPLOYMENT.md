# Deployment

This document describes common ways to deploy the frontend and backend from this repository.

## Deployment overview

You will typically deploy as two services:

1. Frontend: static React build output
2. Backend: Node.js Express API

MongoDB is external (Atlas is recommended for hosted deployments).

## Environment variables

### Backend (`backend/.env`)

Required:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRE`: token expiry (example: `7d`)

Recommended:

- `NODE_ENV`: `production` in production
- `PORT`: the port your host expects

Optional:

- `GEMINI_API_KEY`: enables real AI responses for `/api/ai/*`
- `GEMINI_MODEL`: overrides the Gemini model name used by the backend
- `PYTHON_EXECUTABLE`: path to the Python interpreter for `/api/tts/speak`
- `HINT_TRIGGER_ATTEMPTS`: attempts before hint is returned in interactions

### Frontend

- In development, CRA uses `frontend/package.json` proxy to forward `/api` to the backend.
- In production (static hosting), configure the backend base URL:
  - `REACT_APP_API_URL=https://your-backend-host/api`

## Build and run

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

The static build output is in `frontend/build/`.

## Hosting patterns

### Pattern A: Static frontend + separate backend

- Deploy `frontend/build/` to a static host (Netlify, Vercel, S3, GitHub Pages, etc.).
- Deploy the backend as a Node service (Render, Railway, Fly.io, AWS, etc.).
- Set `REACT_APP_API_URL` for the frontend build so API calls go to the backend.

### Pattern B: Single host

This repo does not currently serve the frontend build from the backend.

If you want a single host, you can add an Express static handler to serve the React build and route all unknown paths to `index.html`. If you choose this path, ensure your API routes remain under `/api`.

## MongoDB

- For production, use MongoDB Atlas.
- Ensure the network allowlist includes your backend host.

## TTS deployment notes

The endpoint `POST /api/tts/speak` spawns a Python process.

To enable it in production:

- Provide a Python runtime on the server.
- Install Python requirements from `backend/python_services/requirements.txt`.
- Set `PYTHON_EXECUTABLE` if the default `python3` is not correct.

If you do not want server-side TTS in production, the frontend can still use the browser speech synthesis fallback, but user experience may differ across devices.

### Railway notes (backend)

Railway’s current default builder is **Railpack** (Nixpacks is deprecated). Railpack builds Node apps fine, but it will not automatically include a Python runtime in the container.

If `GET /api/tts/health` returns an error like `No working python executable found`, it means the deployed runtime image does not have `python3`/`python` available.

To enable the Python-based TTS path in production on Railway, use the **Dockerfile builder** for the backend service.

- If your Railway service **Root Directory** is `backend/`, use `backend/Dockerfile`.
- If your Railway service builds from the repo root, use the root `Dockerfile`.

After deploy, you can verify TTS dependencies with:

- `GET /api/tts/health` (returns Python + gTTS versions when available)

Optional debugging:

- Set `TTS_DEBUG=true` on the backend to include Python stderr details in `500` responses from `/api/tts/speak`.

Frontend base URL reminder:

- Set `REACT_APP_API_URL` to `https://<your-railway-domain>/api` (include `/api` exactly once).
- The frontend then calls `POST /tts/speak` under that base URL, resulting in `https://<domain>/api/tts/speak`.

## CORS

The backend currently uses `cors()` without restrictions.

For production, restrict allowed origins to your frontend domain.

## Verification checklist

- Backend health endpoints respond (`/health`, `/api/health`).
- Frontend can login and fetch `/api/auth/me`.
- Preferences load and apply after login.
- Lessons and sections load.
- Progress endpoints update and summary loads.
- If enabled, TTS endpoint streams audio and AI endpoints return questions.
