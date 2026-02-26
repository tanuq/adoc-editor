import { listFiles, deleteFile, saveFile } from './api.js'

let onSelectCallback = null
let activeFile = null

export function initSidebar({ onSelect }) {
  onSelectCallback = onSelect

  document.getElementById('btn-new-file').addEventListener('click', async () => {
    const name = prompt('File name (e.g. notes.adoc):')
    if (!name) return
    const path = name.endsWith('.adoc') ? name : `${name}.adoc`
    const title = path.replace(/\.adoc$/, '')
    try {
      await saveFile(path, `= ${title}\n\n`)
      await refreshSidebar()
      selectFile(path)
    } catch (err) {
      alert(`Failed to create file: ${err.message}`)
    }
  })

  refreshSidebar()
}

export async function refreshSidebar() {
  let files
  try {
    files = await listFiles()
  } catch (err) {
    document.getElementById('status-message').textContent = `Error loading files: ${err.message}`
    return
  }
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
      try {
        await deleteFile(f)
        if (activeFile === f) activeFile = null
        await refreshSidebar()
      } catch (err) {
        document.getElementById('status-message').textContent = `Error deleting ${f}: ${err.message}`
      }
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
