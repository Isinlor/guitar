# Agent Instructions

This repository uses a Makefile to automate common tasks, including running checks.

## Mandatory Checks

Before submitting any changes, you **MUST** run the full suite of checks to ensure code quality and prevent regressions.

Run the following command in the root of the repository:

```bash
make checks
```

This command performs the following:
1.  **Linting**: Checks for code style issues (`npm run lint`).
2.  **Type Checking**: Verifies TypeScript types (`npm run type-check`).
3.  **Unit Tests**: Runs Vitest unit tests (`npx vitest run`).
4.  **E2E Tests**: Runs Playwright end-to-end tests (`npx playwright test`).

If any of these checks fail, you must fix the issues before submitting.

## Troubleshooting

If `make checks` fails due to missing dependencies, it usually attempts to install them automatically (including Playwright browsers). If you encounter issues, try running:

```bash
npm ci
```

and then run `make checks` again.
