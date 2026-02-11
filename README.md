# Velkonix UI v2

Bootstrap project for the Velkonix DeFi UI.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint:colors`
- `npm run test`

## Internal Theme Switching
- Theme is controlled by `VITE_THEME` in env.
- Supported values:
  - `amber` (default)
  - `experimental-1`
- Example:
  - `VITE_THEME=experimental-1 npm run dev`

The app applies `<html data-theme="...">` during bootstrap, and all UI colors must come from tokens in `src/styles/index.css`.