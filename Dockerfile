FROM asciidoctor/docker-asciidoctor

# Node.js + Chromium (required for mermaid-cli / Puppeteer)
RUN apk add --no-cache nodejs npm chromium

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Puppeteer config: disable sandbox (required in containers)
RUN echo '{"args":["--no-sandbox","--disable-setuid-sandbox"]}' > /etc/puppeteer-config.json

# Install mermaid-cli globally and wrap it to always pass the puppeteer config
RUN npm install -g @mermaid-js/mermaid-cli && \
    mv /usr/local/bin/mmdc /usr/local/bin/mmdc.real && \
    printf '#!/bin/sh\nexec /usr/local/bin/mmdc.real --puppeteerConfigFile /etc/puppeteer-config.json "$@"\n' \
      > /usr/local/bin/mmdc && \
    chmod +x /usr/local/bin/mmdc

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

EXPOSE 3000
CMD ["node", "server.js"]
