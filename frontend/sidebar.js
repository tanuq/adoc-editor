import { listFiles, deleteFile } from './api.js'

let onSelectCallback = null
let activeFile = null

export function initSidebar({ onSelect }) {
  onSelectCallback = onSelect

  document.getElementById('btn-new-file').addEventListener('click', async () => {
    const name = prompt('File name (e.g. notes.adoc):')
    if (!name) return
    const path = name.endsWith('.adoc') ? name : `${name}.adoc`
    await fetch(`/api/files/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `= ${name.replace('.adoc', '')}\n\n` })
    })
    await refreshSidebar()
    selectFile(path)
  })

  refreshSidebar()
}

export async function refreshSidebar() {
  const files = await listFiles()
  const ul = document.getElementById('file-tree')
  ul.innerHTML = ''
  for (const f of files) {
    const li = document.createElement('li')
    li.textContent = f
    li.title = f
    li.dataset.path = f
    if (f === activeFile) li.classList.add('active')

    const del = document.createElement('button')
    del.textContent = '✕'
    del.className = 'delete-btn'
    del.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (!confirm(`Delete ${f}?`)) return
      await deleteFile(f)
      if (activeFile === f) activeFile = null
      await refreshSidebar()
    })
    li.appendChild(del)

    li.addEventListener('click', () => selectFile(f))
    ul.appendChild(li)
  }
}

function selectFile(path) {
  activeFile = path
  document.querySelectorAll('#file-tree li').forEach((li) => {
    li.classList.toggle('active', li.dataset.path === path)
  })
  onSelectCallback?.(path)
}

export function getActiveFile() {
  return activeFile
}
