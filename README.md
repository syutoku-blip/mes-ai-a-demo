# Export Lab — Dev Sites

WorldShift株式会社が運営する、輸出ビジネスの共創コミュニティ「Export Lab」および関連サイトの開発リポジトリです。

## サイト構成

| フォルダ | 内容 |
|---|---|
| `community/` | Export Lab コミュニティサイト本体（フォーラム／グループ／お知らせ） |
| `dev1/` | 開発中サイト①（準備中） |
| `dev2/` | 開発中サイト②（準備中） |
| `shared/` | 全サイト共通の切り替えヘッダー |

各サイトはページ上部の共通ヘッダーから相互に切り替えられます。

## Export Lab コミュニティサイトについて

人・モノ・情報がつながる、輸出の共創コミュニティ。輸出ビジネスのヒントやリアルな声が集まる場所として、Amazon出品や海外販売に取り組むメンバーをつなぐことを目的にしています。

- **フォーラム** … 投稿と返信によるQ&A・情報交換
- **グループ** … メンバー限定で話し合えるテーマ別の非公開スペース
- **お知らせ** … 運営からの公式発信

## 公開URL

`https://ユーザー名.github.io/リポジトリ名/`

## 新しいページに共通ヘッダーを組み込む方法

`dev1` や `dev2` フォルダの中に新しく開発中のサイトのコードを追加したとき、そのページに「DEV SITES」の切り替えバーが表示されない・他の開発画面に移動できない場合は、以下の3箇所が入っているか確認してください。

```html
<head>
  ...
  <link rel="stylesheet" href="../shared/global-header.css">
</head>
<body data-site="dev1" data-root="..">
  ...（ページの中身）...

  <script src="../shared/global-header.js" defer></script>
</body>
```

| 追加箇所 | 役割 |
|---|---|
| `<link rel="stylesheet" href="../shared/global-header.css">` | 切り替えバーの見た目を読み込む |
| `<body data-site="dev1" data-root="..">` | `data-site` … このページがどのサイトか（`community`／`dev1`／`dev2`）。切り替えバーの対応タブがハイライトされる<br>`data-root` … `shared` フォルダまでの相対パス |
| `<script src="../shared/global-header.js" defer></script>` | 切り替えバー本体を生成するスクリプト |

**ポイント**
- **画面が実際に表示されるページ**（例：`portal.html` や `index.html` の中身が空でリダイレクトだけしている場合はリダイレクト先のページ）に追加する
- `data-root` はそのページが `shared` フォルダから何階層離れているかで変わる。`dev1/portal.html` のように直下なら `".."`、`dev1/app/page.html` のように1つ深い場所にあるなら `"../.."`（`href` や `src` のパスも同様に階層を1つ増やす）

**自分のページに元から上部固定バーがある場合の注意**

サイト側にもともと「上部に固定された独自のヘッダー（`position: fixed; top: 0;` など）」がある場合、DEV SITESバー（高さ約34px）と重なって表示が崩れることがあります。その場合は、自分のヘッダー側の `top` の値を `34px` に変更するか、`position: sticky` に変更すると重ならずに済みます。
