# Theme Scheme Guide for LLM

This document is an implementation playbook for creating a new full-site color scheme in `velkonix-ui-v2`.

Use it when an LLM is asked to add or tune a theme variant.

## Goal

Add a new internal theme that updates colors on **all UI elements** through design tokens (not per-component hardcoded colors).

## Source of Truth

- Global tokens and theme overrides live in:
  - `src/styles/index.css`
- Theme activation is done in:
  - `src/main.tsx` via `VITE_THEME` and `data-theme` on `<html>`
- Hardcoded color guardrail:
  - `npm run lint:colors`
  - allows color literals only in `src/styles/index.css`

## Non-Negotiable Rules

1. Do not introduce raw color literals in component/page CSS modules.
2. Add or tune colors only through token variables in `src/styles/index.css`.
3. Keep semantic meaning of tokens:
   - backgrounds, text, borders, status, accent, glow, gradients
4. Preserve interaction states:
   - hover, active, focus-visible, disabled
5. New theme must work on all pages and key UI states.

## Mandatory Token Set

When adding a new theme, define all of these inside `[data-theme="<theme-name>"]`:

- Background:
  - `--bg-primary-rgb`, `--bg-secondary-rgb`, `--bg-tertiary-rgb`, `--bg-overlay-rgb`
  - `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-overlay`
- Accent:
  - `--accent-primary-rgb`, `--accent-hover-rgb`, `--accent-active-rgb`, `--accent-glow-rgb`
  - `--accent-primary`, `--accent-hover`, `--accent-active`, `--accent-glow`
- Text:
  - `--text-primary-rgb`, `--text-secondary-rgb`, `--text-muted-rgb`, `--text-disabled-rgb`, `--text-on-accent-rgb`
  - `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`, `--text-on-accent`
- Borders:
  - `--border-subtle-rgb`, `--border-accent-rgb`
  - `--border-subtle`, `--border-accent`
- Status:
  - `--success-rgb`, `--error-rgb`, `--warning-rgb`, `--info-rgb`
  - `--success`, `--error`, `--warning`, `--info`
- Effects:
  - `--gradient-accent` (required)

Note: RGB token format must use commas, for example:
- `--accent-primary-rgb: 255, 170, 60;`

This is required because many styles use `rgba(var(--token-rgb), alpha)`.

## Theme Block Template

Copy and fill:

```css
[data-theme="new-theme-name"] {
  --theme-name: "new-theme-name";

  --bg-primary-rgb: 0, 0, 0;
  --bg-secondary-rgb: 0, 0, 0;
  --bg-tertiary-rgb: 0, 0, 0;
  --bg-overlay-rgb: 0, 0, 0;
  --bg-primary: rgb(0, 0, 0);
  --bg-secondary: rgb(0, 0, 0);
  --bg-tertiary: rgb(0, 0, 0);
  --bg-overlay: rgb(0, 0, 0);

  --accent-primary-rgb: 0, 0, 0;
  --accent-hover-rgb: 0, 0, 0;
  --accent-active-rgb: 0, 0, 0;
  --accent-glow-rgb: 0, 0, 0;
  --accent-primary: rgb(0, 0, 0);
  --accent-hover: rgb(0, 0, 0);
  --accent-active: rgb(0, 0, 0);
  --accent-glow: rgb(0, 0, 0);

  --text-primary-rgb: 0, 0, 0;
  --text-secondary-rgb: 0, 0, 0;
  --text-muted-rgb: 0, 0, 0;
  --text-disabled-rgb: 0, 0, 0;
  --text-on-accent-rgb: 0, 0, 0;
  --text-primary: rgb(0, 0, 0);
  --text-secondary: rgb(0, 0, 0);
  --text-muted: rgb(0, 0, 0);
  --text-disabled: rgb(0, 0, 0);
  --text-on-accent: rgb(0, 0, 0);

  --border-subtle-rgb: 0, 0, 0;
  --border-accent-rgb: 0, 0, 0;
  --border-subtle: rgb(0, 0, 0);
  --border-accent: rgb(0, 0, 0);

  --success-rgb: 0, 0, 0;
  --error-rgb: 0, 0, 0;
  --warning-rgb: 0, 0, 0;
  --info-rgb: 0, 0, 0;
  --success: rgb(0, 0, 0);
  --error: rgb(0, 0, 0);
  --warning: rgb(0, 0, 0);
  --info: rgb(0, 0, 0);

  --gradient-accent: linear-gradient(180deg, rgb(0, 0, 0), rgb(0, 0, 0));
}
```

## How to Add a Theme

1. Add a new `[data-theme="<name>"]` block in `src/styles/index.css`.
2. Set `VITE_THEME=<name>` in `.env` (or runtime env) for local check.
3. If this is a new supported theme name, update `SUPPORTED_THEMES` in `src/main.tsx`.
4. Do not edit component colors directly unless you are replacing hardcoded literals with existing tokens.

## Validation Flow

Run:

```bash
npm run lint:colors
npm run build
```

Optional additional check:

```bash
VITE_THEME=<name> npm run build
```

## Visual Checklist

Verify at least:

- Home page
- Markets
- Dashboard
- Staking
- Asset page
- Modals and overlays
- Buttons (primary/secondary/ghost/danger/disabled)
- Focus-visible rings
- Status tones (success/error/warning/info)
- Table hover/active rows

## Prompt Snippet for LLM

Use this in tasks:

```text
Add a new internal theme variant in src/styles/index.css using semantic token overrides.
Do not add raw colors to CSS modules.
Keep RGB tokens comma-separated for rgba(var(--token-rgb), alpha) compatibility.
Update src/main.tsx supported theme names if needed.
Run npm run lint:colors and npm run build.
```
