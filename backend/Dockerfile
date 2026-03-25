
FROM python:3.11-slim

WORKDIR /app

# Install Node.js and Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Tell puppeteer to use the system-installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Install Node dependencies for the PDF renderer (must be after COPY to avoid .dockerignore clobbering node_modules)
RUN npm install --omit=dev


# Metadata
LABEL maintainer="Vastu Vaibhav Team"
