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
- **Frontend**: one Alpine.js component owning UI state, one module owning
  the wire. Nothing else. No language selectors — the direction is fixed.

## Features

- Streaming translation: every delta renders the moment it arrives
- **Pinyin under the translation**: tone-marked, word-aware reading
  (银行 → yín háng, 音乐 → yīn yuè), recomputed live as the hanzi streams —
  and toggleable, with the choice remembered
- **Copy** the translation in one click
- **Keyboard**: `⌘/Ctrl+Enter` translates immediately, `Esc` clears both panes
- Debounced, abortable requests — typing a new sentence *or clearing the box*
  cancels the stale generation all the way through to the model
- A byte counter against the server's cap, so a long paste warns before the
  413 does
- Clean errors for everything upstream: never a raw vLLM body
  (those can leak model paths, GPU diagnostics, internal hostnames)
- **Engine readiness**: while the model is still loading, the output pane says
  so ("Model is warming up…") instead of failing one translation at a time
- Dark and light themes (follows `prefers-color-scheme` on first run)
- Security headers (CSP, `nosniff`, `Referrer-Policy`, `frame-ancestors`) and
  correct caching for everything the binary serves
- One self-contained binary: `bin/seta` serves the app and the API

## Run it

Three ways in. All three need a model behind `UPSTREAM_URL` (default
`http://localhost:8000/v1/chat/completions`) — see *Serving the model* below.

```sh
# 1. use it: build once, one binary, one port
make run          # = make build, then serve → http://localhost:8080

# 2. work on it: the same service + Vite with live reload
make dev          # → build the UI at http://localhost:5173 (edit here)

# 3. whole stack in containers (model included; GPU if you have one)
docker compose up # → http://localhost:8080
```

### What `make dev` actually runs

`make dev` starts **two** processes and leaves both in your terminal:

| Port | Process | Serves |
|------|---------|--------|
| `:8080` | `./bin/seta` (the real service) | the embedded build — the same thing `make run` serves |
| `:5173` | Vite (`npm run dev`) | the app from source, with HMR, proxying `/api` → `:8080` |

So while you are editing `frontend/`:

- **Open http://localhost:5173** — that is the live app. Change `style.css`,
  `index.html`, or a `.ts` file and the page updates in place; no `make build`,
  no restart.
- Open http://localhost:8080 only when you want to see what the *embedded*
  build does (that one needs a rebuild to change).
- Both talk to the same Go service, so `/api/translate`, `/api/ready` and the
  error mapping behave identically in either tab. Nothing in the frontend is
  mocked.

Use `localhost`, not `127.0.0.1`, for the Vite port: it binds IPv6 `[::1]`, so
`http://127.0.0.1:5173` is refused. Point the proxy at a different backend with
`BACKEND_URL=http://host:port make dev`.

`Ctrl-C` stops both processes (the Go binary is killed by the same trap that
started it).

### If translation says "unreachable"

The UI loads without a model — that is deliberate, so you can work on layout
with nothing running. Translating then fails with `translation engine
unavailable`, and the output pane says *Translation engine is unreachable* /
*Model is warming up…* from `GET /api/ready`. Those are readiness states, not
bugs; start one of the model options below and the pane recovers on its own
(it re-probes every 10s).

Other knobs: `ADDR` (default `:8080`) and `STREAM_IDLE_TIMEOUT` (default
`30s`, see below).

### Serving the model

Default (`docker-compose.yml`): llama.cpp with the official
[tencent/HY-MT1.5-1.8B-GGUF](https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF)
Q4_K_M quant. This runs on any Docker host, GPU or not — Docker on Apple
Silicon has no NVIDIA runtime, so vLLM can't start there at all. First boot
downloads the ~1.1 GB model into the `hy-mt-cache` volume; watch
`docker compose logs -f hy-mt`. Tencent's recommended sampling
(`top_k 20`, `repetition_penalty 1.05`) is set as server launch flags so
the wire request stays minimal.

The model container is internal (`expose`, not `ports`): the app is the only
public door. It carries a `curl /health` healthcheck — llama-server answers 503
while the weights load and 200 once slots are ready — and the app waits for
`service_healthy`, so `docker compose up` returns with a stack that can
actually translate. Uncomment the `ports` line in `docker-compose.yml` when you
want to poke the model directly while debugging.

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
make test         # go test -race + frontend tests + type check
make lint         # go vet + gofmt
cd backend && go test ./...
cd frontend && npm test && npm run type-check
```

Go: prompt building, upstream request shape, delta extraction, every error
mapping, the byte-cap boundary, the stall watchdog, abort propagation, the
health/readiness probes and the static handler (against an in-memory fs) —
[backend/translate_test.go](backend/translate_test.go),
[backend/stream_test.go](backend/stream_test.go),
[backend/health_test.go](backend/health_test.go),
[backend/static_test.go](backend/static_test.go).

Frontend: SSE line parsing, the streaming client (split events, mid-stream
errors, abort, `[DONE]`), and the component's state machine — superseded
requests, clearing mid-stream, the byte cap, pinyin and theme persistence —
[frontend/tests](frontend/tests).

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

A 200 upstream that yields **no deltas** (an empty completion, or a bare
`[DONE]`) is a 502 here: there is no translation to show, and an empty stream
would read in the UI as "you typed nothing".

**Abort propagation**: the frontend aborts in-flight fetches on every
keystroke burst — and when the textarea is cleared. The handler passes
`r.Context()` into the upstream request, so an abandoned textarea actually
cancels the model's generation instead of burning GPU cycles on it (verified by
test).

**Stall watchdog**: there is no overall request timeout — a long translation is
legitimate — but no upstream chunk for `STREAM_IDLE_TIMEOUT` (default 30s, set
per deployment) ends the stream with `{"error":"translation timed out"}` and
`[DONE]`, or with a 504 if nothing had been sent yet. Without it a wedged model
leaves the browser spinning forever.

### Endpoints

| Route              | What it is                                                   |
|--------------------|--------------------------------------------------------------|
| `GET /`            | the embedded app                                             |
| `POST /api/translate` | validate → prompt → proxy the model stream (SSE)          |
| `GET /api/health`  | liveness: the process is up. Never touches the model          |
| `GET /api/ready`   | readiness: does the model answer `GET /v1/models` yet? 503 while warming |

The UI polls `/api/ready` (every 10s until it answers) so a cold start reads as
"warming up" rather than as a translator that silently does nothing. The app
container's `HEALTHCHECK` uses `/api/health` instead, deliberately: a model that
is still loading must not mark the app itself unhealthy.

### Errors

| Condition                        | Status | Body                               |
|----------------------------------|--------|------------------------------------|
| Missing/blank text, bad JSON     | 400    | `{"error":"text is required"}`     |
| Text over 5,000 bytes            | 413    | `{"error":"text exceeds limit"}`  |
| Upstream unreachable             | 503    | `{"error":"translation engine unavailable"}` |
| Empty or malformed upstream      | 502    | `{"error":"invalid upstream response"}` |
| Upstream stalled (before output) | 504    | `{"error":"translation timed out"}` |

The byte cap exists so a pasted document can't silently eat the whole
`max_tokens` budget and stall the stream; the raw request body is capped
separately (64 KiB) so an oversized POST is refused before it is decoded. The
client counts the same cap in the source pane, and refuses to send text over it.

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

Cheap enough to recompute from scratch on every delta: a full conversion of a
paragraph is ~0.06 ms, well under a frame.

### Frontend

Same approach as timer: a single Alpine component
([frontend/src/component.ts](frontend/src/component.ts)) bound to
[frontend/index.html](frontend/index.html), theme classes on `:root`
persisted to localStorage (`seta-theme`), flat panels, system fonts.

The component owns state only; [frontend/src/translate.ts](frontend/src/translate.ts)
owns the request and the SSE consumption, with `fetch` injectable so the
streaming path is testable. Input is debounced 350 ms, and each request owns
its `AbortController`: a superseded request cannot clobber the fresh one's
state, drop-in fragments included.

Accessibility: the output pane is `aria-live="off"` while streaming (a screen
reader should not be handed a fragment at a time), completion is announced once
through a visually hidden live region, the hanzi carry `lang="zh-Hans"`
(`zh-Latn-pinyin` for the reading line), and errors are `role="alert"`.

## Project layout

| File                          | Purpose                                          |
|-------------------------------|--------------------------------------------------|
| `backend/main.go`             | Config, routes, server lifecycle, JSON helpers   |
| `backend/translate.go`        | Prompt, upstream request, SSE proxy + watchdog   |
| `backend/health.go`           | Liveness/readiness probes, `/v1/models` derivation |
| `backend/static.go`           | Embedded app, caching, security headers          |
| `backend/*_test.go`           | Handler, stream, health and static tests         |
| `backend/Dockerfile`          | Multi-stage: node build → go embed → alpine + user + healthcheck |
| `frontend/index.html`         | Markup + Alpine bindings                         |
| `frontend/src/component.ts`   | The Alpine component: state, streaming, theme    |
| `frontend/src/translate.ts`   | Request + SSE consumption (testable, DI'd fetch) |
| `frontend/src/pinyin.ts`      | Hanzi → tone-marked pinyin (pinyin-pro)          |
| `frontend/src/sse.ts`         | Pure SSE buffer parsing                          |
| `frontend/src/style.css`      | Theming and layout                               |
| `frontend/vite.config.ts`     | Dev `/api` proxy, build target, test include     |
| `frontend/tests/*.test.ts`    | Vitest: SSE, client, component, pinyin           |
| `docker-compose.yml`          | `hy-mt` (internal, healthchecked) + `app` (public) |
| `.dockerignore`               | Keeps node_modules and builds out of the context |
| `Makefile`                    | install / build / run / dev / test / lint / clean |

## Roadmap

v0 is translation only, on purpose. Next miles on the road: a vocabulary of
words I know and want to repeat, idioms, and review tooling — the app is
named for the journey, not the translator.
