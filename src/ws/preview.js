import { spawn } from 'child_process'

export function handlePreview(ws) {
  ws.on('message', (data) => {
    const adocText = data.toString()
    renderAdoc(adocText)
      .then((html) => ws.send(html))
      .catch((err) => ws.send(`<pre>Error: ${err.message}</pre>`))
  })
}

export function renderAdoc(text) {
  return new Promise((resolve, reject) => {
    const proc = spawn('asciidoctor', ['-o', '-', '-'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const chunks = []
    const errChunks = []

    proc.stdout.on('data', (d) => chunks.push(d))
    proc.stderr.on('data', (d) => errChunks.push(d))

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString())
      } else {
        reject(new Error(Buffer.concat(errChunks).toString() || `Exit code ${code}`))
      }
    })

    proc.stdin.write(text)
    proc.stdin.end()
  })
}
