# E2E Automation Policy

This project uses Playwright for E2E tests and Cursor MCP browser tools for interactive UI verification.

## Mandatory Agent Workflow

1. Use `cursor-ide-browser` MCP tools first for browser interactions during agent-driven UI checks.
2. Use Playwright test runner only via npm scripts in `package.json`.
3. Do not run `playwright install` unless a command explicitly fails with a "browser not installed" style error.
4. If install is required, run it once with `npm run e2e:install`; do not repeat in a loop.
5. After one failed install attempt, stop retrying and switch to diagnosis (versions, logs, cache, and permissions).

## Test Execution Rules

- Local E2E run: `npm run test:e2e`
- CI E2E run: `npm run test:e2e:ci`
- One-time browser bootstrap: `npm run e2e:install`
- Browser binaries are pinned to project-local cache via `PLAYWRIGHT_BROWSERS_PATH=0`.

## Failure Handling

- Prefer fail-fast behavior and bounded timeouts.
- If `webServer` cannot start, report the root cause and exit instead of waiting indefinitely.
- If a test is flaky, capture trace/screenshot/video artifacts and report the failing selector or route.
