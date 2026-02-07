
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
# Build static assets to /app/frontend/dist
RUN npm run build

# Stage 2: Setup Backend & Final Image
FROM python:3.11-slim

WORKDIR /app

# Install Backend Dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ .

# Copy Frontend Build from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create data directory for SQLite
RUN mkdir -p /data

# Configuration
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite+aiosqlite:///../data/vastu.db

# Expose port
EXPOSE 8000

# Start Application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
