#!/usr/bin/env bash
#
# seta — one command to run it locally.
#
#   make start          (which runs this after building)
#   ./scripts/start.sh  (if the binary is already built)
#
# Checks the two payloads and runs the app. The translation model is inside that
# process, so there is no model server to start, wait for, or shut down: Ctrl-C
# stops everything. Nothing here touches the network once the payloads exist,
# and `make build` has already carried the libraries into the binary.
#
# Overrides:
#   ADDR        where to serve the app (default :8080)
#   MODEL_PATH  the GGUF to load (default: models/…, then the Hugging Face cache)
#   DATA_DIR    where the library lives (default data/)
#   GPU_LAYERS  layers to offload, or 0/cpu to stay on the CPU (default: all)

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

addr="${ADDR:-:8080}"
say() { printf '%s\n' "$*"; }

# --- 1. what has to be on disk ----------------------------------------------

# The engine prefers $MODEL_PATH and models/, and otherwise reuses a copy that
# llama-server already downloaded into the Hugging Face cache — so only fetch
# when none of those exist.
model_present() {
  [[ -n "${MODEL_PATH:-}" ]] && return 0
  compgen -G "models/HY-MT1.5-1.8B-Q4_K_M.gguf" >/dev/null && return 0
  compgen -G "${HF_HOME:-$HOME/.cache/huggingface}/hub/models--tencent--HY-MT1.5-1.8B-GGUF/snapshots/*/HY-MT1.5-1.8B-Q4_K_M.gguf" >/dev/null && return 0
  return 1
}

if model_present; then
  say "→ translation model found"
else
  say "→ fetching the translation model (~1.1 GB, once)"
  make translate-model
fi

if [[ ! -f frontend/public/models/tiny_int8.onnx ]]; then
  say "→ fetching the pronunciation model (~14 MB, once)"
  make practice-model || say "  (could not fetch it — practice stays hidden, everything else works)"
fi

# --- 2. run -----------------------------------------------------------------

say
say "   seta is at http://localhost${addr}"
say "   the model loads in the background; the tab says so until it is ready"
say "   Ctrl-C stops everything (there is nothing else running)"
say

export ADDR="$addr"
exec ./bin/seta
