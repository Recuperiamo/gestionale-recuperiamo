FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm i --only=production
COPY server.js ./
ENV PORT=4001
EXPOSE 4001
CMD ["node", "server.js"]
