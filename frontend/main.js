import { initEditor, setContent, toggleVim } from './editor.js'
import { initSidebar, getActiveFile } from './sidebar.js'
import { initPreview, sendPreview } from './preview.js'
import { readFile, saveFile, exportFile } from './api.js'

const editorPane = document.getElementById('editor-pane')
const btnKeybinding = document.getElementById('btn-keybinding')
const toolbarFilename = document.getElementById('toolbar-filename')
const statusMessage = document.getElementById('status-message')
const btnExportHtml = document.getElementById('btn-export-html')

initPreview()

const saveTimers = new Map()

function setStatus(msg) {
  statusMessage.textContent = msg
}

initEditor(editorPane, {
  onChange: (text) => {
    sendPreview(text)
    // Auto-save after 1 second idle (per-file timer to prevent cross-file cancellation)
    const path = getActiveFile()
    if (path) {
      clearTimeout(saveTimers.get(path))
      saveTimers.set(path, setTimeout(async () => {
        saveTimers.delete(path)
        try {
          await saveFile(path, text)
          setStatus(`Saved: ${path}`)
        } catch (err) {
          setStatus(`Save failed: ${err.message}`)
        }
      }, 1000))
    }
  },
  onCursor: (ln, col) => {
    document.getElementById('status-cursor').textContent = `Ln ${ln}, Col ${col}`
  }
})

initSidebar({
  onSelect: async (path) => {
    try {
      const content = await readFile(path)
      setContent(content)
      sendPreview(content)
      toolbarFilename.textContent = path
      setStatus(`Opened: ${path}`)
    } catch (err) {
      setStatus(`Error opening ${path}: ${err.message}`)
    }
  }
})

btnKeybinding.addEventListener('click', () => {
  const isVim = toggleVim()
  btnKeybinding.textContent = isVim ? 'Vim' : 'Normal'
  btnKeybinding.classList.toggle('active', isVim)
  document.getElementById('status-keymap').textContent = isVim ? 'Vim' : 'Normal'
})
btnKeybinding.classList.add('active')

btnExportHtml.addEventListener('click', async () => {
  const path = getActiveFile()
  if (!path) return setStatus('No file open')
  setStatus('Exporting HTML...')
  try {
    const res = await exportFile('html', path)
    setStatus(res.ok ? `Saved: ${res.path}` : `Error: ${res.error}`)
  } catch (err) {
    setStatus(`Export failed: ${err.message}`)
  }
})

