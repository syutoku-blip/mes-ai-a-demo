# Dev Sites (開発用マルチサイト リポジトリ)

1つのリポジトリで複数の開発中サイトをまとめて管理し、共通のヘッダーで切り替えるための構成です。
「①ヘッダー ②コミュニティサイト ③開発① ④開発②」を、それぞれ独立した大きなフォルダとして作れるようにしています。

## フォルダ構成

```
repo/
├─ index.html          … ルート（サイト一覧ページ）
├─ header/              … ①ヘッダー用フォルダ
│  ├─ global-header.css … 全サイト共通の切り替えバー（見た目）
│  └─ global-header.js  … 同上（挙動・タブの出し分け）
├─ community/           … ②コミュニティサイト用フォルダ
│  ├─ index.html
│  ├─ board.html
│  ├─ topic.html
│  ├─ groups.html
│  ├─ announcements.html
│  └─ assets/
│     ├─ style.css
│     └─ hero.png
├─ dev1/                … ③開発①用フォルダ（今は仮ページ）
│  └─ index.html
└─ dev2/                … ④開発②用フォルダ（今は仮ページ）
   └─ index.html
```

フォルダ名はこのままでも、GitHub上でリネームしても構いません。日本語名（`ヘッダー`など）にすることも可能ですが、URLが読みにくくなるため英語名のままにするのがおすすめです。

## 共通ヘッダーの仕組み

各ページの `<body>` タグに `data-site` と `data-root` を持たせているだけです。

```html
<body data-site="community" data-root="..">
```

- `data-site` … 今どのサイトを開いているか（`community` / `dev1` / `dev2`）。この値と一致するタブがハイライトされます。
- `data-root` … リポジトリのルートまでの相対パス。`community/`・`dev1/`・`dev2/` の直下にあるページなら `".."`、ルート直下の `index.html` なら `"."` です。

`header/global-header.js` がこの2つを読み取って、ページの先頭に切り替えバーを自動で挿入します。新しいサイト（開発③など）を追加したいときは `global-header.js` の `sites` 配列に1行足すだけで、全ページに反映されます。

## GitHubで「フォルダを1つずつ自分で作る」手順

4つの大きなフォルダ（①ヘッダー ②コミュニティサイト ③開発① ④開発②）を、順番に自分の手で作っていくやり方です。フォルダごとに zip を分けてお渡ししているので、1つの塊ずつ確認しながら進められます。

1. GitHubで新しいリポジトリを作成する（README等は追加しなくてOK）。
2. リポジトリ画面右上の **[Add file] → [Upload files]** を開く。
3. **①ヘッダー**：`header-folder.zip` を解凍してできる `header` フォルダを、そのままアップロード画面にドラッグ＆ドロップ → 下部でコミットメッセージ（例：`ヘッダーを追加`）を入力して **[Commit changes]**。
   - これで `header/global-header.css` と `header/global-header.js` の2ファイルが入った `header` フォルダができます。
4. もう一度 **[Add file] → [Upload files]** を開き、**②コミュニティサイト**：`community-folder.zip` を解凍した `community` フォルダをドラッグ＆ドロップしてコミット。
5. 同様に **③開発①**：`dev1-folder.zip` の `dev1` フォルダをアップロード＆コミット。
6. 同様に **④開発②**：`dev2-folder.zip` の `dev2` フォルダをアップロード＆コミット。
7. 最後にルート直下の `index.html`（サイト一覧ページ）を単体でアップロード＆コミット。
8. リポジトリの **[Settings] → [Pages]** を開き、**Source** を `Deploy from a branch`、**Branch** を `main` / `/(root)` に設定して **Save**。
9. しばらくすると `https://ユーザー名.github.io/リポジトリ名/` でサイトが公開されます。

> フォルダ単位でアップロードすると、GitHub側が自動でその名前のフォルダを作ってくれます。空フォルダだけを先に作る、ということはGitHubの仕組み上できません（フォルダは中にファイルが入って初めて存在します）。

### 1ファイルずつ手打ちで作りたい場合

`Upload files` を使わず手打ちしたい場合は、**[Add file] → [Create new file]** のファイル名欄に `header/global-header.css` のように **フォルダ名/ファイル名** を入力すると、GitHubが自動でそのフォルダを作ってくれます。あとは中身を貼り付けて commit するだけです。

## 今後サイトを増やす場合

1. ルート直下に新しいフォルダ（例：`dev3/`）を作り、その中にサイトのHTML一式を置く。
2. 各ページの `<body>` に `data-site="dev3" data-root=".."` を追加。
3. `<head>` に共通CSS、`</body>` 直前に共通JSを読み込む：
   ```html
   <link rel="stylesheet" href="../header/global-header.css">
   ...
   <script src="../header/global-header.js" defer></script>
   ```
4. `header/global-header.js` の `sites` 配列に1行追加する：
   ```js
   { id: 'dev3', label: '開発③', href: root + '/dev3/index.html' }
   ```
