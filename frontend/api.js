export async function listFiles() {
  const res = await fetch('/api/files')
  if (!res.ok) throw new Error(`Failed to list files: ${res.status}`)
  return res.json()
}

export async function readFile(path) {
  const res = await fetch(`/api/files/${path}`)
  if (!res.ok) throw new Error('Not found')
  const { content } = await res.json()
  return content
}

export async function saveFile(path, content) {
  const res = await fetch(`/api/files/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  if (!res.ok) throw new Error(`Failed to save: ${res.status}`)
}

export async function deleteFile(path) {
  const res = await fetch(`/api/files/${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
}

export async function exportFile(type, path) {
  const res = await fetch(`/api/export/${type}/${path}`, { method: 'POST' })
  return res.json()
}
