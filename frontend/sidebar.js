import { listFiles, deleteFile, saveFile } from './api.js'

let onSelectCallback = null
let activeFile = null
const collapsedDirs = new Set()

export function initSidebar({ onSelect }) {
  onSelectCallback = onSelect

  document.getElementById('btn-new-file').addEventListener('click', () => newFileIn(''))

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
  renderTree(buildTree(files), '', 0, ul)
}

function buildTree(paths) {
  const root = { dirs: {}, files: [] }
  for (const p of paths) {
    const parts = p.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i]
      if (!node.dirs[dir]) node.dirs[dir] = { dirs: {}, files: [] }
      node = node.dirs[dir]
    }
    node.files.push(p)
  }
  return root
}

function renderTree(node, dirPath, depth, ul) {
  const indent = 16 + depth * 12

  for (const [name, sub] of Object.entries(node.dirs).sort(([a], [b]) => a.localeCompare(b))) {
    const fullDirPath = dirPath ? `${dirPath}/${name}` : name
    const collapsed = collapsedDirs.has(fullDirPath)

    const li = document.createElement('li')
    li.className = 'dir-item'
    li.style.paddingLeft = `${indent}px`

    const toggle = document.createElement('span')
    toggle.className = 'dir-toggle'
    toggle.textContent = collapsed ? '▶ ' : '▼ '

    const label = document.createElement('span')
    label.textContent = name + '/'

    const addBtn = document.createElement('button')
    addBtn.className = 'dir-add-btn'
    addBtn.textContent = '+'
    addBtn.title = `New file in ${fullDirPath}/`
    addBtn.addEventListener('click', e => { e.stopPropagation(); newFileIn(fullDirPath) })

    li.append(toggle, label, addBtn)
    li.addEventListener('click', () => {
      if (collapsed) collapsedDirs.delete(fullDirPath)
      else collapsedDirs.add(fullDirPath)
      refreshSidebar()
    })
    ul.appendChild(li)

    if (!collapsed) renderTree(sub, fullDirPath, depth + 1, ul)
  }

  for (const filePath of [...node.files].sort()) {
    const li = document.createElement('li')
    li.className = 'file-item'
    li.style.paddingLeft = `${indent}px`
    li.textContent = filePath.split('/').pop()
    li.title = filePath
    li.dataset.path = filePath
    if (filePath === activeFile) li.classList.add('active')

    const del = document.createElement('button')
    del.textContent = '✕'
    del.className = 'delete-btn'
    del.addEventListener('click', async e => {
      e.stopPropagation()
      if (!confirm(`Delete ${filePath}?`)) return
      try {
        await deleteFile(filePath)
        if (activeFile === filePath) activeFile = null
        await refreshSidebar()
      } catch (err) {
        document.getElementById('status-message').textContent = `Error deleting ${filePath}: ${err.message}`
      }
    })
    li.appendChild(del)
    li.addEventListener('click', () => selectFile(filePath))
    ul.appendChild(li)
  }
}

async function newFileIn(dirPath) {
  const name = prompt('File name (e.g. notes.adoc):')
  if (!name) return
  const filename = name.endsWith('.adoc') ? name : `${name}.adoc`
  const filePath = dirPath ? `${dirPath}/${filename}` : filename
  const title = filename.replace(/\.adoc$/, '')
  try {
    await saveFile(filePath, `= ${title}\n\n`)
    await refreshSidebar()
    selectFile(filePath)
  } catch (err) {
    alert(`Failed to create file: ${err.message}`)
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
