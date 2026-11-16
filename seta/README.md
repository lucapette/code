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
Alpine.js ──POST /api/translate──▶ Go ──in-process──▶ HY-MT1.5-1.8B (llama.cpp)
           ◀──SSE deltas────────  (one binary)
                                  ├── items.json      (your library, one file)
                                  ├── HSK 3.0 words   (go:embed, ~880 KB)
                                  └── llama.cpp libs  (go:embed, ~12 MB)
```

- **Model**: Tencent HY-MT1.5-1.8B, a translation-only 1.8B model, quantised to
  Q4_K_M (~1.1 GB) and loaded **inside the Go process** at startup. There is no
  model server: no port, no supervisor, no second binary to install.
- **Inference**: llama.cpp called through [yzma](https://github.com/hybridgroup/yzma),
  which uses purego instead of cgo — so `CGO_ENABLED=0` still holds and the
  binary cross-compiles. The llama.cpp shared libraries are embedded in the
  binary and unpacked into the user's cache on first run.
- **Go layer**: prompts, direction inference, the SSE contract, the library,
  and the HSK map. Same job as before; the proxy in the middle is gone.
- **Frontend**: one Alpine.js component over a few plain modules. No framework
  build step in production — the binary embeds the built assets.

## Features

- **A desktop app, not a page** — a fixed rail on the left (Translate, Library,
  HSK) and one wide working surface on the right. Each section owns its own
  scroll area, so the navigation and the search box stay put while you read
- **Alphabetical by pinyin** — the library and both HSK lists read A–Z the way a
  dictionary does: tone marks are folded for sorting (wǒ sorts under wo), and
  each HSK list still stays grouped by band
- **Streaming translation** both ways, direction inferred from the text: any
  CJK ideograph means zh→en
- **Pinyin wherever Chinese is shown** — under the translation, beside every
  library row and HSK word, under the save sheet's field, under a pasted
  lookup — word-aware (银行 → yín háng) and toggleable from the rail
- **Copy** and **speak** everywhere a Chinese string is shown
- **Speak** uses the browser's voices — and *hides itself* when the OS has no
  Chinese voice, instead of reading hanzi in English
- **Practice**: say a saved item into the mic and get per-syllable feedback on
  your *tones*, graded on-device by a 9M-parameter model (see below)
- **Save sheet** shared by all three tabs: Chinese (required), meaning, where
  you found it, note, free-form tags as chips
- **HSK tab in two views**: *Known* — every word you have met, in pinyin order
  inside its band, with the sentences that taught it right there on the row —
  and *Missing* — coverage per band, the band the map puts you on, and that
  band's unseen words in pinyin order, pageable and saveable
- **Search the whole HSK vocabulary** from either view: characters, pinyin with
  or without tones and syllable spaces (`yinhang`, `yin hang`, `yín háng`), or
  English. Every hit says its band and whether you have met it; a missing word
  can be saved straight from the results
- **A library that fits on a screen**: one word per line, Chinese and reading on
  the left, meaning in the middle, where you found it on the right; the row
  opens to show the note, tags, edit/delete and practice
- **Export** the library as JSON at any time
- Dark and light themes, keyboard shortcuts (`⌘/Ctrl+Enter`, `Esc`)
- One self-contained binary: the model runs inside it, the frontend and the
  HSK vocabulary are embedded, no accounts, no telemetry, no external APIs

## Run it

One command:

```sh
make start
```

That is the whole thing: it fetches what is missing (the llama.cpp libraries
once, the ~1.1 GB weights once), builds the binary and serves the app at
**http://localhost:8080**. The model loads in the background for about six
seconds — until it is ready the Translate tab says *Model is warming up…* while
the Library and HSK tabs work normally.

`Ctrl-C` stops everything, because everything is one process.

Needs Go, Node and `curl`. No `llama-server`, no Docker, no GPU driver.

Ways in, if you want them:

```sh
make start             # build, fetch what is missing, serve on :8080
make dev               # the Go service + Vite on :5173 with live reload
make test              # Go (-race) + frontend + type check
make translate-model   # just fetch the weights (1.1 GB, into models/)
make libs              # just fetch / refresh the llama.cpp libraries
```

`make start` builds, then runs [scripts/start.sh](scripts/start.sh) — which only
checks the two payloads and execs the binary. Your library lives in `DATA_DIR`
(default `./data`) as a single `items.json`.

### Where things stand

Working, verified against the real model, in this process:

- translation both ways with streaming, abort, pinyin and a clean error surface;
  direction inferred from the text; ~90 tokens/s on Apple silicon's GPU, ~50 on
  CPU only, first token in well under a second
- the model inside the binary: no child process, no port, no CGo, and
  cancelling a request really stops the generation (checked per token)
- library: save/edit/delete, one search box, tag chips, JSON export
- HSK: words met grouped by band and sorted by pinyin, with the sentence
  references that taught them; per-band coverage; the current band's gaps;
  load more on both lists; a search across all 10,969 words, by characters,
  pinyin or English, ranked exact-character-first and labelled known/missing
- practice: record a saved item and get per-syllable tone feedback from the
  local model (needs a microphone and `make practice-model`)
- TTS with a real Chinese voice when the OS has one

Not done, roughly in order of how much it matters:

- practice lives on library items only — no review screen yet, by design until
  the library has ~50–100 items
- no spaced repetition
- copying has no fallback outside secure contexts, so `copy` needs `localhost`
  or HTTPS
- the grader was measured on synthesised clips: two-syllable items are flaky and
  it was trained on read speech
- one request at a time (a single context, queued): a second tab waits. The old
  model server had `--parallel 1` too, so this is not a regression.

### What `make dev` actually runs

| Port | Process | Serves |
|------|---------|--------|
| `:8080` | `./bin/seta` (the real service) | the embedded build |
| `:5173` | Vite (`npm run dev`) | the app from source, HMR, proxying `/api` → `:8080` |

**Open http://localhost:5173** while editing `frontend/`; open
http://localhost:8080 to see what the embedded build does. Both talk to the same
Go service, so translate, library and coverage behave identically. Use
`localhost`, not `127.0.0.1`, for the Vite port (it binds IPv6 `[::1]`).

### If translation says "unavailable"

The app does not need the model to start: the Library and HSK tabs work while it
loads, and keep working if it cannot load at all. The Translate pane says
*Model is warming up…* from `GET /api/ready`, and translating before that is a
503. The server log says which of the three things is missing:

| Log line | Fix |
|----------|-----|
| `translation model not found: …` | `make translate-model` (or set `MODEL_PATH`) |
| `carries no llama.cpp libraries` | `make libs`, then `make build` |
| `load model …` / `load llama.cpp …` | the file is corrupt or from another llama.cpp version |

Other knobs: `ADDR` (default `:8080`), `DATA_DIR` (default `data`),
`MODEL_PATH` (the GGUF to load), `LIB_DIR` (override the unpacked libraries),
`GPU_LAYERS` (`0`, `cpu` or `off` to stay on the CPU; everything is offloaded by
default), `TRANSLATE_TIMEOUT` (default `60s`).

### The model, in the binary

`make libs` fetches the llama.cpp shared libraries for the machine you build on
([scripts/fetch-libs.sh](scripts/fetch-libs.sh)), pins the release tag in one
place, and they are embedded with `go:embed`. At startup the engine unpacks them
into `~/Library/Caches/seta/llama.cpp/<tag>/` (or `$XDG_CACHE_HOME` on Linux) —
a shared library has to exist as a file before the loader can open it — and
calls into them with purego. Nothing else is installed or exported: no
`DYLD_LIBRARY_PATH`, no `llama-server`, no port.

Why this shape:

- **One process** is simpler to reason about than two: `Ctrl-C` stops
  generation, `REQUEST_TIMEOUT` bounds it, and a request the browser abandons is
  cut on the next token (~15 ms) instead of finishing into a dead socket.
- **No CGo** keeps `CGO_ENABLED=0` and cross-compilation. The cost is that the
  libraries are shared objects unpacked at runtime (5–12 MB per platform) rather
  than a statically linked blob.
- **Same speed** as the old server: the identical llama.cpp build runs the same
  model; measured 87–98 tok/s against the server's 95 on this machine.

Sampling is the app's own now: `temperature 0.7`, `top_p 0.6` (the values it
always sent) and `top_k 20` (the model's own preference), `max_tokens 2048`.

## The HSK map

**Data**: [TheOpenDictionary/complete-hsk-vocabulary](https://github.com/TheOpenDictionary/complete-hsk-vocabulary)
(MIT), trimmed to the new HSK 3.0 bands and committed as
[backend/data/hsk.json](backend/data/hsk.json) — 10,969 words, ~880 KB, embedded
in the binary. Provenance, schema and filtering rules live in
[backend/data/PROVENANCE.md](backend/data/PROVENANCE.md). Nothing is fetched at
runtime; regenerate with `make hsk` (source pinned to a commit).

**Counts**: HSK 1 506 · 2 750 · 3 953 · 4 972 · 5 1059 · 6 1123 · 7–9 5606. A
word listed in several bands keeps the lowest one, so per-level numbers do not
double count. The data carries bands 7, 8 and 9 as one bucket; the app calls it
7–9.

**"Seen"** means the word appears in your saved Chinese. Matching is forward
maximum matching against the vocabulary itself: at each position the longest
word that fits wins, so 银行 inside a saved sentence counts as 银行 and not as
银 + 行, and a lone 的 is not counted from the middle of an unrelated word. No
segmenter, no extra data — the dictionary is the segmenter.

### The two views, and the search box

*Known* answers "what do I have?", which is the question you come back with. It
lists every word you have met, band by band, alphabetical by pinyin inside each
band, and under each word the sentence references that taught it — tap one and
the library opens on that item. A word met in several items shows its three
newest references and a `+N more` chip, which hands the rest to the library's
search rather than turning the row into a wall of chips. The known list is a
grid of compact cells, so a wide window shows more words rather than one longer
column. Band chips pick which bands to show; they start on HSK 1–3, because a
list of every band at once is a wall, not an answer.

*Missing* answers "what is next?". It shows the coverage bar per band, marks the
band the map puts you on, and lists that band's unseen words, also in pinyin
order. Pick another band to look further out.

*Search* answers "where is that word?". It looks across every band, not just
the list on screen: the characters (`银`), pinyin however you type it
(`yinhang`, `yin hang`, `yín háng`, `lv` for lü) or an English gloss (`bank`).
Results are ranked so the exact character comes first, then readings, then
glosses, with the band as the tie-break; each hit shows its HSK band and whether
it is *known* or *missing*, and a missing word can be saved without leaving the
page. Searching takes over the tab until you clear the box: the Known/Missing
control steps aside, because the search covers both.

**Current band** is the lowest level still under 80% coverage; once everything
clears it, the map's edge is the highest level.

Two things the data cannot do, both fine at this stage: a word with several
readings gets one pinyin (行 → háng, so 行动 will read as háng dòng), and glosses
are trimmed to the first sense or two.

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

Press practice once and say the sentence: the take ends itself after the speech
stops (900 ms of quiet, 10 s at most), then you get a score, the pinyin the model
heard, and one chip per character — green heard right, amber wrong tone, red
different syllable, grey too quiet to judge — with the expected tone underneath
when it differs. A take that recorded nothing says so ("I did not hear anything —
check which microphone is selected") instead of grading silence.

`make practice-model` fetches the weights (the author states no licence, so they
are **not** committed — `frontend/public/models/` is gitignored) and the build
embeds whatever is there. Without them the practice button never appears; with them the
binary grows by ~14 MB (the whole thing is ~49 MB: frontend, HSK list, llama.cpp
libraries and this model). Recording needs `localhost` or HTTPS.

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

Go: prompt building for both directions, direction inference, the SSE contract
(deltas, mid-stream failures, timeout before and after the first delta, abort
reaching the engine, the 5,000-byte boundary), the engine's pure pieces (rune
splitting across token boundaries, library naming and unpacking, weight
resolution, GPU env), the store (validation, caps, atomic writes, reload,
export shape) and the HSK engine (max matching, per-band coverage, current band,
gaps, references, ranked search) — 135 tests across [backend](backend).

One of those loads the **real weights** and translates both ways
([engine_live_test.go](backend/engine_live_test.go)): it skips when
`make translate-model` has not run, and it asserts that cancelling stops the
model while the next request still works.

Frontend: SSE parsing, the streaming client, library helpers (search, sheet
pre-fills, tag parsing), the HSK grouping and band picker, speech availability,
the practice pipeline (tokens, sandhi, mel frontend, Viterbi alignment, verdicts)
and the component's state machine (tabs, superseded requests, save/edit, chip
editor, coverage paging, HSK search and its stale responses, record → grade) —
167 tests across [frontend/tests](frontend/tests).

Another gated test runs the **practice model** on real recordings
([tests/practice-model.test.ts](frontend/tests/practice-model.test.ts)): it skips
unless both `make practice-model` and `make practice-fixtures` have been run, and it
asserts that a correct phrase is never accused of a mistake while a wrong tone
is caught.

## Endpoints

| Route | What it is |
|-------|------------|
| `GET /` | the embedded app |
| `POST /api/translate` | validate → infer direction → prompt → run the model → stream SSE. Answers `X-Seta-Direction: en-zh\|zh-en` |
| `GET /api/items` | the whole library, newest first |
| `POST /api/items` | save one item (`chinese` required) |
| `PATCH /api/items/{id}` | partial update |
| `DELETE /api/items/{id}` | remove |
| `GET /api/items/export` | the library as a JSON download |
| `GET /api/hsk?levels=1,2,3&known=50&gaps=50` | coverage per band, the words met (each with the library items that taught it), one page of gaps; `?level=4` lists another band's gaps |
| `GET /api/hsk/search?q=yinhang&limit=50` | the whole vocabulary, ranked: characters, pinyin (tones and syllable spaces optional) or English; every hit says whether it is known |
| `GET /api/health` | liveness; never touches the model |
| `GET /api/ready` | readiness; 503 until the in-process model has loaded |

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

A run that produces no deltas at all (the model emitted only an end token) is a
502 here — there is no translation to show. `TRANSLATE_TIMEOUT` (default 60s)
bounds one request: a run that outlives it ends the stream with
`{"error":"translation timed out"}` and `[DONE]`, or a 504 if nothing was sent
yet. Closing the tab cancels the generation on the next token.

### Errors

| Condition | Status | Body |
|-----------|--------|------|
| Missing/blank text, bad JSON | 400 | `{"error":"text is required"}` |
| Text over 5,000 bytes | 413 | `{"error":"text exceeds limit"}` |
| Model not loaded (warming, or missing weights) | 503 | `{"error":"translation engine unavailable"}` |
| Model produced nothing / failed | 502, 500 | `{"error":"translation failed"}` |
| Request outlived `TRANSLATE_TIMEOUT` | 504 | `{"error":"translation timed out"}` |
| Item without `chinese` | 400 | `{"error":"chinese is required"}` |
| Item field over its cap | 400 | `{"error":"note exceeds 2000 bytes"}` |
| Unknown item id | 404 | `{"error":"item not found"}` |
| Item body over 64 KiB | 413 | `{"error":"item too large"}` |

Engine internals — model paths, Metal diagnostics, token counts — never reach
the client; they are logged instead. The failure stays visible to the operator
even when the browser must not see it.

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

That prompt is one user turn; the engine wraps it in the model's own chat
template (read from the GGUF), which llama-server used to do. Sampling is the
app's: `temperature 0.7`, `top_p 0.6`, `top_k 20`, `max_tokens 2048`.

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
| `backend/engine.go` | The model: load, chat template, sampling, streaming, cancel |
| `backend/engine_libs.go` | Embedded llama.cpp libraries: unpack + link on first run |
| `backend/translate.go` | Prompts, direction inference, the SSE contract, timeouts |
| `backend/store.go` | The library: items, validation, atomic JSON file |
| `backend/items.go` | Item + HSK HTTP handlers |
| `backend/hsk.go` | Embedded vocabulary, max-match, coverage, gaps and search |
| `backend/health.go` | Liveness (always) and readiness (engine loaded?) |
| `backend/static.go` | Embedded app, caching, security headers |
| `backend/data/` | `hsk.json` + `PROVENANCE.md` (generated by `make hsk`) |
| `backend/tools/hskgen/` | The generator behind `make hsk` |
| `backend/*_test.go` | Engine (incl. a gated live run), handler, store, HSK, static |
| `backend/libs/` | llama.cpp shared libraries, fetched by `make libs` (gitignored) |
| `frontend/index.html` | The three tabs, the save sheet, all bindings |
| `frontend/src/component.ts` | The Alpine component: state, tabs, sheet |
| `frontend/src/translate.ts` | Streaming client (injectable fetch) |
| `frontend/src/api.ts`, `http.ts` | Item/HSK calls and error plumbing |
| `frontend/src/library.ts` | Search, sheet pre-fills, tag parsing (pure) |
| `frontend/src/speak.ts` | TTS and voice availability |
| `frontend/src/practice/` | Recording, log-mel, CTC alignment, grading, verdicts |
| `frontend/src/pinyin.ts`, `sse.ts` | Hanzi → pinyin; SSE buffer parsing |
| `frontend/vite.config.ts` | Dev `/api` proxy, build target, test include |
| `scripts/fetch-libs.sh` | Pins and downloads the llama.cpp libraries |
| `models/` | The translation weights, fetched by `make translate-model` (gitignored) |
| `Makefile` | install / libs / build / run / dev / test / lint / hsk / model / clean |
