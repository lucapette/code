# seta

A local English → Simplified Chinese translator with streaming output.
Type on one side, watch the translation arrive on the other, token by token.

**seta** is Italian for *silk*, after the Via della Seta — the Silk Road, the
original West↔East exchange. Translation is only the first mile of that
road: the app is meant to grow into a Chinese study companion (vocabulary,
idioms, spaced repetition), so the name points at the destination, not at v0.

Part of the [monorepo](../README.md). Frontend sibling in style to
[timer](../timer) (plain TypeScript + Vite + Alpine.js, same theme system).

## Stack

```
Alpine.js ──POST /api/translate──▶ Go (thin proxy) ──OpenAI-compatible──▶ HY-MT1.5-1.8B
           ◀──SSE deltas────────  (this binary)    ◀──SSE chunks────────  (Docker, GPU)
```

- **Model**: Tencent HY-MT1.5-1.8B, a translation-only 1.8B model. en→zh is
  one of its strongest directions. Served behind an OpenAI-compatible
  `/v1/chat/completions` endpoint — llama.cpp by default, vLLM on GPU boxes.
- **Go layer**: a deliberately thin orchestrator. It never runs inference —
  it validates the request, builds the prompt, proxies the stream, and
  normalizes errors. The same binary embeds and serves the frontend, so
  there is exactly one public-facing service on one port.
- **Frontend**: one Alpine.js component owning UI state and SSE consumption.
  Nothing else. No language selectors — the direction is fixed.

## Features

- Streaming translation: every delta renders the moment it arrives
- **Pinyin under the translation**: tone-marked, word-aware reading
  (银行 → yín háng, 音乐 → yīn yuè), recomputed live as the hanzi streams
- Debounced, abortable requests — typing a new sentence cancels the stale
  generation all the way through to the model
- Clean errors for everything upstream: never a raw vLLM body
  (those can leak model paths, GPU diagnostics, internal hostnames)
- Dark and light themes (follows `prefers-color-scheme` on first run)
- One self-contained binary: `bin/seta` serves the app and the API

## Run it

```sh
make build        # frontend build → embed → bin/seta
make run          # build, then serve on :8080

# or the whole stack in Docker (vLLM needs an NVIDIA GPU):
docker compose up
```

The app expects the model at `UPSTREAM_URL`
(default `http://localhost:8000/v1/chat/completions`).

### Serving the model

Default (`docker-compose.yml`): llama.cpp with the official
[tencent/HY-MT1.5-1.8B-GGUF](https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF)
Q4_K_M quant. This runs on any Docker host, GPU or not — Docker on Apple
Silicon has no NVIDIA runtime, so vLLM can't start there at all. First boot
downloads the ~1.1 GB model into the `hy-mt-cache` volume; watch
`docker compose logs -f hy-mt`. Tencent's recommended sampling
(`top_k 20`, `repetition_penalty 1.05`) is set as server launch flags so
the wire request stays minimal.

NVIDIA GPU box, best quality — swap the `hy-mt` service for the vLLM
variant commented at the bottom of `docker-compose.yml`:

```sh
docker run --gpus all -p 8000:8000 vllm/vllm-openai:latest \
  --model tencent/HY-MT1.5-1.8B --served-model-name hy-mt-1.8b
```

Fastest on a Mac: skip Docker for the model and run llama-server natively
(Metal instead of the Docker VM's CPU) — same contract, point
`UPSTREAM_URL` at it:

```sh
brew install llama.cpp
llama-server -hf tencent/HY-MT1.5-1.8B-GGUF:Q4_K_M --alias hy-mt-1.8b --port 8000
```

Precision is a one-way door only in hardware terms: BF16 (vLLM, best) →
FP8 → Int4 → GGUF Q8_0 → Q4_K_M. Pick by hardware, not by mood — en→zh
degrades gently, but it still degrades.

## Test it

```sh
make test         # Go tests + frontend tests + type check
cd backend && go test ./...
cd frontend && npm test && npm run type-check
```

The prompt builder, upstream request shape, delta extraction, error
mapping, and abort propagation are covered in
[backend/translate_test.go](backend/translate_test.go) against a stub
upstream. The SSE line protocol the frontend consumes is pure string
parsing in [frontend/src/sse.ts](frontend/src/sse.ts), covered by
[frontend/tests/sse.test.ts](frontend/tests/sse.test.ts).

## How it works

### The prompt

HY-MT takes **no system prompt** — instruction and text share a single user
turn — and for Chinese ⇔ other pairs the official guidance is the Chinese
template (the English one is for non-Chinese ⇔ non-Chinese pairs). The
prompt is therefore a hardcoded constant, and there is no `source_lang` /
`target_lang` anywhere: the model infers the source, the direction is the
product.

Sampling: `temperature 0.7`, `top_p 0.6`, `max_tokens 2048` (Tencent's
recommended values). `top_k`/`repetition_penalty` are vLLM-specific extras —
set them as launch flags if you want them, not in the request.

### The stream contract

```
POST /api/translate {"text":"…"}
→ 200 text/event-stream
  data: {"delta":"…"}   a fragment
  data: {"error":"…"}   mid-stream failure (fragments already sent stand)
  data: [DONE]          terminator
```

The Go handler commits SSE headers lazily: until the first event is known
good, a failure can still surface as a clean status instead of a broken 200
stream. Every event is flushed immediately — no buffering.

**Abort propagation**: the frontend aborts in-flight fetches on every
keystroke burst. The handler passes `r.Context()` into the upstream
request, so an abandoned textarea actually cancels the model's generation
instead of burning GPU cycles on it (verified by test).

### Errors

| Condition                        | Status | Body                               |
|----------------------------------|--------|------------------------------------|
| Missing/blank text, bad JSON     | 400    | `{"error":"text is required"}`     |
| Text over 5,000 bytes            | 413    | `{"error":"text exceeds limit"}`  |
| Upstream unreachable             | 503    | `{"error":"translation engine unavailable"}` |
| Empty or malformed upstream      | 502    | `{"error":"invalid upstream response"}` |

The byte cap exists so a pasted document can't silently eat the whole
`max_tokens` budget and stall the stream.

### Pinyin

The model is translation-only: asking it to also emit pinyin would leave
its trained prompt template and degrade the hanzi. Instead the pinyin line
is converted **client-side** from the accumulated translation with
[pinyin-pro](https://github.com/pinyin-pro/pinyin-pro)
([frontend/src/pinyin.ts](frontend/src/pinyin.ts)) — a dictionary lookup,
so it is instant, offline, and word-aware where per-character tables get
polyphones wrong (行 is xíng in 行动 but háng in 银行). The wire contract
stays translation-only; rare polyphone words outside the dictionary can
still come out with the first reading.

### Frontend

Same approach as timer: a single Alpine component
([frontend/src/main.ts](frontend/src/main.ts)) bound to
[frontend/index.html](frontend/index.html), theme classes on
`:root` persisted to localStorage (`seta-theme`), flat panels, system
fonts. Input is debounced 350 ms; each request owns its `AbortController`,
so a superseded request can never clobber the fresh one's state.

## Project layout

| File                          | Purpose                                          |
|-------------------------------|--------------------------------------------------|
| `backend/main.go`             | HTTP server, SSE proxy, error mapping, static    |
| `backend/translate.go`        | Prompt template, upstream request, delta parsing |
| `backend/translate_test.go`   | Handler + prompt + abort propagation tests       |
| `backend/Dockerfile`          | Multi-stage: node build → go embed → alpine      |
| `frontend/index.html`         | Markup + Alpine bindings                         |
| `frontend/src/main.ts`        | Alpine component: state, streaming, theme        |
| `frontend/src/pinyin.ts`      | Hanzi → tone-marked pinyin (pinyin-pro)          |
| `frontend/src/sse.ts`         | Pure SSE buffer parsing                          |
| `frontend/src/style.css`      | Theming and layout                               |
| `frontend/tests/*.test.ts`    | Vitest coverage: stream parsing, pinyin edge cases |
| `docker-compose.yml`          | `hy-mt` (model, internal) + `app` (public)       |
| `Makefile`                    | build / run / test                               |

## Roadmap

v0 is translation only, on purpose. Next miles on the road: a vocabulary of
words I know and want to repeat, idioms, and review tooling — the app is
named for the journey, not the translator.
