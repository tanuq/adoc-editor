# Configurable Workspace & Directory Tree View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** docker-compose の workspace を `DOCS_DIR` 環境変数で指定可能にし、サイドバーを折りたたみ可能なディレクトリツリーに変更する。

**Architecture:** docker-compose.yml の volume host パスを変数化。フロントエンドは API の flat パスリストを `buildTree()` でツリー構造に変換し再帰的に描画する。API 変更なし。

**Tech Stack:** Node.js / Express, vanilla JS (ESM), esbuild bundle, Docker Compose variable substitution

---

### Task 1: docker-compose.yml — DOCS_DIR 変数化

**Files:**
- Modify: `docker-compose.yml`

**Step 1: 変更を適用する**

`docker-compose.yml` の volume host パスを変数化：

```yaml
services:
  adoc-editor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ${DOCS_DIR:-./docs}:/workspace/mounted
    environment:
      - WORKSPACE=/workspace/mounted
      - PORT=3000
```

**Step 2: 動作確認**

```bash
docker compose config | grep -A2 volumes
```

期待出力：`./docs:/workspace/mounted`（DOCS_DIR 未設定時のデフォルト）

```bash
DOCS_DIR=/tmp docker compose config | grep -A2 volumes
```

期待出力：`/tmp:/workspace/mounted`

**Step 3: コミット**

```bash
git add docker-compose.yml
git commit -m "feat: allow DOCS_DIR env var to configure workspace mount path"
```

---

### Task 2: sidebar.js — ツリー構築・描画ロジック

**Files:**
- Modify: `frontend/sidebar.js`

現在の flat リスト描画を、折りたたみ可能なディレクトリツリーに置き換える。

**Step 1: `sidebar.js` を以下に全置換する**

```js
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

  for (const [name, sub] of Object.entries(node.dirs).sort()) {
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
```

**Step 2: コミット（スタイル追加前に先にロジックをコミット）**

```bash
git add frontend/sidebar.js
git commit -m "feat: replace flat file list with collapsible directory tree"
```

---

### Task 3: style.css — ディレクトリ行スタイル追加

**Files:**
- Modify: `public/style.css`

**Step 1: `#file-tree` セクションの末尾（`li:hover .delete-btn` の後）に追記する**

```css
#file-tree .dir-item { display: flex; align-items: center; gap: 4px; overflow: visible; color: #ccc; }
#file-tree .dir-toggle { font-size: 11px; color: #888; user-select: none; }
#file-tree .dir-add-btn { margin-left: auto; visibility: hidden; background: none; border: 1px solid #555;
  color: #ccc; cursor: pointer; width: 20px; height: 20px; font-size: 14px; border-radius: 3px; flex-shrink: 0; }
#file-tree .dir-item:hover .dir-add-btn { visibility: visible; }
```

**Step 2: コミット**

```bash
git add public/style.css
git commit -m "feat: add sidebar styles for directory tree items"
```

---

### Task 4: フロントエンドビルドと動作確認

**Files:**
- Modify: `public/bundle.js` (generated)

**Step 1: バンドルをビルドする**

```bash
npm run build
```

期待出力：`public/bundle.js` が更新される（エラーなし）

**Step 2: bundle をコミット**

```bash
git add public/bundle.js
git commit -m "build: rebuild bundle with directory tree changes"
```

**Step 3: サーバーを起動して手動確認**

```bash
node server.js
```

ブラウザで `http://localhost:3000` を開き、以下を確認：

1. サイドバーにディレクトリが `▼ dirname/` の形式で表示される
2. ディレクトリ名をクリックすると `▶` に変わり折りたたまれる
3. ディレクトリ行にホバーすると `[+]` ボタンが表示され、クリックするとそのディレクトリ内にファイルを作成できる
4. ヘッダーの `[+]` はルート直下にファイルを作成する
5. ファイルをクリックするとエディタで開く（アクティブ強調表示あり）

**Step 4: DOCS_DIR 動作確認（Docker 使用時）**

```bash
DOCS_DIR=/tmp/test-docs docker compose up --build
```

コンテナが `/tmp/test-docs` を workspace として使うことを確認する。
