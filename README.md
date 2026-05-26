# Velkonix UI v2

Bootstrap project for the Velkonix DeFi UI.

## Package manager
This project uses **pnpm** exclusively. `npm` and `yarn` are disallowed (a `preinstall` hook enforces this). Versions are pinned without `^`.

Install: `pnpm install`

## Scripts
- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm lint:colors`
- `pnpm test`

## Internal Theme Switching
- Theme is controlled by `VITE_THEME` in env.
- Supported values:
  - `blue` (default)
  - `amber`
- Example:
  - `VITE_THEME=blue pnpm dev`

The app applies `<html data-theme="...">` during bootstrap, and all UI colors must come from tokens in `src/styles/index.css`.
