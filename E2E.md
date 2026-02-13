# E2E Runbook (Playwright)

This document defines a stable way to run end-to-end tests without repeated Playwright installation loops.

## One-time Bootstrap

Run once per machine or after clearing Playwright browser cache:

```bash
npm ci
npm run e2e:install
```

## Local Run

```bash
npm run test:e2e
```

Notes:
- Tests start the Vite app on `127.0.0.1:4173` through Playwright `webServer`.
- If the port is busy, the run should fail fast.
- Scripts use `PLAYWRIGHT_BROWSERS_PATH=0`, so browsers are installed in project-local cache.

## CI Run

```bash
npm ci
npm run e2e:install
npm run test:e2e:ci
```

## Agent Execution Policy

- For interactive UI verification inside Cursor, use MCP browser tools (`cursor-ide-browser`) first.
- Do not call `playwright install` by default.
- Only call `npm run e2e:install` after explicit "browser missing" errors.
- Never retry install in a loop. If install fails once, switch to diagnostics.

## Troubleshooting Checklist

1. **Browser missing**
   - Symptom: Playwright reports missing executable.
   - Action: run `npm run e2e:install` once.

2. **Port conflict**
   - Symptom: `webServer` fails to bind on `4173`.
   - Action: stop the conflicting process and rerun tests.

3. **Timeouts**
   - Symptom: navigation or assertions exceed timeout.
   - Action: inspect HTML report and trace, then fix flaky selectors or app startup issues.

4. **Flaky tests**
   - Symptom: pass/fail variance across runs.
   - Action: inspect `trace`, `screenshot`, `video` artifacts from failed retries and harden selectors/waits.

## Stability Gate

Treat setup as stable when:
- `npm run test:e2e` completes successfully in 3-5 consecutive runs.
- No implicit Playwright install happens during regular test runs.
