import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile, access } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import exportRouter from '../src/routes/export.js'

let app, tmpDir

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'adoc-export-'))
  app = express()
  app.use('/api/export', exportRouter(tmpDir))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('POST /api/export/html/foo.adoc saves foo.html', async () => {
  await writeFile(join(tmpDir, 'foo.adoc'), '= Test\n\nHello.')

  const res = await request(app).post('/api/export/html/foo.adoc')
  expect(res.status).toBe(200)
  expect(res.body.path).toBe('foo.html')

  await expect(access(join(tmpDir, 'foo.html'))).resolves.toBeUndefined()
}, 15000)

test('returns 404 for non-existent file', async () => {
  await request(app).post('/api/export/html/nope.adoc').expect(404)
})

test('returns 400 for path traversal attempt', async () => {
  const res = await request(app).post('/api/export/html/..%2fetc%2fpasswd')
  expect(res.status).toBe(400)
})
