FROM asciidoctor/docker-asciidoctor

RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install --save-dev esbuild codemirror @replit/codemirror-vim @codemirror/legacy-modes @codemirror/language @codemirror/view @codemirror/state
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "server.js"]
