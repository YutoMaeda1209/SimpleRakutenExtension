[[日本語 (JA)](/README.md) / English (EN)]

# Simple Rakuten Extension

A Chrome extension that reorganizes Rakuten product pages so the slideshow and purchase section appear at the top.

## Features

- **Image slideshow** — Displays product images one at a time. Navigate with prev/next buttons, thumbnails, or keyboard arrow keys
- **Lightbox** — Click the slideshow image to view the full-resolution version enlarged
- **Purchase section at the top** — Size/color selectors and the cart button are immediately accessible
- **Shop top link** — A link to the shop's top page is shown at the top of the page
- **Original page preserved below** — Product details, reviews, and shop information remain visible by scrolling down

## Installation

### Chrome Web Store (coming soon)

### Manual installation (development build)

1. Clone the repository

```
git clone https://github.com/YutoMaeda/SimpleRakutenExtension.git
cd SimpleRakutenExtension
```

2. Install dependencies and build

```
npm install
npm run build
```

3. Open `chrome://extensions` in Chrome and enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` folder

## Development

```bash
npm run build   # Build (with minification)
```

Edit source files under `src/`. Build output goes to `dist/`, which is what Chrome loads.

```
src/
├── manifest.json   # Extension manifest
├── content.ts      # Main script (TypeScript)
└── content.css     # Styles

dist/               # Build output (loaded by Chrome)
```

## Target pages

```
https://item.rakuten.co.jp/*/*
```
