# Design: Configurable Workspace & Directory Tree View

## Overview

Two features:
1. Docker Compose の volume host パスを環境変数で指定可能にする
2. サイドバーのファイルリストを折りたたみ可能なディレクトリツリーに変更

## Feature 1: Configurable Workspace

### Current State

`server.js` はすでに `WORKSPACE` 環境変数対応済み。`docker-compose.yml` の volume mount の host パスが `./docs` に固定されている。

### Change

`docker-compose.yml` の volume host パスを変数化する：

```yaml
volumes:
  - ${DOCS_DIR:-./docs}:/workspace/mounted
```

`DOCS_DIR` を指定しない場合は `./docs` がデフォルト。

### Usage

```sh
# デフォルト（./docs）
docker compose up

# カスタムパス
DOCS_DIR=/path/to/my-notes docker compose up
```

## Feature 2: Directory Tree View

### Current State

`/api/files` は `["sub/note.adoc", "hello.adoc"]` のような flat なパスリストを返す。サイドバーは `<ul>` のフラットリストとして表示。

### Approach

API 変更なし。フロントエンド (`sidebar.js`) で flat パスリストからツリーを構築して描画する。

### Tree Data Structure

flat リストを `buildTree()` でネストオブジェクトに変換：

```js
// Input: ["sub/note.adoc", "hello.adoc"]
// Output:
{
  "": {        // root
    dirs: { "sub": { dirs: {}, files: ["sub/note.adoc"] } },
    files: ["hello.adoc"]
  }
}
```

### Sidebar Rendering

- ディレクトリは `▶/▼` + フォルダ名 + `[+]` ボタン
- ファイルは字下げしてファイル名 + `[✕]` ボタン
- 折りたたみ状態は `Set<string>` で管理（ディレクトリパスを格納）
- 初期状態：全展開

```
Files                    [+]
▼ sub/               [+]
    note.adoc        [✕]
hello.adoc           [✕]
```

### New File Creation

- サイドバーヘッダーの `[+]`：ルート直下にファイルを作成
- 各ディレクトリ行の `[+]`：そのディレクトリ内にファイルを作成
- どちらも `prompt('File name:')` でファイル名を入力

## Files to Modify

- `docker-compose.yml` — DOCS_DIR 変数化
- `frontend/sidebar.js` — ツリー構築・描画ロジック
- `public/style.css` — ディレクトリ行のスタイル追加
