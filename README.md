# guitar-vue

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Using the Makefile

This project includes a Makefile to simplify common development tasks. Here are some of the available targets:

*   `make all`: Installs dependencies, lints the code, runs tests, and builds the project. This is the default target.
*   `make install`: Installs project dependencies using `npm install`.
*   `make build`: Builds the project using `npm run build`.
*   `make test`: Runs unit and end-to-end tests.
*   `make lint`: Lints the codebase using ESLint.
*   `make format`: Formats the codebase using Prettier.
*   `make dev`: Starts the development server.

To use these targets, simply run `make <target_name>` in your terminal from the project root. For example, to build the project, you would run `make build`.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
make install
```

### Compile and Hot-Reload for Development

```sh
make dev
```

### Type-Check, Compile and Minify for Production

```sh
make build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
make vitest
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
make playwright-install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
make playwright
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
make lint
```
