import { spawn } from 'child_process'

const RENDER_TIMEOUT_MS = 10000
const MAX_TEXT_BYTES = 10 * 1024 * 1024 // 10 MB

export function handlePreview(ws) {
  ws.on('error', () => {}) // prevent crash on send to closed socket

  ws.on('message', (data) => {
    if (data.length > MAX_TEXT_BYTES) {
      if (ws.readyState === ws.OPEN) ws.send('<pre>Error: input too large</pre>')
      return
    }
    const adocText = data.toString()
    renderAdoc(adocText)
      .then((html) => { if (ws.readyState === ws.OPEN) ws.send(html) })
      .catch((err) => { if (ws.readyState === ws.OPEN) ws.send(`<pre>Error: ${escapeHtml(err.message)}</pre>`) })
  })
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderAdoc(text) {
  return new Promise((resolve, reject) => {
    const proc = spawn('asciidoctor', ['-o', '-', '-'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const chunks = []
    const errChunks = []

    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('Render timed out'))
    }, RENDER_TIMEOUT_MS)

    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    proc.stdout.on('data', (d) => chunks.push(d))
    proc.stderr.on('data', (d) => errChunks.push(d))

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString())
      } else {
        reject(new Error(Buffer.concat(errChunks).toString() || `Exit code ${code}`))
      }
    })

    proc.stdin.end(text)  // write + close in one call (handles backpressure correctly)
  })
}
