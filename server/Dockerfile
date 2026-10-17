# Step 1: build the new Vue app (frontend/) with Vite into web/app
FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN mkdir -p /src/web && npm run build

# Step 2: the app itself: server + the old page (web/) + the finished new app (web/app)
FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY web/ /app/web/
COPY --from=frontend /src/web/app /app/web/app
COPY CHANGELOG.md /app/CHANGELOG.md
ENV WEB_DIR=/app/web NODE_ENV=production PORT=8080
RUN mkdir -p /data/documents && chown -R node:node /data
VOLUME /data
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
