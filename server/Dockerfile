FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY web/ /app/web/
ENV WEB_DIR=/app/web NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
