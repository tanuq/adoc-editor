import { Router } from 'express'
import { access } from 'fs/promises'
import { join } from 'path'
import { spawn } from 'child_process'
import { safeJoin } from '../lib/paths.js'

const EXPORT_TIMEOUT_MS = 30000

function runAsciidoctor(args) {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (fn, val) => { if (!settled) { settled = true; fn(val) } }

    const proc = spawn('asciidoctor', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const err = []

    const timer = setTimeout(() => {
      proc.kill()
      done(reject, new Error('Export timed out'))
    }, EXPORT_TIMEOUT_MS)

    proc.stderr.on('data', (d) => err.push(d))
    proc.on('error', (e) => { clearTimeout(timer); done(reject, e) })
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) done(resolve, undefined)
      else done(reject, new Error(Buffer.concat(err).toString() || `Exit ${code}`))
    })
  })
}

async function doExport(workspace, relPath, outExt, asciidoctorArgs, res) {
  if (!relPath.endsWith('.adoc')) return res.status(400).json({ error: 'Only .adoc files can be exported' })

  const srcPath = safeJoin(workspace, relPath)
  if (!srcPath) return res.status(400).json({ error: 'Invalid path' })

  try {
    await access(srcPath)
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    return res.status(500).json({ error: 'Access denied' })
  }

  const outPath = srcPath.replace(/\.adoc$/, outExt)
  const outRel = relPath.replace(/\.adoc$/, outExt)

  try {
    await runAsciidoctor([...asciidoctorArgs, '-o', outPath, srcPath])
    res.json({ ok: true, path: outRel })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

export default function exportRouter(workspace) {
  const router = Router()

  router.post('/html/*', (req, res) =>
    doExport(workspace, req.params[0], '.html', ['-a', 'data-uri'], res))

  router.post('/pdf/*', (req, res) =>
    doExport(workspace, req.params[0], '.pdf', ['-r', 'asciidoctor-pdf', '-b', 'pdf'], res))

  return router
}
