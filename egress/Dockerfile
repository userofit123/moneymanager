FROM node:22-alpine
WORKDIR /app
COPY proxy.js package.json ./
USER node
EXPOSE 3128
CMD ["node", "proxy.js"]
