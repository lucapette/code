#!/usr/bin/env bash
#
# seta — one command to run it locally, no Docker.
#
#   ./scripts/start.sh          (or: make start)
#
# Does three things, in the only order that works:
#   1. makes sure a translation model is answering (starting llama.cpp natively
#      if nothing is on :8000 already),
#   2. fetches the pronunciation model once, so practice works,
#   3. builds the app and serves it on :8080.
#
# Ctrl-C stops the app, and the model too if this script started it.
#
# Overrides:
#   UPSTREAM_URL        where the model answers (default llama.cpp on :8000)
#   MODEL_PORT          port for the llama.cpp this script starts (default 8000)
#   LLAMA_SERVER_BIN    path to llama-server (default: whatever is on PATH)
#   MODEL_WAIT_SECONDS  how long to wait for the model (default 900: first run
#                       downloads ~1.1 GB)
#   ADDR                where to serve the app (default :8080)

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

model_port="${MODEL_PORT:-8000}"
upstream="${UPSTREAM_URL:-http://localhost:${model_port}/v1/chat/completions}"
addr="${ADDR:-:8080}"
wait_seconds="${MODEL_WAIT_SECONDS:-900}"
llama_bin="${LLAMA_SERVER_BIN:-$(command -v llama-server || true)}"
model_log="${TMPDIR:-/tmp}/seta-model.log"
app_pid=""
model_pid=""

cleanup() {
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill "$app_pid" 2>/dev/null || true
  fi
  if [[ -n "$model_pid" ]] && kill -0 "$model_pid" 2>/dev/null; then
    echo
    echo "→ stopping the model (it was started by this script)"
    kill "$model_pid" 2>/dev/null || true
    wait "$model_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

say() { printf '%s\n' "$*"; }

# --- 1. the model -----------------------------------------------------------

# Asking /v1/models is what the app's own readiness probe does.
model_answers() {
  curl -fsS --max-time 3 "http://localhost:${model_port}/v1/models" >/dev/null 2>&1
}

if curl -fsS --max-time 3 "${upstream%/chat/completions}/models" >/dev/null 2>&1; then
  say "→ model already answering at ${upstream}"
elif [[ -z "$llama_bin" ]]; then
  say "error: no translation model is running and llama-server is not installed."
  say
  say "Install it with:"
  say "    brew install llama.cpp"
  say "then run this again. (Docker instead: docker compose up)"
  exit 1
else
  say "→ starting llama.cpp on :${model_port} (log: ${model_log})"
  say "  first run downloads the ~1.1 GB model, after that it is cached"
  "$llama_bin" \
    -hf tencent/HY-MT1.5-1.8B-GGUF:Q4_K_M \
    --alias hy-mt-1.8b \
    --host 127.0.0.1 \
    --port "$model_port" \
    --ctx-size 8192 \
    --temp 0.7 --top-p 0.6 --top-k 20 --repeat-penalty 1.05 \
    >"$model_log" 2>&1 &
  model_pid=$!

  waited=0
  until curl -fsS --max-time 2 "http://localhost:${model_port}/v1/models" >/dev/null 2>&1; do
    if ! kill -0 "$model_pid" 2>/dev/null; then
      say "error: llama-server exited. Last lines of ${model_log}:"
      tail -n 20 "$model_log" || true
      exit 1
    fi
    if (( waited >= wait_seconds )); then
      say "error: the model did not come up within ${wait_seconds}s — see ${model_log}"
      exit 1
    fi
    if (( waited % 10 == 0 )); then
      printf '  … waiting for the model (%ss)\n' "$waited"
    fi
    sleep 2
    waited=$(( waited + 2 ))
  done
  say "→ model ready (${model_pid})"
fi

# --- 2. the pronunciation model (optional, but the point of practice) -------

if [[ ! -f frontend/public/models/tiny_int8.onnx ]]; then
  say "→ fetching the pronunciation model (~14 MB, once)"
  if ! make model; then
    say "  (could not fetch it — practice will stay hidden, everything else works)"
  fi
fi

# --- 3. the app -------------------------------------------------------------

say "→ building"
make build >/dev/null

say
say "   seta is at http://localhost${addr}"
say "   Ctrl-C stops it"
say
UPSTREAM_URL="$upstream" ADDR="$addr" ./bin/seta &
app_pid=$!
wait "$app_pid"
