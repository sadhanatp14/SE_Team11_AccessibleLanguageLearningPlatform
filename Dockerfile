# Railway Dockerfile to run the backend with Python available for /api/tts/speak
# Build context should be the repository root.

FROM node:20-bookworm-slim

# Python is required for the gTTS-based TTS path.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create a dedicated virtualenv for Python deps (PEP-668 safe)
ENV VENV_PATH=/opt/venv
RUN python3 -m venv $VENV_PATH \
  && $VENV_PATH/bin/python -m pip install --no-cache-dir --upgrade pip

WORKDIR /app

# Copy minimal manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY backend/python_services/requirements.txt ./backend/python_services/requirements.txt

# Install backend Node dependencies (the backend depends on the root package via file:..).
RUN cd backend && npm ci --omit=dev

# Install Python deps for the TTS python script.
RUN $VENV_PATH/bin/python -m pip install --no-cache-dir -r backend/python_services/requirements.txt

# Copy backend source.
COPY backend ./backend

ENV NODE_ENV=production
ENV PYTHON_EXECUTABLE=$VENV_PATH/bin/python
WORKDIR /app/backend

# Railway provides PORT; server.js respects process.env.PORT.
CMD ["npm", "start"]
