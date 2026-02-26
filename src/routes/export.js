import { Router } from 'express'
import { access } from 'fs/promises'
import { join, resolve } from 'path'
import { spawn } from 'child_process'

function safeJoin(workspace, userPath) {
  const resolved = resolve(join(workspace, userPath))
  const base = resolve(workspace)
  if (!resolved.startsWith(base + '/') && resolved !== base) return null
  return resolved
}

function runAsciidoctor(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('asciidoctor', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const err = []
    proc.stderr.on('data', (d) => err.push(d))
    proc.on('error', (e) => reject(e))
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(Buffer.concat(err).toString() || `Exit ${code}`))
    })
  })
}

export default function exportRouter(workspace) {
  const router = Router()

  router.post('/html/*', async (req, res) => {
    const relPath = req.params[0]
    const srcPath = safeJoin(workspace, relPath)
    if (!srcPath) return res.status(400).json({ error: 'Invalid path' })
    const outPath = srcPath.replace(/\.adoc$/, '.html')
    const outRel = relPath.replace(/\.adoc$/, '.html')

    try {
      await access(srcPath)
    } catch {
      return res.status(404).json({ error: 'Not found' })
    }

    try {
      await runAsciidoctor(['--data-uri', '-o', outPath, srcPath])
      res.json({ ok: true, path: outRel })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.post('/pdf/*', async (req, res) => {
    const relPath = req.params[0]
    const srcPath = safeJoin(workspace, relPath)
    if (!srcPath) return res.status(400).json({ error: 'Invalid path' })
    const outPath = srcPath.replace(/\.adoc$/, '.pdf')
    const outRel = relPath.replace(/\.adoc$/, '.pdf')

    try {
      await access(srcPath)
    } catch {
      return res.status(404).json({ error: 'Not found' })
    }

    try {
      await runAsciidoctor(['-r', 'asciidoctor-pdf', '-b', 'pdf', '-o', outPath, srcPath])
      res.json({ ok: true, path: outRel })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  return router
}
