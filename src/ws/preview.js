import { spawn } from 'child_process'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const RENDER_TIMEOUT_MS = 10000
const MAX_TEXT_BYTES = 10 * 1024 * 1024 // 10 MB

export async function handlePreview(ws) {
  ws.on('error', () => {}) // prevent crash on send to closed socket

  // Create temp dir once per connection, reuse for all renders
  const dir = await mkdtemp(join(tmpdir(), 'adoc-preview-'))
  const srcFile = join(dir, 'input.adoc')
  const outFile = join(dir, 'input.html')

  ws.on('close', () => {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  })

  ws.on('message', (data) => {
    if (data.length > MAX_TEXT_BYTES) {
      if (ws.readyState === ws.OPEN) ws.send('<pre>Error: input too large</pre>')
      return
    }
    const adocText = data.toString()
    renderAdoc(adocText, srcFile, outFile)
      .then((html) => { if (ws.readyState === ws.OPEN) ws.send(html) })
      .catch((err) => { if (ws.readyState === ws.OPEN) ws.send(`<pre>Error: ${escapeHtml(err.message)}</pre>`) })
  })
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function renderAdoc(text, srcFile, outFile) {
  // When called from tests, create a temp dir if paths not provided
  let tmpDir = null
  if (!srcFile || !outFile) {
    tmpDir = await mkdtemp(join(tmpdir(), 'adoc-preview-'))
    srcFile = join(tmpDir, 'input.adoc')
    outFile = join(tmpDir, 'input.html')
  }

  try {
    await writeFile(srcFile, text, 'utf8')

    await new Promise((resolve, reject) => {
      let settled = false
      const done = (fn, val) => { if (!settled) { settled = true; fn(val) } }

      const proc = spawn('asciidoctor', [
        '-r', 'asciidoctor-diagram',
        '-a', 'data-uri',
        '-o', outFile,
        srcFile
      ], { stdio: ['ignore', 'pipe', 'pipe'] })

      const errChunks = []

      const timer = setTimeout(() => {
        proc.kill()
        done(reject, new Error('Render timed out'))
      }, RENDER_TIMEOUT_MS)

      proc.on('error', (err) => { clearTimeout(timer); done(reject, err) })
      proc.stderr.on('data', (d) => errChunks.push(d))
      proc.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) done(resolve, undefined)
        else done(reject, new Error(Buffer.concat(errChunks).toString() || `Exit code ${code}`))
      })
    })

    return await readFile(outFile, 'utf8')
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  }
}
