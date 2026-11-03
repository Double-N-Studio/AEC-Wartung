# Baut das Backend-Image; GitHub Actions schiebt es nach ghcr.io/double-n-studio/aec-wartung-server.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
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
