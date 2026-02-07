
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build? Not for dev mode.
# exposes 3000
CMD ["npm", "run", "dev"]
