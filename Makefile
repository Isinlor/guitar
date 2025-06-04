.DEFAULT_GOAL := all

# Install project dependencies
install:
	npm ci

# Build the project
build:
	npm run build

# Run unit and e2e tests
test: vitest

# Run Vitest unit tests
vitest:
	npx vitest run

# Run Playwright integration tests
playwright:
	npx playwright test

playwright-codegen:
	npx playwright codegen http://localhost:5173

playwright-install:
	npx playwright install

# Lint the codebase
lint:
	npm run lint

# Format the codebase
format:
	npm run format

# Start the development server
dev:
	npm run dev

# Run all common tasks: install, lint, test, and build
all: install lint test build
