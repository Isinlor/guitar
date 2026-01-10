# Agent Instructions

- Always run `make checks` from the repository root before finalizing changes.
- If the code is working correctly, these checks should complete successfully.

## Running checks successfully

1. From the repo root, run:
   ```sh
   make checks
   ```
2. This target runs linting, type-checking, unit tests, and Playwright tests.
3. If Playwright cannot find a system Chromium, the Makefile will attempt to install one automatically. Ensure the environment allows the install step (it uses `sudo apt-get` and downloads Google Chrome) so Playwright tests can run.
