.DEFAULT_GOAL := help
.PHONY: help install libs frontend build start run dev test test-go test-frontend type-check lint hsk model translate-model practice-fixtures clean

# Pronunciation-assessment model (a 9M Conformer-CTC grader, INT8). The weights
# are third-party and carry no stated licence, so they are downloaded rather than
# committed: `make model` puts them in a gitignored directory and the build
# embeds whatever is there. Without them the practice buttons hide themselves.
PRACTICE_MODEL_URL := https://simedw.com/projects/ear/tiny_int8.onnx
PRACTICE_VOCAB_URL := https://simedw.com/projects/ear/vocab.json
PRACTICE_DIR := frontend/public/models

# The translation model: HY-MT 1.5 1.8B, Q4_K_M. It lives beside the app (not in
# git: 1.1 GB) and is loaded in-process at startup. The checksum is the file
# Hugging Face serves for this revision; a mismatched download is refused rather
# than fed to the engine.
MODELS_DIR := models
TRANSLATE_MODEL := $(MODELS_DIR)/HY-MT1.5-1.8B-Q4_K_M.gguf
TRANSLATE_MODEL_URL := https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF/resolve/main/HY-MT1.5-1.8B-Q4_K_M.gguf
TRANSLATE_MODEL_SHA256 := 4383ac0c3c8e476de98ff979c2a3f069f8c4fb385e7860cf2d28da896cc477c7

# HSK 3.0 vocabulary source, pinned to the commit the embedded file was made from.
HSK_SOURCE_URL := https://raw.githubusercontent.com/TheOpenDictionary/complete-hsk-vocabulary/d247b61ddd803a974cb12799e9b6a168c48ef093/complete.min.json
HSK_SOURCE_COMMIT := d247b61ddd803a974cb12799e9b6a168c48ef093

help:
	@echo "install     frontend dependencies"
	@echo "libs        fetch the llama.cpp libraries the binary embeds (once)"
	@echo "frontend    build the Alpine app into frontend/dist"
	@echo "build       embed the frontend and the libraries, build bin/seta"
	@echo "start       one command: fetch what is missing, build, serve on :8080"
	@echo "run         build, then serve on :8080 (the model is in the process)"
	@echo "dev         Go service on :8080 + Vite on :5173 proxying /api"
	@echo "test        Go tests (-race) + frontend tests + type check"
	@echo "lint        go vet + gofmt"
	@echo "hsk         regenerate the embedded HSK word list"
	@echo "model       fetch the pronunciation-assessment model (not committed)"
	@echo "translate-model  fetch the translation weights (1.1 GB, not committed)"
	@echo "practice-fixtures  make the macOS sample clips the practice test uses"
	@echo "clean       remove build output"

install:
	npm --prefix frontend install

# The llama.cpp shared libraries (12 MB) that engine_libs.go embeds. Committed
# nowhere: fetched for the machine you build on, then carried inside the binary.
libs:
	@./scripts/fetch-libs.sh

frontend: install
	npm --prefix frontend run build

build: libs frontend
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
# both. The model is in the process, exactly like `make run`.
dev: build
	@echo "→ edit here:  http://localhost:5173  (live reload, /api → :8080)"
	@echo "→ built app:  http://localhost:8080  (what the binary actually serves)"
	@./bin/seta & APP=$$!; trap 'kill $$APP 2>/dev/null' EXIT INT TERM; \
		npm --prefix frontend run dev

test: test-go test-frontend type-check

# The engine's end-to-end test loads the real weights when they are on the
# machine (make translate-model) and skips otherwise; -short skips it too.
test-go: libs
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

# The translation weights, fetched once into models/ and reused by the engine.
translate-model:
	@mkdir -p $(MODELS_DIR)
	@echo "fetching $(TRANSLATE_MODEL) (~1.1 GB, once)"
	@curl -fsSL "$(TRANSLATE_MODEL_URL)" -o "$(TRANSLATE_MODEL).part"
	@echo "$(TRANSLATE_MODEL_SHA256)  $(TRANSLATE_MODEL).part" | shasum -a 256 -c - >/dev/null \
		|| { echo "error: checksum mismatch — delete $(TRANSLATE_MODEL).part and retry"; exit 1; }
	@mv "$(TRANSLATE_MODEL).part" "$(TRANSLATE_MODEL)"
	@echo "translation model ready: $$(du -h "$(TRANSLATE_MODEL)" | cut -f1)"

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
