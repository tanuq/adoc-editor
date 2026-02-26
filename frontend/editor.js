import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { StreamLanguage } from '@codemirror/language'
import { vim } from '@replit/codemirror-vim'
import { oneDark } from '@codemirror/theme-one-dark'

// Minimal AsciiDoc StreamParser (no external package provides one)
const asciidoc = {
  name: 'asciidoc',
  startState() { return {} },
  token(stream) {
    if (stream.sol()) {
      if (stream.match(/^={1,6}\s/)) { stream.skipToEnd(); return 'heading' }
      if (stream.match(/^\.\w/)) { stream.skipToEnd(); return 'atom' }
      if (stream.match(/^----/)) { stream.skipToEnd(); return 'comment' }
      if (stream.match(/^\/\//)) { stream.skipToEnd(); return 'comment' }
      if (stream.match(/^\[/)) { stream.skipToEnd(); return 'keyword' }
      if (stream.match(/^\*{1,2}\s/)) { stream.skipToEnd(); return 'keyword' }
    }
    if (stream.match(/\*[^*]+\*/)) return 'strong'
    if (stream.match(/_[^_]+_/)) return 'emphasis'
    if (stream.match(/`[^`]+`/)) return 'monospace'
    stream.next()
    return null
  }
}

const asciidocLang = StreamLanguage.define(asciidoc)

let editorView = null
let vimMode = true
let onChangeCallback = null
let onCursorCallback = null

function buildExtensions() {
  const base = [
    asciidocLang,
    lineNumbers(),
    highlightActiveLine(),
    history(),
    oneDark,
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeCallback) {
        onChangeCallback(update.view.state.doc.toString())
      }
      if (update.selectionSet && onCursorCallback) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        onCursorCallback(line.number, pos - line.from + 1)
      }
    }),
  ]
  if (vimMode) base.unshift(vim())
  return base
}

export function initEditor(container, { onChange, onCursor } = {}) {
  onChangeCallback = onChange
  onCursorCallback = onCursor

  editorView = new EditorView({
    state: EditorState.create({ doc: '', extensions: buildExtensions() }),
    parent: container,
  })
  return editorView
}

export function setContent(content) {
  if (!editorView) return
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: content }
  })
}

export function getContent() {
  return editorView?.state.doc.toString() ?? ''
}

export function toggleVim() {
  vimMode = !vimMode
  const content = getContent()
  editorView.setState(
    EditorState.create({ doc: content, extensions: buildExtensions() })
  )
  return vimMode
}

export function isVimMode() {
  return vimMode
}
