import { initEditor, setContent, getContent, toggleVim, isVimMode } from './editor.js'
import { initSidebar, getActiveFile, refreshSidebar } from './sidebar.js'
import { readFile, saveFile } from './api.js'

const editorPane = document.getElementById('editor-pane')
const btnKeybinding = document.getElementById('btn-keybinding')
const toolbarFilename = document.getElementById('toolbar-filename')

initEditor(editorPane, {
  onChange: (text) => { /* wired in Task 9 */ },
  onCursor: (ln, col) => {
    document.getElementById('status-cursor').textContent = `Ln ${ln}, Col ${col}`
  }
})

initSidebar({
  onSelect: async (path) => {
    const content = await readFile(path)
    setContent(content)
    toolbarFilename.textContent = path
    document.getElementById('status-message').textContent = `Opened: ${path}`
  }
})

btnKeybinding.addEventListener('click', () => {
  const isVim = toggleVim()
  btnKeybinding.textContent = isVim ? 'Vim' : 'Normal'
  btnKeybinding.classList.toggle('active', isVim)
  document.getElementById('status-keymap').textContent = isVim ? 'Vim' : 'Normal'
})

btnKeybinding.classList.add('active')
