# Builds the backend image; GitHub Actions pushes it to ghcr.io/double-n-studio/aec-wartung-server.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: better-sqlite3 ships prebuilt binaries, npm would otherwise run node-gyp.
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
