.PHONY: build clean serve watch

# Default target
all: build

# Build the project
build:
	@echo "Compiling TypeScript..."
	@if command -v tsc >/dev/null 2>&1; then \
		tsc app.ts --target es2017 --lib es2017,dom --outFile app.js; \
	else \
		echo "TypeScript compiler not found. Installing..."; \
		npm install -g typescript; \
		tsc app.ts --target es2017 --lib es2017,dom --outFile app.js; \
	fi
	@echo "Build complete!"

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	@rm -f app.js
	@echo "Clean complete!"

# Serve the project locally
serve: build
	@echo "Starting local server on http://localhost:8000"
	@if command -v python3 >/dev/null 2>&1; then \
		python3 -m http.server 8000; \
	elif command -v python >/dev/null 2>&1; then \
		python -m SimpleHTTPServer 8000; \
	elif command -v node >/dev/null 2>&1; then \
		npx http-server -p 8000; \
	else \
		echo "No suitable HTTP server found. Please install Python or Node.js"; \
		exit 1; \
	fi

# Watch for changes and rebuild
watch:
	@echo "Watching for changes..."
	@while true; do \
		if [ app.ts -nt app.js ] 2>/dev/null || [ ! -f app.js ]; then \
			make build; \
		fi; \
		sleep 2; \
	done