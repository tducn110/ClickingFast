# Clicking Fast

React + PixiJS v8 mini game for tapping the requested fruits, avoiding hazards, chaining combos, and saving local leaderboard scores.

## Stack

- React 18 + Vite 6
- PixiJS v8 for the gameplay renderer
- Tailwind CSS + project CSS tokens
- Local storage for nickname, best score, settings, and leaderboard

## Run Locally

```bash
npm install
npm run dev
```

Common checks:

```bash
npm run typecheck
npm test
npm run build
```

## Production Notes

- No Firebase or backend environment variables are required.
- Gameplay screens and Pixi runtime are lazy-loaded from the menu.
- Large PNG assets were converted to WebP; original masters are kept in `assets-source/` and are not served by Vite.
- Background music is loaded after the first user interaction instead of on app mount.

## Gameplay

1. Enter a nickname on the menu.
2. Tap `Chơi ngay`.
3. Tap only the requested fruit before the timer ends.
4. Avoid hazards, collect power-ups, and keep the combo meter alive.
5. Use revive once per run or finish on the result screen.
