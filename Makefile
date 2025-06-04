.DEFAULT_GOAL := all

# Install project dependencies
install:
	npm ci

# Build the project
build:
	npm run build

# Run unit and e2e tests
test:
	npm run test:unit
	npm run test:e2e

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
