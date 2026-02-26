import { Router } from 'express'
import { readFile, writeFile, unlink, readdir, stat, mkdir } from 'fs/promises'
import { join, relative, dirname } from 'path'

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
    const filePath = join(workspace, req.params[0])
    try {
      const content = await readFile(filePath, 'utf8')
      res.json({ content })
    } catch {
      res.status(404).json({ error: 'Not found' })
    }
  })

  // Create or overwrite a file
  router.post('/*', async (req, res) => {
    const filePath = join(workspace, req.params[0])
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, req.body.content ?? '', 'utf8')
    res.json({ ok: true })
  })

  // Delete a file
  router.delete('/*', async (req, res) => {
    const filePath = join(workspace, req.params[0])
    try {
      await unlink(filePath)
      res.json({ ok: true })
    } catch {
      res.status(404).json({ error: 'Not found' })
    }
  })

  return router
}
