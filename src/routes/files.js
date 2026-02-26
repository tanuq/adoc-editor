import { Router } from 'express'
import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { join, dirname, resolve } from 'path'

function safeJoin(workspace, userPath) {
  const resolved = resolve(join(workspace, userPath))
  const base = resolve(workspace)
  if (!resolved.startsWith(base + '/') && resolved !== base) return null
  return resolved
}

async function listAdoc(dir, base = '') {
  const entries = await readdir(join(dir, base || '.'), { withFileTypes: true }).catch(() => [])
  const results = []
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) {
      results.push(...await listAdoc(dir, rel))
    } else if (e.name.endsWith('.adoc')) {
      results.push(rel)
    }
  }
  return results
}

export default function filesRouter(workspace) {
  const router = Router()

  // List all .adoc files
  router.get('/', async (req, res) => {
    const files = await listAdoc(workspace)
    res.json(files)
  })

  // Read a file
  router.get('/*', async (req, res) => {
    const filePath = safeJoin(workspace, req.params[0])
    if (!filePath) return res.status(400).json({ error: 'Invalid path' })
    try {
      const content = await readFile(filePath, 'utf8')
      res.json({ content })
    } catch (e) {
      if (e.code === 'ENOENT') res.status(404).json({ error: 'Not found' })
      else res.status(500).json({ error: 'Read failed' })
    }
  })

  // Create or overwrite a file
  router.post('/*', async (req, res) => {
    const filePath = safeJoin(workspace, req.params[0])
    if (!filePath) return res.status(400).json({ error: 'Invalid path' })
    try {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, req.body.content ?? '', 'utf8')
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: 'Write failed' })
    }
  })

  // Delete a file
  router.delete('/*', async (req, res) => {
    const filePath = safeJoin(workspace, req.params[0])
    if (!filePath) return res.status(400).json({ error: 'Invalid path' })
    try {
      await unlink(filePath)
      res.json({ ok: true })
    } catch (e) {
      if (e.code === 'ENOENT') res.status(404).json({ error: 'Not found' })
      else res.status(500).json({ error: 'Delete failed' })
    }
  })

  return router
}
