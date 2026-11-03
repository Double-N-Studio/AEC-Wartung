# Builds the app image (backend + frontend); GitHub Actions pushes it to ghcr.io/double-n-studio/aec-wartung-server.
# Build context is the repo root: docker build -f backend/Dockerfile .

# Frontend against the backend on the same origin. .env (demo date) is not copied, so the real date applies.
FROM node:24-slim AS web
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.ts frontend/tsconfig.json ./
COPY frontend/public ./public
COPY frontend/src ./src
ENV VITE_API_URL=/api
RUN npm run build

FROM node:24-slim AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
# --ignore-scripts: better-sqlite3 ships prebuilt binaries, npm would otherwise run node-gyp.
RUN npm ci --ignore-scripts
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production DATA_DIR=/data PORT=3000 WEB_DIR=/app/web
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=web /app/dist ./web
COPY backend/drizzle ./drizzle
COPY backend/package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
