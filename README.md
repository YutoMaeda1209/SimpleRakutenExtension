[日本語 (JA) / [English (EN)](/README-en.md)]

# Simple Rakuten Extension

楽天市場の商品ページを、スライドショー＋購入セクションが最上部に来るレイアウトに変換する Chrome 拡張機能です。

## 機能

- **商品画像のスライドショー化** — 商品画像を1枚ずつ表示。左右ボタン・サムネイル・キーボード（← →）で操作できます
- **ライトボックス** — スライドショーの画像をクリックすると高解像度版が拡大表示されます
- **購入セクションを最上部に移動** — サイズ・カラー選択、カートボタンにすぐアクセスできます
- **ショップトップへのリンク** — ページ上部にショップのトップページへのリンクを表示します
- **元のページはそのまま下部に表示** — 商品詳細・レビュー・ショップ情報はスクロールすれば確認できます

## インストール

### Chrome ウェブストア（準備中）

### 手動インストール（開発版）

1. このリポジトリをクローンする

```
git clone https://github.com/YutoMaeda/SimpleRakutenExtension.git
cd SimpleRakutenExtension
```

2. 依存関係をインストールしてビルドする

```
npm install
npm run build
```

3. Chrome で `chrome://extensions` を開き、「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、`dist/` フォルダを選択する

## 開発

```bash
npm run build   # ビルド（minify あり）
```

ソースコードは `src/` 以下を編集してください。ビルド後の成果物は `dist/` に出力されます。Chrome には `dist/` フォルダを読み込ませてください。

```
src/
├── manifest.json   # 拡張機能マニフェスト
├── content.ts      # メインスクリプト（TypeScript）
└── content.css     # スタイル

dist/               # ビルド成果物（Chrome に読み込む）
```

## 対象ページ

```
https://item.rakuten.co.jp/*/*
```
