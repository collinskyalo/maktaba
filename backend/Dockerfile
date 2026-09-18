# Maktaba — backend/Dockerfile
# Multi-stage build: install dependencies in a full node image, then run
# on the same base (no native modules here needing a separate build stage,
# but kept multi-stage so it's a one-line change if that becomes true).

FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Runs as a non-root user inside the container.
RUN addgroup -S maktaba && adduser -S maktaba -G maktaba
USER maktaba

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
