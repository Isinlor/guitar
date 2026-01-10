.DEFAULT_GOAL := all
CHROMIUM_EXECUTABLE ?= $(shell command -v google-chrome || command -v chromium || command -v chromium-browser || true)

# Install project dependencies
install: node_modules

# Build the project
build: install
	npm run build

# Run all checks
checks: lint type-check test

# Run unit and e2e tests
test: vitest playwright

# Run Vitest unit tests
vitest: install
	npx vitest run

# Run Playwright integration tests
playwright: playwright-install
	PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(CHROMIUM_EXECUTABLE) PLAYWRIGHT_HEADLESS=1 npx playwright test

# Generate Playwright code for dev server
playwright-codegen: playwright-install
	npx playwright codegen http://localhost:5173

# Install Playwright browser
playwright-install: install
ifneq ($(CHROMIUM_EXECUTABLE),)
	@echo "Using system Chromium at $(CHROMIUM_EXECUTABLE)"
else
	@echo "No system Chromium found; attempting Playwright Chromium download."
	@set -e; \
	npx playwright install chromium || { \
		echo "Playwright download failed; installing Google Chrome as a fallback."; \
		sudo apt-get update; \
		curl -L -o /tmp/google-chrome-stable_current_amd64.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb; \
		sudo apt-get install -y /tmp/google-chrome-stable_current_amd64.deb; \
	}
endif

# Lint the codebase
lint: install
	npm run lint

# Type check the codebase
type-check: install
	npm run type-check

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
all: install checks build

node_modules:
	npm ci
