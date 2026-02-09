# 💕 Valentine — Interactive Valentine Card

A Next.js mini-app: the question "Will you be my Valentine?" and photos assembling into a heart shape (WebGL).

## Features

- Form with question and "Yes" / "No" buttons (the "No" button runs away from the cursor)
- After "Yes" — animation: photos assemble along the heart outline (WebGL)
- Photos load from `public/photos` folder via `manifest.json` list
- Photo aspect ratios preserved on cards
- **Desktop:** hover — card scales up; click — photo opens in overlay
- **Mobile:** tap card — enlarged photo; close button to dismiss
- Desktop: heart on background; mobile: heart inside the card

## Requirements

- Node.js 18+
- npm / yarn / pnpm

## Getting Started

```bash
# Install dependencies
npm install

# Development mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding Photos

1. Put photos (JPG, PNG, WebP) in **`public/photos/`**.
2. Edit **`public/photos/manifest.json`** — array of file names in order:

```json
["1.jpeg", "2.jpeg", "photo.png"]
```

3. Number of cards in the heart = number of loaded photos. If `manifest.json` is empty, colored placeholders are shown.

See `public/photos/README.md` for more details.

## Build & Production

```bash
npm run build
npm run start
```

## Deploy on Vercel

1. Push the repository to GitHub.
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → import repository.
3. **Deploy** (Vercel auto-detects Next.js).

Via CLI: `npm i -g vercel` → run `vercel` in the project folder.

## Stack

- [Next.js](https://nextjs.org) (App Router, SSR)
- React 19
- TypeScript
- Tailwind CSS
- WebGL (heart cards)

## License

MIT

---

© Valentine. Все права защищены.
