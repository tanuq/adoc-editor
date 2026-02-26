import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import filesRouter from '../src/routes/files.js'

let app, tmpDir

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'adoc-test-'))
  app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/files', filesRouter(tmpDir))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('GET /api/files returns empty array for empty dir', async () => {
  const res = await request(app).get('/api/files')
  expect(res.status).toBe(200)
  expect(res.body).toEqual([])
})

test('POST then GET returns file content', async () => {
  await request(app)
    .post('/api/files/test.adoc')
    .send({ content: '= Hello' })
    .expect(200)

  const res = await request(app).get('/api/files/test.adoc')
  expect(res.status).toBe(200)
  expect(res.body.content).toBe('= Hello')
})

test('GET /api/files lists .adoc files recursively', async () => {
  await mkdir(join(tmpDir, 'sub'))
  await writeFile(join(tmpDir, 'a.adoc'), '')
  await writeFile(join(tmpDir, 'sub', 'b.adoc'), '')
  await writeFile(join(tmpDir, 'ignore.txt'), '')

  const res = await request(app).get('/api/files')
  expect(res.status).toBe(200)
  expect(res.body).toContain('a.adoc')
  expect(res.body).toContain('sub/b.adoc')
  expect(res.body).not.toContain('ignore.txt')
})

test('DELETE removes file', async () => {
  await request(app).post('/api/files/del.adoc').send({ content: 'x' })
  await request(app).delete('/api/files/del.adoc').expect(200)
  await request(app).get('/api/files/del.adoc').expect(404)
})
