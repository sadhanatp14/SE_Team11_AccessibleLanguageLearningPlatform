# Accessible Language Learning Platform

## Project Title & Tagline

**Accessible Language Learning Platform** — an accessible MERN language-learning platform designed to support learners with **dyslexia, ADHD, and autism**.

## Project Description

This system provides **condition-aware lesson delivery**, **interaction practice**, and **progress tracking**, with built-in accessibility preferences and audio support.

## Problem Statement

Many language-learning tools are not designed for neurodiverse learners and can be hard to follow due to dense layouts, fast pacing, limited personalization, and a lack of consistent audio support. This project addresses that gap by offering a learning experience that adapts to learners’ needs and preferences (reading support, structured interactions, and repeatable audio narration).

## Target Users

- Learners with **dyslexia** who benefit from readable typography, spacing, and audio narration.
- Learners with **ADHD** who benefit from reduced distractions, clear pacing, and focused flows.
- Learners with **autism** who benefit from simplified layouts, predictable structure, and repeatable audio.
- Educators/parents supporting the above learners.

## Features Overview

Key capabilities in this repository:

- Condition-specific learning experiences (Dyslexia / ADHD / Autism) in the React UI.
- JWT-based authentication and protected APIs.
- User accessibility preferences persisted in MongoDB and applied on the frontend.
- Lesson content with sections and interactive questions.
- Progress persistence (resume where you left off) + progress summary.
- Audio support via:
    - File audio URLs when available
    - Backend Text-to-Speech endpoint (`/api/tts/speak`) with browser fallback
- Optional Gemini-powered quiz generation endpoints with safe fallbacks.

## Tech Stack

- **Frontend:** React (CRA), React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Testing:** Jest, React Testing Library, Supertest
- **Audio/TTS:** HTML5 Audio + backend Python TTS helper (optional)

## Project Structure

High-level repository layout:

```text
.
├─ backend/        # Express API (auth, lessons, interactions, progress, TTS)
├─ frontend/       # React app (condition-specific lesson views, accessibility UI)
├─ testing/        # Course/testing write-ups (if applicable)
├─ tests/          # Additional test documentation/artifacts
└─ *.md            # Project documentation (architecture, API, schema, etc.)
```

Developer docs (architecture, API, schema, standards, deployment, troubleshooting):

- ARCHITECTURE.md
- API.md
- DATABASE_SCHEMA.md
- CODING_STANDARDS.md
- DEPLOYMENT.md
- TROUBLESHOOTING.md

UML diagrams are available here (UseCase, Sequence, Architecture, ER, Activity, Class):

- https://drive.google.com/file/d/16MWa5Hmh47SqRw3UTENSl-YG6ca0v_T-/view?usp=drive_link

## Setup guide (run locally)

### Prerequisites

- Node.js (recommended: 18+)
- npm
- MongoDB (local) or MongoDB Atlas connection string
- (Optional) Python 3 for the TTS endpoint

Create a `backend/.env` based on `backend/.env.example`.

Minimal working example:

```dotenv
# IMPORTANT: the frontend dev proxy is configured for 5002.
# Either set PORT=5002 (recommended) or change the proxy in frontend/package.json.
#make the .env.example as your .env file.
PORT=5002
MONGODB_URI=MONGO_URL
JWT_SECRET=replace_me_with_a_long_random_secret
JWT_EXPIRE=7d
NODE_ENV=****
# Optional: Gemini AI endpoints (/api/ai/*)
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
# Optional: use a specific Python interpreter for TTS (/api/tts/speak)
# PYTHON_EXECUTABLE=../.venv/bin/python
```
### JWT SECRET KEY
```bash
To get a randome JWT SECRET KEY in the env
use command in the terminal:- openssl rand -hex 64
```

### Backend setup

```bash
cd backend
npm install
npm run dev
```

Backend defaults:
- API base: `http://localhost:5002/api`
- Health: `http://localhost:5002/health`

### Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend defaults:
- App: `http://localhost:3000`
- Dev proxy: `frontend/package.json` proxies `/api` to `http://localhost:5002`

If you deploy the frontend separately (no proxy), set `REACT_APP_API_URL` to your backend base URL (example: `https://your-backend/api`).

### Optional: enable Python TTS (gTTS)

The backend endpoint `POST /api/tts/speak` spawns `backend/python_services/tts_gen.py`.

If you see `ModuleNotFoundError: No module named 'gtts'`:

```bash
python3 -m pip install -r backend/python_services/requirements.txt
```

### Build

```bash
cd frontend
npm run build
```
