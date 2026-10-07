default: help

help: ## Display available commands
	@grep -Fh "##" $(MAKEFILE_LIST) | grep -Fv "grep -F" | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install

start: ## Start application in development (http://localhost:9999)
	npm run dev

build: ## Build application for production
	npm run build

preview: build ## Preview production build locally
	npm run preview

og: ## Regenerate the social share image public/og.png (needs google-chrome)
	@npx vite --port 9997 --strictPort >/dev/null 2>&1 & echo $$! > .og.pid; sleep 3
	google-chrome --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 \
		--window-size=1200,630 --screenshot=public/og.png http://localhost:9997/og.html
	@kill `cat .og.pid` && rm .og.pid

lint: ## Run ESLint
	npm run lint

knip: ## Find unused files, exports and dependencies
	npm run knip

format: ## Format code with Prettier
	npm run format

format-check: ## Check formatting with Prettier
	npm run format:check

typecheck: ## Run TypeScript type checker
	npx tsc -b --noEmit

test: ## Run unit and component tests
	npm run test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

fix: format lint ## Format and lint all code

check: build lint typecheck knip test ## Run all checks (build, lint, typecheck, knip, tests)
	@echo "All checks passed!"

clean: ## Remove build artifacts and dependencies
	rm -rf dist node_modules coverage
