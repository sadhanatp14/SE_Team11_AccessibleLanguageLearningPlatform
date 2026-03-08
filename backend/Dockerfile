# Dockerfile for Railway when the service root directory is `backend/`
# Includes Python + gTTS for /api/tts/speak.

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Python requirements for TTS
COPY python_services/requirements.txt ./python_services/requirements.txt
RUN python3 -m pip install --no-cache-dir -r python_services/requirements.txt

# Copy the rest of the backend source
COPY . .

ENV NODE_ENV=production

# Railway provides PORT; server.js respects process.env.PORT.
CMD ["npm", "start"]
