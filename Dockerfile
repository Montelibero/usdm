FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /usr/share/caddy

HEALTHCHECK --interval=60s --timeout=3s --start-period=10s --retries=3 \
	CMD wget -qO- http://127.0.0.1/healthz || exit 1
