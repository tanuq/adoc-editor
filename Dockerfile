FROM asciidoctor/docker-asciidoctor

RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

EXPOSE 3000
CMD ["node", "server.js"]
