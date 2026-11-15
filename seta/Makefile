.DEFAULT_GOAL := help
.PHONY: help install frontend build run dev test test-go test-frontend type-check lint hsk clean

# HSK 3.0 vocabulary source, pinned to the commit the embedded file was made from.
HSK_SOURCE_URL := https://raw.githubusercontent.com/TheOpenDictionary/complete-hsk-vocabulary/d247b61ddd803a974cb12799e9b6a168c48ef093/complete.min.json
HSK_SOURCE_COMMIT := d247b61ddd803a974cb12799e9b6a168c48ef093

help:
	@echo "install     frontend dependencies"
	@echo "frontend    build the Alpine app into frontend/dist"
	@echo "build       embed the frontend and build bin/seta"
	@echo "run         build, then serve on :8080 (UPSTREAM_URL to override)"
	@echo "dev         Go service on :8080 + Vite on :5173 proxying /api"
	@echo "test        Go tests (-race) + frontend tests + type check"
	@echo "lint        go vet + gofmt"
	@echo "hsk         regenerate the embedded HSK word list"
	@echo "clean       remove build output"

install:
	npm --prefix frontend install

frontend: install
	npm --prefix frontend run build

build: frontend
	@mkdir -p bin
	# Rebuild the embed directory from scratch: without this, hashed bundles
	# from earlier builds ride along inside the binary forever.
	@rm -rf backend/dist && mkdir -p backend/dist && touch backend/dist/.gitkeep
	cp -R frontend/dist/. backend/dist/
	cd backend && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../bin/seta .

run: build
	./bin/seta

# Two processes on purpose: Vite serves the app from source with HMR and
# proxies /api to the Go service (see frontend/vite.config.ts). Ctrl-C stops
# both. Needs a model behind UPSTREAM_URL, exactly like `make run`.
dev: build
	@echo "→ edit here:  http://localhost:5173  (live reload, /api → :8080)"
	@echo "→ built app:  http://localhost:8080  (what the binary actually serves)"
	@./bin/seta & APP=$$!; trap 'kill $$APP 2>/dev/null' EXIT INT TERM; \
		npm --prefix frontend run dev

test: test-go test-frontend type-check

test-go:
	cd backend && go test -race ./...

test-frontend: install
	npm --prefix frontend run test

type-check: install
	npm --prefix frontend run type-check

# Regenerate backend/data/hsk.json from the upstream dataset. The output is
# committed: builds stay offline, and the vocabulary only moves when you move it.
hsk:
	@tmp=$$(mktemp -d); trap 'rm -rf "$$tmp"' EXIT; \
		echo "fetching $(HSK_SOURCE_URL)"; \
		curl -fsSL "$(HSK_SOURCE_URL)" -o "$$tmp/complete.min.json"; \
		cd backend && go run ./tools/hskgen -in "$$tmp/complete.min.json" -out data/hsk.json \
			-source-url "$(HSK_SOURCE_URL)" -source-commit "$(HSK_SOURCE_COMMIT)"

lint:
	cd backend && go vet ./...
	@unformatted=$$(gofmt -l backend); \
		if [ -n "$$unformatted" ]; then echo "gofmt needed:"; echo "$$unformatted"; exit 1; fi
	@echo "lint ok"

clean:
	rm -rf frontend/dist bin
	@rm -rf backend/dist && mkdir -p backend/dist && touch backend/dist/.gitkeep
