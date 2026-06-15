# Refactor and Documentation Plan

This plan addresses the cleanup of unused assets and dependencies from the boilerplate, and outlines the new standardized `README.md` for the Ocean Tap project.

## User Review Required

> [!WARNING]
> This plan includes deleting a large number of unused files (mostly UI components from the initial boilerplate) and removing several unused packages from `package.json`. Please review the **Proposed Changes** below carefully to ensure no intended future dependencies are removed.

## Open Questions

> [!IMPORTANT]
> - Do you want to keep any specific UI components (like `dialog`, `dropdown-menu`, etc.) for future features even if they are currently unused? If you approve this plan, I will remove all of them to keep the codebase clean.
> - Should I remove `postcss.config.mjs` if we are fully relying on Vite + Tailwind default PostCSS handling, or leave it? (I will leave it for now unless you specify otherwise).

## Proposed Changes

### Documentation Updates

#### [MODIFY] README.md
Rewrite the README to reflect the actual "Ocean Tap" game using standardized formatting.
- **Title & Description:** Ocean Tap - A 2D fast-paced clicking game.
- **Tech Stack:** React, Vite, PixiJS, Tailwind CSS, Firebase (Auth & Firestore).
- **Features:** Google Authentication, Global Leaderboard, Audio/Settings control, PixiJS-powered gameplay.
- **Setup Instructions:** How to configure `.env.example`, install dependencies, and run the dev server.
- **Deployment:** Vercel deployment instructions.

### Codebase Cleanup (Refactor)

The project currently contains many boilerplate UI components and packages that are not used by the actual game. Cleaning these up will significantly reduce build times, bundle size, and IDE clutter.

#### [DELETE] Unused UI Components
Remove all unused `shadcn/ui` components from `src/app/components/ui/` such as:
- `accordion.tsx`, `alert.tsx`, `alert-dialog.tsx`, `aspect-ratio.tsx`, `breadcrumb.tsx`, `calendar.tsx`
- `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`
- `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `hover-card.tsx`, `input-otp.tsx`, `menubar.tsx`
- `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`
- `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`
- `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toggle.tsx`, `tooltip.tsx`
- `use-mobile.ts`

#### [DELETE] Unused CSS and Example Files
- `src/styles/globals.css` (The project uses `index.css`)
- `default_shadcn_theme.css`
- `src/app/components/game/ExamplePixiV8Scene.tsx` (Unused boilerplate scene)

#### [MODIFY] package.json (Dependency Cleanup)
Remove unused dependencies identified by `knip`:
- **UI Libraries:** `@radix-ui/react-*` (except the ones we use like `dialog` or `slot` if any), `lucide-react`, `cmdk`, `embla-carousel-react`, `sonner`, `vaul`
- **Other Unused Libraries:** `@mui/material`, `@emotion/react`, `@emotion/styled`, `react-router`, `recharts`, `react-slick`, `canvas-confetti`, `date-fns`, `framer-motion` (motion).

## Verification Plan

### Automated Tests
- Run `npm install` after removing dependencies to update `package-lock.json`.
- Run `npm run build` to ensure the project still compiles perfectly.
- Run `codegraph index` to re-index the cleaned-up workspace.

### Manual Verification
- Request the user to start the local dev server and ensure the game, UI, and Firebase integrations still work correctly.
