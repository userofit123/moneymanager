# Step 1: build the app (frontend/) with Vite into frontend/dist. The built files are the same for every machine type,
# so this step runs once on the build machine's own type instead of under emulation for each (much faster, and npm
# under emulation can hang).
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Step 2: the server, with the built app next to it in /app/web
FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=frontend /src/frontend/dist /app/web
COPY CHANGELOG.md CHANGELOG.he.md /app/
ENV WEB_DIR=/app/web NODE_ENV=production PORT=8080
RUN mkdir -p /data/documents && chown -R node:node /data
VOLUME /data
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
