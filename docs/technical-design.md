# 技術設計

## ページ構造の調査結果

`item.rakuten.co.jp` の商品ページ（ショップ独自レイアウト型）は以下の構成になっている。

```
ページ先頭
    ↓ ヘッダー (#rakutenLimitedId_header)
      サブヘッダー (.pc-item-page-header)
#pagebody
    └ [class*="image-wrapper--"]  ← 商品画像（ショップ標準レイアウト）
    └ .sale_desc                  ← 商品画像（ショップ独自レイアウト）
    └ #rakutenLimitedId_cart      ← カートテーブル
    └ #rakutenLimitedId_aroundCart ← カートボタン・価格・選択肢
#item-page-app                    ← レコメンド欄（React アプリ）
```

問題の本質：商品画像が縦に積み上がり、カートにたどり着くまでに大量のスクロールが必要になる。

## アプローチ

`#pagebody` を非表示にして新しい `#sre-page` ラッパーを挿入し、スライドショーと購入セクションのみを表示する。

```
#rakutenLimitedId_header（変更なし）
#sre-page（新規挿入）
    └ ショップトップリンク
    └ スライドショー（約 500px）
    └ 購入セクション（#pagebody から移動）
#pagebody（display: none）
.pc-item-page-header（display: none）
#item-page-app（display: none）
```

## 実装方針

### 対象 URL

```
https://item.rakuten.co.jp/*/*
```

### content script の処理フロー

1. 画像収集（以下の順に試みる）
   - `[class*="image-wrapper--"]` の中の `img` を収集（3枚以上あれば採用）
   - フォールバック: `.sale_desc` 内の `img` を収集（2枚以上あれば採用）
2. スライドショー要素を生成
3. `findPurchaseSection()` で購入セクションを特定（`#rakutenLimitedId_aroundCart` と `#rakutenLimitedId_cart` の最近共通祖先）
4. `#sre-page` ラッパーを生成し、ショップリンク・スライドショー・購入セクションを配置
5. `#pagebody` の直後に `#sre-page` を挿入し、`#pagebody` を `display: none` にする
6. `.pc-item-page-header`・`#item-page-app` を `display: none` にする
7. `ResizeObserver` で購入セクションのリサイズを監視し、スライドショー幅を動的に同期する

### 画像の解像度

各 `img` に対して以下の優先順位で最高解像度の URL を選択する。

1. `srcset` 属性が存在する場合、最大幅（`w` ディスクリプタ）の URL を使用
2. `src` からクエリパラメータをすべて除去（`?_ex=WxH` 等のリサイズパラメータを削除）

### スライドショーの仕様

- 画像は1枚ずつ表示（左右ボタンで切り替え）
- サムネイル一覧を下部に表示（クリックで移動）、アクティブなサムネイルを中央にスクロール
- キーボード操作対応（← →、Esc でライトボックスを閉じる）
- 現在の枚数表示（例: `3 / 25`）
- 画像クリックでライトボックス（拡大表示）を開く
- ライトボックス表示中は `#rakutenLimitedId_header` を `display: none`、`#chat_widget` の `z-index` を `-1` にして背面に隠す
- スライドショーの横幅は購入セクションの横幅に合わせる（`ResizeObserver` で動的追従）

### ファイル構成

```
src/
├── manifest.json       # 拡張機能マニフェスト
├── content.ts          # DOM操作・スライドショー生成（TypeScript）
├── content.css         # スライドショーのスタイル
└── icons/

dist/                   # ビルド成果物（Chrome に読み込む）
├── manifest.json
├── content.js          # esbuild でバンドル済み
├── content.css
└── icons/

build.mjs               # esbuild ビルドスクリプト
package.json
tsconfig.json
```

ビルドコマンド:

```
npm run build   # 一回ビルド
npm run watch   # ファイル変更を監視して自動ビルド
```

## 考慮事項

### 画像ソースが存在しない場合

どちらの収集方法でも条件枚数を満たす画像が見つからない場合は処理を中断し、ページを改変しない。

### ページのレンダリングタイミング

content script は `document_idle` で実行する。一部コンテンツ（`#item-page-app` 等）が非同期で描画されるが、非表示にするだけであるため動的な待機は不要。

### manifest.json の主要設定

```json
{
  "manifest_version": 3,
  "permissions": [],
  "content_scripts": [{
    "matches": ["https://item.rakuten.co.jp/*/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }]
}
```
