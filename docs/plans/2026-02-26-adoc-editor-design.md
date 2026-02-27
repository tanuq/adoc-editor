# AsciiDoc Editor Design

Date: 2026-02-26

## Overview

A Dockerized web application for editing and previewing AsciiDoc files in real time. Built on `asciidoctor/docker-asciidoctor` with a Node.js/Express backend and a CodeMirror 6 frontend.

## Architecture

Single Docker container based on `asciidoctor/docker-asciidoctor` with Node.js and Express added. Deployed via docker-compose with a host directory volume mount.

```
[Browser]
  └── HTML/JS (CodeMirror + split pane + sidebar)
        │  WebSocket (send adoc text / receive HTML preview)
        │  REST API (file CRUD, HTML/PDF export)
        ▼
[Docker container: asciidoctor/docker-asciidoctor base]
  ├── Node.js + Express
  │     ├── /api/files   — file CRUD
  │     ├── /api/export  — HTML / PDF export
  │     └── /ws/preview  — WebSocket real-time rendering
  └── /workspace/mounted (host volume)
```

## Frontend

**Layout:**
```
┌─────────────┬──────────────────────────────────────────┐
│  Sidebar    │  Toolbar                                 │
│             ├─────────────────┬────────────────────────┤
│  File tree  │  CodeMirror     │   HTML Preview         │
│  (adoc      │  (Vim mode)     │   (iframe)             │
│   files)    │                 │                        │
│             │                 │                        │
│  [+ New]    │                 │                        │
├─────────────┴─────────────────┴────────────────────────┤
│ Status: Saved docs/foo.html            [Vim | Ln 1:1]  │
└────────────────────────────────────────────────────────┘
```

**Libraries:**
- CodeMirror 6
- `@codemirror/vim` — Vim keybindings (default)
- Keybinding toggle: Vim / Normal (toolbar button)

**Toolbar:**
- Keybinding toggle (Vim / Normal)
- Save as HTML button
- Save as PDF button
- Current filename display

**Status bar (bottom):**
- Save/export result and errors
- Current keybinding mode
- Cursor position (line:col)

**Preview:**
- `<iframe>` with rendered HTML injected
- Asciidoctor default CSS applied

## Backend API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/files` | File tree listing |
| `GET` | `/api/files/*path` | Read file contents |
| `POST` | `/api/files/*path` | Save / create file |
| `DELETE` | `/api/files/*path` | Delete file |
| `POST` | `/api/export/html/*path` | Render and save `foo.html` alongside `foo.adoc` |
| `POST` | `/api/export/pdf/*path` | Render and save `foo.pdf` alongside `foo.adoc` |
| `WS` | `/ws/preview` | Receive adoc text, return rendered HTML |

**Real-time rendering:**
- Debounce 300ms on the client before sending via WebSocket
- Server calls `asciidoctor -o - -` (stdin → stdout) to render
- Rendered HTML is sent back over the same WebSocket connection

**Export:**
- HTML: `asciidoctor --data-uri -o <output-path> <input-path>` — images embedded as base64
- PDF: `asciidoctor-pdf -o <output-path> <input-path>`
- Output saved to the same directory as the source `.adoc` file
- Result (success or error) displayed in the status bar

## File System

All files live under `/workspace/mounted/`, which is bind-mounted from the host.

- Host files and newly created files are both stored here
- New files created in the browser are saved directly into this directory

## Docker

**Dockerfile:**
```dockerfile
FROM asciidoctor/docker-asciidoctor

RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
services:
  adoc-editor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./docs:/workspace/mounted
```
