import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import filesRouter from './src/routes/files.js'
import exportRouter from './src/routes/export.js'
import { handlePreview } from './src/ws/preview.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws/preview' })

const PORT = process.env.PORT || 3000
const WORKSPACE = process.env.WORKSPACE || './workspace'

app.use(express.json({ limit: '10mb' }))
app.use(express.static(join(__dirname, 'public')))
app.use('/api/files', filesRouter(WORKSPACE))
app.use('/api/export', exportRouter(WORKSPACE))

wss.on('connection', (ws) => handlePreview(ws))

server.on('error', (err) => { console.error('Server error:', err.message); process.exit(1) })

server.listen(PORT, () => {
  console.log(`adoc-editor listening on http://localhost:${PORT}`)
})

export { app, server }
