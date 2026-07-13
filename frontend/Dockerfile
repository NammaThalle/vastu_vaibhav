# Dependencies, shared by the dev and build stages.
FROM node:22-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

# Local development server (docker-compose.yml).
FROM deps AS dev
COPY . .
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# Static export of the site.
FROM deps AS build
COPY . .
RUN npm run build

# Production: Caddy serving the static files only. Routing and HTTPS live in the
# central homelab Caddy, which sends /api/* to the api container.
FROM caddy:2.10-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
