.DEFAULT_GOAL := help
.PHONY: help install libs build start dev test test-go lint clean \
        translate-model practice-model practice-fixtures hsk

# What seta needs that is not in git, and where it lives. Both are fetched once
# into gitignored directories and carried into the app (one embedded, one read
# at startup), so a build never touches the network and never needs Docker.
MODELS_DIR := models
TRANSLATE_MODEL := $(MODELS_DIR)/HY-MT1.5-1.8B-Q4_K_M.gguf
TRANSLATE_MODEL_URL := https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF/resolve/main/HY-MT1.5-1.8B-Q4_K_M.gguf
TRANSLATE_MODEL_SHA256 := 4383ac0c3c8e476de98ff979c2a3f069f8c4fb385e7860cf2d28da896cc477c7

# The pronunciation-assessment model (a 9M Conformer-CTC grader, INT8). Third
# party, no stated licence, so it is downloaded rather than committed: the build
# embeds whatever is there, and without it the practice buttons hide themselves.
PRACTICE_DIR := frontend/public/models
PRACTICE_MODEL_URL := https://simedw.com/projects/ear/tiny_int8.onnx
PRACTICE_VOCAB_URL := https://simedw.com/projects/ear/vocab.json

# HSK 3.0 vocabulary source, pinned to the commit the embedded file was made from.
HSK_SOURCE_URL := https://raw.githubusercontent.com/TheOpenDictionary/complete-hsk-vocabulary/d247b61ddd803a974cb12799e9b6a168c48ef093/complete.min.json
HSK_SOURCE_COMMIT := d247b61ddd803a974cb12799e9b6a168c48ef093

help:
	@echo "every day"
	@echo "  make start             build, fetch what is missing, serve on :8080"
	@echo "  make dev               the Go service + Vite on :5173 with live reload"
	@echo "  make test              Go (-race) + frontend + type check"
	@echo "  make test-go           Go only, for a faster loop"
	@echo "  make lint              go vet + gofmt"
	@echo "  make clean             remove build output"
	@echo
	@echo "the payloads"
	@echo "  make libs              llama.cpp libraries the binary embeds (12 MB)"
	@echo "  make translate-model   the translation weights (1.1 GB)"
	@echo "  make practice-model    the pronunciation model (14 MB)"
	@echo "  make practice-fixtures the macOS clips a gated test uses"
	@echo
	@echo "the rest"
	@echo "  make build             the binary alone"
	@echo "  make install           frontend dependencies"
	@echo "  make hsk               regenerate the embedded HSK word list"

install:
	@npm --prefix frontend install --no-audit --no-fund --loglevel=error

# The llama.cpp shared libraries engine_libs.go embeds: fetched for the machine
# you build on, never committed.
libs:
	@./scripts/fetch-libs.sh

build: install libs
	npm --prefix frontend run build
	@mkdir -p bin
	# Rebuild the embed directory from scratch: without this, hashed bundles
	# from earlier builds ride along inside the binary forever.
	@rm -rf backend/dist && mkdir -p backend/dist && touch backend/dist/.gitkeep
	cp -R frontend/dist/. backend/dist/
	cd backend && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../bin/seta .

# The one command. The script only checks the two payloads and execs the binary:
# build has already run, and the model itself loads in the background once it is.
start: build
	@./scripts/start.sh

# Two processes on purpose: Vite serves the app from source with HMR and
# proxies /api to the Go service (see frontend/vite.config.ts). Ctrl-C stops
# both.
dev: build
	@echo "→ edit here:  http://localhost:5173  (live reload, /api → :8080)"
	@echo "→ built app:  http://localhost:8080  (what the binary actually serves)"
	@./bin/seta & APP=$$!; trap 'kill $$APP 2>/dev/null' EXIT INT TERM; \
		npm --prefix frontend run dev

test: install test-go
	npm --prefix frontend run test
	npm --prefix frontend run type-check

# The engine's end-to-end test loads the real weights when they are on the
# machine (make translate-model) and skips otherwise.
test-go: libs
	cd backend && go test -race ./...

lint:
	cd backend && go vet ./...
	@unformatted=$$(gofmt -l backend); \
		if [ -n "$$unformatted" ]; then echo "gofmt needed:"; echo "$$unformatted"; exit 1; fi
	@echo "lint ok"

clean:
	rm -rf frontend/dist bin
	@rm -rf backend/dist && mkdir -p backend/dist && touch backend/dist/.gitkeep

# The translation weights, fetched once into models/ and validated before the
# engine ever sees them. A file target, so running it again costs nothing.
translate-model: $(TRANSLATE_MODEL)

$(TRANSLATE_MODEL):
	@mkdir -p $(dir $@)
	@echo "fetching $@ (~1.1 GB, once)"
	@curl -fsSL "$(TRANSLATE_MODEL_URL)" -o "$@.part"
	@echo "$(TRANSLATE_MODEL_SHA256)  $@.part" | shasum -a 256 -c - >/dev/null \
		|| { echo "error: checksum mismatch — delete $@.part and retry"; exit 1; }
	@mv "$@.part" "$@"
	@echo "translation model ready: $$(du -h "$@" | cut -f1)"

practice-model: $(PRACTICE_DIR)/tiny_int8.onnx $(PRACTICE_DIR)/vocab.json

$(PRACTICE_DIR)/tiny_int8.onnx:
	@mkdir -p $(dir $@)
	@echo "fetching $(PRACTICE_MODEL_URL)"
	@curl -fsSL "$(PRACTICE_MODEL_URL)" -o "$@"

$(PRACTICE_DIR)/vocab.json:
	@mkdir -p $(dir $@)
	@echo "fetching $(PRACTICE_VOCAB_URL)"
	@curl -fsSL "$(PRACTICE_VOCAB_URL)" -o "$@"

# Sample clips for the gated practice test: macOS voice → 16 kHz mono WAV.
practice-fixtures:
	@mkdir -p frontend/tests/fixtures
	@set -e; for spec in "nihao:你好" "thx:谢谢" "wrongtone:你号" "wohenhao:我很好，谢谢" "long:这个东西太贵了"; do \
		name=$${spec%%:*}; text=$${spec#*:}; \
		say -v Tingting -o /tmp/$$name.aiff "$$text"; \
		afconvert -f WAVE -d LEI16@16000 -c 1 /tmp/$$name.aiff frontend/tests/fixtures/$$name.wav; \
		rm -f /tmp/$$name.aiff; \
		echo "frontend/tests/fixtures/$$name.wav"; \
	done

# Regenerate backend/data/hsk.json from the upstream dataset. The output is
# committed: builds stay offline, and the vocabulary only moves when you move it.
hsk:
	@tmp=$$(mktemp -d); trap 'rm -rf "$$tmp"' EXIT; \
		echo "fetching $(HSK_SOURCE_URL)"; \
		curl -fsSL "$(HSK_SOURCE_URL)" -o "$$tmp/complete.min.json"; \
		cd backend && go run ./tools/hskgen -in "$$tmp/complete.min.json" -out data/hsk.json \
			-source-url "$(HSK_SOURCE_URL)" -source-commit "$(HSK_SOURCE_COMMIT)"
