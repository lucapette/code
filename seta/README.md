# seta

A local Chinese notebook for a programmer learning Chinese: translate what you
meet, keep it, and see how much of HSK you have actually touched.

**seta** is Italian for *silk*, after the Via della Seta — the Silk Road, the
original West↔East exchange. Translation is the first mile of that road; the
notebook and the HSK map are the next ones.

Part of the [monorepo](../README.md). Frontend sibling in style to
[timer](../timer) (plain TypeScript + Vite + Alpine.js, same theme system).

## What it is

Three tabs. Not four, not five.

| Tab | What it does |
|-----|--------------|
| **Translate** | Type or paste; the direction is inferred. Chinese out, or English out when you pasted Chinese. Each result can be copied, spoken, or saved. |
| **Library** | The notebook: one free-form list of things you saved, with one search box and a JSON export. |
| **HSK** | Read-only map: how much of each HSK 3.0 level your saved text has actually covered, and which frequent words of your current level you have not met yet. |

The unit of learning is the sentence you met in the wild. There is no
curriculum, no lesson list, no grammar drill, and no spaced repetition yet —
deliberately. Saving an item requires **one field: the Chinese text**;
everything else is optional and can be filled in later.

## Stack

```
Alpine.js ──POST /api/translate──▶ Go ──OpenAI-compatible──▶ HY-MT1.5-1.8B
           ◀──SSE deltas────────  (one binary)  ◀──SSE──  (Docker, GPU or CPU)
                                  │
                                  ├── items.json      (your library, one file)
                                  └── HSK 3.0 words   (go:embed, ~880 KB)
```

- **Model**: Tencent HY-MT1.5-1.8B, a translation-only 1.8B model. Served behind
  an OpenAI-compatible `/v1/chat/completions` endpoint — llama.cpp by default,
  vLLM on GPU boxes.
- **Go layer**: a thin orchestrator. It builds the prompt, infers the direction,
  proxies the stream, normalizes errors, matches your saved text against the
  embedded vocabulary, and writes your library. It never runs inference.
- **Frontend**: one Alpine.js component over a few plain modules. No framework
  build step in production — the binary embeds the built assets.

## Features

- **Streaming translation** both ways, direction inferred from the text: any
  CJK ideograph means zh→en
- **Pinyin** under a Chinese translation, word-aware (银行 → yín háng), toggleable
- **Copy** and **speak** everywhere a Chinese string is shown
- **Speak** uses the browser's voices — and *hides itself* when the OS has no
  Chinese voice, instead of reading hanzi in English
- **Practice**: say a saved item into the mic and get per-syllable feedback on
  your *tones*, graded on-device by a 9M-parameter model (see below)
- **Save sheet** shared by all three tabs: Chinese (required), meaning, where
  you found it, note, free-form tags as chips
- **HSK coverage** per level, current level detected from your own coverage, and
  a frequency-sorted gap list you can page through and save from
- **Export** the library as JSON at any time
- Dark and light themes, keyboard shortcuts (`⌘/Ctrl+Enter`, `Esc`)
- One self-contained binary; no accounts, no telemetry, no external APIs

## Run it

Three ways in. All need a model behind `UPSTREAM_URL` (default
`http://localhost:8000/v1/chat/completions`) — see *Serving the model*.

```sh
# 1. use it: build once, one binary, one port
make run          # = make build, then serve → http://localhost:8080

# 2. work on it: the same service + Vite with live reload
make dev          # → edit the UI at http://localhost:5173

# 3. whole stack in containers (model included; GPU if you have one)
docker compose up # → http://localhost:8080
```

Your library lives in `DATA_DIR` (default `./data`) as a single `items.json`.
In Docker it is the `seta-data` volume. Nothing else is written.

### What `make dev` actually runs

| Port | Process | Serves |
|------|---------|--------|
| `:8080` | `./bin/seta` (the real service) | the embedded build |
| `:5173` | Vite (`npm run dev`) | the app from source, HMR, proxying `/api` → `:8080` |

**Open http://localhost:5173** while editing `frontend/`; open
http://localhost:8080 to see what the embedded build does. Both talk to the same
Go service, so translate, library and coverage behave identically. Use
`localhost`, not `127.0.0.1`, for the Vite port (it binds IPv6 `[::1]`).

### If translation says "unreachable"

The UI loads without a model — useful for working on layout. Translating then
fails with `translation engine unavailable`, and the output pane says
*Model is warming up…* from `GET /api/ready`. That is a readiness state, not a
bug: start the model and the pane recovers on its own (it re-probes every 10s).

Other knobs: `ADDR` (default `:8080`), `DATA_DIR` (default `data`),
`STREAM_IDLE_TIMEOUT` (default `30s`).

### Serving the model

Default (`docker-compose.yml`): llama.cpp with the official
[tencent/HY-MT1.5-1.8B-GGUF](https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF)
Q4_K_M quant — runs on any Docker host, GPU or not. First boot downloads the
~1.1 GB model into the `hy-mt-cache` volume; watch `docker compose logs -f hy-mt`.
Tencent's recommended sampling (`top_k 20`, `repetition_penalty 1.05`) is set as
server launch flags so the wire request stays minimal.

The model container is internal (`expose`, not `ports`) and carries a
`curl /health` healthcheck — llama-server answers 503 while loading and 200 when
ready — so the app can wait for `service_healthy` instead of 503ing through the
first download.

NVIDIA GPU box, best quality — swap in the vLLM variant commented at the bottom
of `docker-compose.yml`:

```sh
docker run --gpus all -p 8000:8000 vllm/vllm-openai:latest \
  --model tencent/HY-MT1.5-1.8B --served-model-name hy-mt-1.8b
```

Fastest on a Mac: skip Docker for the model, run it natively (Metal):

```sh
brew install llama.cpp
llama-server -hf tencent/HY-MT1.5-1.8B-GGUF:Q4_K_M --alias hy-mt-1.8b --port 8000
make run
```

Precision is a one-way door only in hardware terms: BF16 (vLLM, best) → FP8 →
Int4 → GGUF Q8_0 → Q4_K_M. en→zh degrades gently, but it degrades.

## The HSK map

**Data**: [TheOpenDictionary/complete-hsk-vocabulary](https://github.com/TheOpenDictionary/complete-hsk-vocabulary)
(MIT), trimmed to the new HSK 3.0 bands and committed as
[backend/data/hsk.json](backend/data/hsk.json) — 10,969 words, ~880 KB, embedded
in the binary. Provenance, schema and filtering rules live in
[backend/data/PROVENANCE.md](backend/data/PROVENANCE.md). Nothing is fetched at
runtime; regenerate with `make hsk` (source pinned to a commit).

**Counts**: HSK 1 506 · 2 750 · 3 953 · 4 972 · 5 1059 · 6 1123 · 7–9 5606. A
word listed in several bands keeps the lowest one, so per-level numbers do not
double count.

**"Seen"** means the word appears in your saved Chinese. Matching is forward
maximum matching against the vocabulary itself: at each position the longest
word that fits wins, so 银行 inside a saved sentence counts as 银行 and not as
银 + 行, and a lone 的 is not counted from the middle of an unrelated word. No
segmenter, no extra data — the dictionary is the segmenter.

**Current level** is the lowest level still under 80% coverage; once everything
clears it, the map's edge is the highest level. The gap list is that level's
unseen words, most frequent first, 50 at a time.

Two things the data cannot do, both fine at this stage: a word with several
readings gets one pinyin (行 → háng, so 行动 will read as háng dòng in the gap
list), and glosses are trimmed to the first sense or two.

## Practice: grading your own tones

TTS reads; it cannot hear you. Mapping your own pronunciation onto HSK needs the
other direction, and the browser's `SpeechRecognition` is the wrong tool — it
transcribes what you *meant* and quietly corrects you, which is exactly what a
learner does not want. So practice uses a local model instead:

| Piece | What it is |
|---|---|
| Model | 9M-parameter Conformer-CTC, INT8, ~14 MB. Trained on ~300 h of Mandarin (AISHELL-1 + Primewords) to predict pinyin **syllable + tone** tokens, so a wrong tone is a different token, not a paraphrase |
| Runtime | `onnxruntime-web` (wasm), in the browser, no server round-trip, no network |
| Frontend | 16 kHz log-mel, 80 bins, 25 ms/10 ms frames, per-utterance CMVN — [practice/mel.ts](frontend/src/practice/mel.ts) |
| Scoring | CTC forced alignment (Viterbi) per expected syllable, then a confidence over the frames that are actually speech, so a pause in front of a word cannot tank its score — [practice/ctc.ts](frontend/src/practice/ctc.ts) |

`make model` fetches the weights (the author states no licence, so they are
**not** committed — `frontend/public/models/` is gitignored) and the build embeds
whatever is there. Without them the practice button never appears; with them the
binary grows to ~36 MB. Recording needs `localhost` or HTTPS.

What it gets right, measured on macOS-voice clips (see `make practice-fixtures`):
a 7-syllable sentence and a 5-syllable phrase both score 100 with every syllable
confirmed; 你好 and 谢谢 come back correct. What it does not: **two-syllable
items are flaky** (the model needs context, and per-utterance normalisation over
0.7 s is degenerate), the onset of an utterance is the weakest part, and the
model is trained on *read* speech, so fast casual speech misaligns — its author
says native speakers have to over-enunciate. Hence three ways to say "not sure"
instead of two ways to say "wrong": a syllable the model was confident about is
`ok`/`wrong tone`/`different syllable`, anything else is `unclear` and is never
counted as correct (nor held against you).

Two details that would otherwise produce false feedback: expectations are padded
with half a second of silence before scoring ([practice/audio.ts](frontend/src/practice/audio.ts),
because without it 你好 was heard as "mei3 hao3"), and both the dictionary tone
and its sandhi form are accepted ([practice/tokens.ts](frontend/src/practice/tokens.ts)),
so reading 你好 slowly as nǐ hǎo is not a mistake.

## Data and backups

- `items.json`: `{"version": 1, "items": [...]}` in `DATA_DIR`, replaced
  atomically on every write (temp file + rename), so a crash cannot truncate it.
- Adding fields later means adding columns with defaults — old rows never become
  invalid.
- The export button (`GET /api/items/export`) gives the same file as a download.
  That is the escape hatch when the data model changes shape in a few months.

## Test it

```sh
make test         # go test -race + frontend tests + type check
make lint         # go vet + gofmt
```

Go: prompt building for both directions, direction inference, the SSE proxy
(stall watchdog, empty stream, abort propagation, error mapping), the store
(validation, caps, atomic writes, reload, export shape), and the HSK engine
(max matching, per-level coverage, current level, gap paging) — 57 tests across
[backend](backend).

Frontend: SSE parsing, the streaming client, library helpers (search, sheet
pre-fills, tag parsing), speech availability, the practice pipeline (tokens,
sandhi, mel frontend, Viterbi alignment, verdicts) and the component's state
machine (tabs, superseded requests, save/edit, chip editor, coverage paging,
record → grade) — 118 tests across [frontend/tests](frontend/tests).

One test file runs the **real model** on real recordings
([tests/practice-model.test.ts](frontend/tests/practice-model.test.ts)): it skips
unless both `make model` and `make practice-fixtures` have been run, and it
asserts that a correct phrase is never accused of a mistake while a wrong tone
is caught.

## Endpoints

| Route | What it is |
|-------|------------|
| `GET /` | the embedded app |
| `POST /api/translate` | validate → infer direction → prompt → proxy the model stream (SSE). Answers `X-Seta-Direction: en-zh\|zh-en` |
| `GET /api/items` | the whole library, newest first |
| `POST /api/items` | save one item (`chinese` required) |
| `PATCH /api/items/{id}` | partial update |
| `DELETE /api/items/{id}` | remove |
| `GET /api/items/export` | the library as a JSON download |
| `GET /api/hsk?gaps=50` | coverage per level, current level, gap page |
| `GET /api/health` | liveness; never touches the model |
| `GET /api/ready` | readiness; probes the model's `/v1/models`, 503 while warming |

### The stream contract

```
POST /api/translate {"text":"…"}
→ 200 text/event-stream
  data: {"delta":"…"}   a fragment
  data: {"error":"…"}   mid-stream failure (fragments already sent stand)
  data: [DONE]          terminator
```

Headers are committed lazily: until the first event is known good, a failure is
still a clean status instead of a broken 200 stream. Every event is flushed
immediately.

A 200 upstream that yields no deltas (empty completion, or a bare `[DONE]`) is a
502 here — there is no translation to show. There is no overall request timeout
(a long translation is legitimate), but `STREAM_IDLE_TIMEOUT` bounds the gap
between chunks: a wedged model ends the stream with
`{"error":"translation timed out"}` and `[DONE]`, or a 504 if nothing was sent
yet.

### Errors

| Condition | Status | Body |
|-----------|--------|------|
| Missing/blank text, bad JSON | 400 | `{"error":"text is required"}` |
| Text over 5,000 bytes | 413 | `{"error":"text exceeds limit"}` |
| Upstream unreachable | 503 | `{"error":"translation engine unavailable"}` |
| Empty or malformed upstream | 502 | `{"error":"invalid upstream response"}` |
| Upstream stalled before output | 504 | `{"error":"translation timed out"}` |
| Item without `chinese` | 400 | `{"error":"chinese is required"}` |
| Item field over its cap | 400 | `{"error":"note exceeds 2000 bytes"}` |
| Unknown item id | 404 | `{"error":"item not found"}` |
| Item body over 64 KiB | 413 | `{"error":"item too large"}` |

Raw upstream error bodies are never forwarded — they leak model paths, GPU
diagnostics and internal hostnames — but they are logged for the operator.

## How the model is prompted

HY-MT takes **no system prompt**: instruction and text share a single user turn.
The Chinese templates are the official guidance for Chinese ⇔ other pairs:

```
en→zh: 将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： {text}
zh→en: 将以下文本翻译为英文，注意只需要输出翻译后的结果，不要额外解释： {text}
```

Direction is inferred by the Go service (any CJK ideograph → zh→en) and reported
to the client in a response header, so the UI knows whether the output is
Chinese without keeping its own copy of the rule. No direction toggle in the UI.

Sampling: `temperature 0.7`, `top_p 0.6`, `max_tokens 2048`, `stream true`.

## Pinyin and speech

The model is translation-only, so pinyin is converted **client-side** from the
accumulated translation with [pinyin-pro](https://github.com/pinyin-pro/pinyin-pro)
([frontend/src/pinyin.ts](frontend/src/pinyin.ts)) — a dictionary lookup, so it
is instant, offline and word-aware. Recomputing it from scratch on every delta
costs ~0.06 ms for a paragraph, i.e. nothing.

Speech reads Chinese with the browser's own voices
([frontend/src/speak.ts](frontend/src/speak.ts)) at rate 0.85. Availability is
an OS fact, not a browser fact: if no `zh*` voice is installed the speak buttons
are not rendered at all. Nothing is stored and the Go service is not involved.

## Not built yet, on purpose

Deferred until the library has ~50–100 items and the shape of how you learn is
visible: spaced repetition and review cards (practice lives on library items for
now), YouTube/reader ingestion, source types or URL parsing, accounts and sync,
and any curriculum.

If a feature tempts you, ask first — the app should not presume.

## Project layout

| File | Purpose |
|------|---------|
| `backend/main.go` | Config, routes, server lifecycle, JSON helpers |
| `backend/translate.go` | Prompts, direction inference, SSE proxy + stall watchdog |
| `backend/store.go` | The library: items, validation, atomic JSON file |
| `backend/items.go` | Item + HSK HTTP handlers |
| `backend/hsk.go` | Embedded vocabulary, max-match, coverage and gaps |
| `backend/health.go` | Liveness/readiness, `/v1/models` derivation |
| `backend/static.go` | Embedded app, caching, security headers |
| `backend/data/` | `hsk.json` + `PROVENANCE.md` (generated by `make hsk`) |
| `backend/tools/hskgen/` | The generator behind `make hsk` |
| `backend/*_test.go` | Proxy, store, HSK, items, health, static tests |
| `backend/Dockerfile` | Multi-stage: node build → go embed → alpine, non-root, `/data` |
| `frontend/index.html` | The three tabs, the save sheet, all bindings |
| `frontend/src/component.ts` | The Alpine component: state, tabs, sheet |
| `frontend/src/translate.ts` | Streaming client (injectable fetch) |
| `frontend/src/api.ts`, `http.ts` | Item/HSK calls and error plumbing |
| `frontend/src/library.ts` | Search, sheet pre-fills, tag parsing (pure) |
| `frontend/src/speak.ts` | TTS and voice availability |
| `frontend/src/practice/` | Recording, log-mel, CTC alignment, grading, verdicts |
| `frontend/src/pinyin.ts`, `sse.ts` | Hanzi → pinyin; SSE buffer parsing |
| `frontend/vite.config.ts` | Dev `/api` proxy, build target, test include |
| `docker-compose.yml` | `hy-mt` (internal, healthchecked) + `app` (public, `seta-data`) |
| `Makefile` | install / build / run / dev / test / lint / hsk / clean |
