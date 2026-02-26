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

test('POST /api/export/pdf/foo.adoc saves foo.pdf', async () => {
  await writeFile(join(tmpDir, 'foo.adoc'), '= Test\n\nHello.')

  const res = await request(app).post('/api/export/pdf/foo.adoc')
  expect(res.status).toBe(200)
  expect(res.body.path).toBe('foo.pdf')

  await expect(access(join(tmpDir, 'foo.pdf'))).resolves.toBeUndefined()
}, 15000)

test('returns 404 for non-existent file', async () => {
  await request(app).post('/api/export/html/nope.adoc').expect(404)
})
