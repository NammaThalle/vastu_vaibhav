
# Stage 1: Build Frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
RUN npx puppeteer browsers install chrome
COPY frontend/ .
# Build static assets to /app/frontend/dist
RUN npm run build

# Stage 2: Setup Backend & Final Image
FROM python:3.11-slim

WORKDIR /app

# Install Node.js and runtime libraries required by headless Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    nodejs \
    npm \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Install Backend Dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ .

# Copy Frontend Build from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/static
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/package-lock.json /app/frontend/package-lock.json
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/.cache/puppeteer /app/.cache/puppeteer

# Create data directory for SQLite
RUN mkdir -p /data

# Configuration
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite+aiosqlite:///../data/vastu.db
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Expose port
EXPOSE 8000

# Start Application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
