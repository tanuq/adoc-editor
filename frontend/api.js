export async function listFiles() {
  const res = await fetch('/api/files')
  return res.json()
}

export async function readFile(path) {
  const res = await fetch(`/api/files/${path}`)
  if (!res.ok) throw new Error('Not found')
  const { content } = await res.json()
  return content
}

export async function saveFile(path, content) {
  await fetch(`/api/files/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
}

export async function deleteFile(path) {
  await fetch(`/api/files/${path}`, { method: 'DELETE' })
}

export async function exportFile(type, path) {
  const res = await fetch(`/api/export/${type}/${path}`, { method: 'POST' })
  return res.json()
}
