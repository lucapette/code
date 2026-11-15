.DEFAULT_GOAL := help
.PHONY: help install frontend build start run dev test test-go test-frontend type-check lint hsk model practice-fixtures clean

# Pronunciation-assessment model (a 9M Conformer-CTC grader, INT8). The weights
# are third-party and carry no stated licence, so they are downloaded rather than
# committed: `make model` puts them in a gitignored directory and the build
# embeds whatever is there. Without them the practice buttons hide themselves.
PRACTICE_MODEL_URL := https://simedw.com/projects/ear/tiny_int8.onnx
PRACTICE_VOCAB_URL := https://simedw.com/projects/ear/vocab.json
PRACTICE_DIR := frontend/public/models

# HSK 3.0 vocabulary source, pinned to the commit the embedded file was made from.
HSK_SOURCE_URL := https://raw.githubusercontent.com/TheOpenDictionary/complete-hsk-vocabulary/d247b61ddd803a974cb12799e9b6a168c48ef093/complete.min.json
HSK_SOURCE_COMMIT := d247b61ddd803a974cb12799e9b6a168c48ef093

help:
	@echo "install     frontend dependencies"
	@echo "frontend    build the Alpine app into frontend/dist"
	@echo "build       embed the frontend and build bin/seta"
	@echo "start       one command: model (llama.cpp) + practice model + app on :8080"
	@echo "run         build, then serve on :8080 (UPSTREAM_URL to override)"
	@echo "dev         Go service on :8080 + Vite on :5173 proxying /api"
	@echo "test        Go tests (-race) + frontend tests + type check"
	@echo "lint        go vet + gofmt"
	@echo "hsk         regenerate the embedded HSK word list"
	@echo "model       fetch the pronunciation-assessment model (not committed)"
	@echo "practice-fixtures  make the macOS sample clips the practice test uses"
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

# The one command: starts llama.cpp natively if nothing is serving the model,
# fetches the practice model once, then serves the app. No Docker.
start:
	@./scripts/start.sh

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

# Pronunciation practice: fetch the assessment model (kept out of git).
model:
	@mkdir -p $(PRACTICE_DIR)
	@echo "fetching $(PRACTICE_MODEL_URL)"
	@curl -fsSL "$(PRACTICE_MODEL_URL)" -o "$(PRACTICE_DIR)/tiny_int8.onnx"
	@echo "fetching $(PRACTICE_VOCAB_URL)"
	@curl -fsSL "$(PRACTICE_VOCAB_URL)" -o "$(PRACTICE_DIR)/vocab.json"
	@echo "practice model ready: $$(du -h "$(PRACTICE_DIR)/tiny_int8.onnx" | cut -f1)"

# Sample clips for the gated practice test: macOS voice → 16 kHz mono WAV.
# Generated locally and gitignored; without them that test skips.
practice-fixtures:
	@mkdir -p frontend/tests/fixtures
	@set -e; for spec in "nihao:你好" "thx:谢谢" "wrongtone:你号" "wohenhao:我很好，谢谢" "long:这个东西太贵了"; do \
		name=$${spec%%:*}; text=$${spec#*:}; \
		say -v Tingting -o /tmp/$$name.aiff "$$text"; \
		afconvert -f WAVE -d LEI16@16000 -c 1 /tmp/$$name.aiff frontend/tests/fixtures/$$name.wav; \
		rm -f /tmp/$$name.aiff; \
		echo "frontend/tests/fixtures/$$name.wav"; \
	done

lint:
	cd backend && go vet ./...
	@unformatted=$$(gofmt -l backend); \
		if [ -n "$$unformatted" ]; then echo "gofmt needed:"; echo "$$unformatted"; exit 1; fi
	@echo "lint ok"

clean:
	rm -rf frontend/dist bin
	@rm -rf backend/dist && mkdir -p backend/dist && touch backend/dist/.gitkeep
