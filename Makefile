.DEFAULT_GOAL := all

# Install project dependencies
install: node_modules

# Build the project
build: install
	npm run build

# Run unit and e2e tests
test: vitest playwright

# Run Vitest unit tests
vitest: install
	npx vitest run

# Run Playwright integration tests
playwright: playwright-install
	npx playwright test

# Generate Playwright code for dev server
playwright-codegen: playwright-install
	npx playwright codegen http://localhost:5173

# Install Playwright browser
playwright-install: install
	npx playwright install chromium

# Lint the codebase
lint: install
	npm run lint

# Format the codebase
format: install
	npm run format

# Start the development server
dev: install
	npm run dev

# Start the build preview server
preview: install
	npm run preview

# Run all common tasks: install, lint, test, and build
all: install lint test build

node_modules:
	npm ci
