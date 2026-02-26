import { initEditor, setContent, getContent, toggleVim, isVimMode } from './editor.js'

const editorPane = document.getElementById('editor-pane')
const btnKeybinding = document.getElementById('btn-keybinding')

let view = initEditor(editorPane, {
  onChange: (text) => { /* wired in Task 9 */ },
  onCursor: (ln, col) => {
    document.getElementById('status-cursor').textContent = `Ln ${ln}, Col ${col}`
  }
})

btnKeybinding.addEventListener('click', () => {
  const isVim = toggleVim()
  btnKeybinding.textContent = isVim ? 'Vim' : 'Normal'
  btnKeybinding.classList.toggle('active', isVim)
  document.getElementById('status-keymap').textContent = isVim ? 'Vim' : 'Normal'
})

btnKeybinding.classList.add('active')
