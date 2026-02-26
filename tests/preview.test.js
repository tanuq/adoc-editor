import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { handlePreview } from '../src/ws/preview.js'

let server, wss, port

beforeEach(async () => {
  server = createServer()
  wss = new WebSocketServer({ server, path: '/ws/preview' })
  wss.on('connection', (ws) => handlePreview(ws))
  await new Promise((res) => server.listen(0, res))
  port = server.address().port
})

afterEach(async () => {
  await new Promise((res) => wss.close(res))
  await new Promise((res) => server.close(res))
})

test('renders adoc text and returns HTML', (done) => {
  const ws = new WebSocket(`ws://localhost:${port}/ws/preview`)
  ws.on('open', () => ws.send('= Hello World'))
  ws.on('message', (data) => {
    const html = data.toString()
    expect(html).toContain('<h1')
    expect(html).toContain('Hello World')
    ws.close()
    done()
  })
}, 15000) // asciidoctor CLI may be slow

test('handlePreview sends error for oversized input', (done) => {
  const ws = new WebSocket(`ws://localhost:${port}/ws/preview`)
  const bigText = 'x'.repeat(11 * 1024 * 1024) // 11 MB
  ws.on('open', () => ws.send(bigText))
  ws.on('message', (data) => {
    expect(data.toString()).toContain('Error: input too large')
    ws.close()
    done()
  })
}, 5000)
