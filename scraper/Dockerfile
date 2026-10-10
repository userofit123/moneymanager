FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
RUN mkdir -p /debug && chown node:node /debug
VOLUME /debug
USER node
CMD ["node", "server.js"]
