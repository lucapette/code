/* ==========================================================================
   seta — the translation engine
   The model runs in this process. llama.cpp is called through yzma (purego +
   ffi), so there is no CGo, no model server, no port and no supervisor: one
   binary, one weights file.

   The engine owns three things the HTTP layer must not know about: the model's
   chat template, the KV cache (one context, cleared per request), and the
   sampler chain. Everything else — the prompt's wording, the direction
   heuristic, the SSE contract — stays where it was.
   ========================================================================== */

package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"github.com/hybridgroup/yzma/pkg/llama"
)

// Model sampling, as recommended by Tencent: temperature 0.7 and top_p 0.6 are
// the values the app has always sent to llama-server, and top_k 20 is the
// model's own preference from its GGUF metadata. maxTokens matches the old
// request; the context is large enough for the app's 5000-byte cap on one side
// and a full translation on the other.
const (
	engineCtxSize     = 4096
	engineMaxTokens   = 2048
	engineTemperature = 0.7
	engineTopP        = 0.6
	engineTopK        = 20
)

// engineUnavailable is what the request path gets while the weights load, or
// when they could not load at all. Only the server log says which.
var engineUnavailable = errors.New("translation engine is not available")

// translator is the one thing the HTTP layer needs from the engine. Tests hand
// it a scripted fake; main hands it the real one.
type translator interface {
	// Ready reports whether the model is loaded and warm.
	Ready() bool
	// Translate streams the translation of one user message through emit, one
	// UTF-8-clean piece at a time, and returns when the model stops, the token
	// budget runs out, ctx is done, or something breaks.
	Translate(ctx context.Context, message string, emit func(piece string) error) error
}

// engine is the single in-process llama.cpp model. llama_context is not safe
// for concurrent use, so requests queue on a one-slot semaphore — the same
// serialisation llama-server gave us with --parallel 1.
type engine struct {
	modelPath string // "" means "find it", see resolveModelPath
	libPath   string // "" means "the embedded libraries", see libsDir
	sem       chan struct{}
	loadDone  chan struct{} // closed when Load returns, either way
	ready     atomic.Bool

	// Set once by Load, read-only afterwards; requests only read them under sem.
	model    llama.Model
	ctx      llama.Context
	vocab    llama.Vocab
	template string
}

func newEngine(modelPath, libPath string) *engine {
	return &engine{
		modelPath: modelPath,
		libPath:   libPath,
		sem:       make(chan struct{}, 1),
		loadDone:  make(chan struct{}),
	}
}

// Ready reports whether the model has finished loading.
func (e *engine) Ready() bool { return e.ready.Load() }

// Load brings up llama.cpp, the weights and the context, then runs one token
// through the model so the first real request does not pay for Metal's kernel
// compilation. It is slow (≈6 s) and meant to run on its own goroutine.
func (e *engine) Load() error {
	defer close(e.loadDone)

	libs, err := libsDir(e.libPath)
	if err != nil {
		return err
	}
	if err := llama.Load(libs); err != nil {
		return fmt.Errorf("load llama.cpp libraries from %s: %w", libs, err)
	}
	// The loader logs every control token in the vocabulary at startup — about
	// 9 KB of noise per launch. Silence it; the app logs what matters.
	llama.LogSet(llama.LogSilent())
	if err := llama.Init(); err != nil {
		return fmt.Errorf("init llama.cpp backend: %w", err)
	}

	modelPath, err := resolveModelPath(e.modelPath)
	if err != nil {
		return err
	}

	modelParams := llama.ModelDefaultParams()
	modelParams.NGpuLayers = gpuLayers()
	model, err := llama.ModelLoadFromFile(modelPath, modelParams)
	if err != nil {
		return fmt.Errorf("load model %s: %w", modelPath, err)
	}

	ctxParams := llama.ContextDefaultParams()
	ctxParams.NCtx = engineCtxSize
	ctxParams.NBatch = engineCtxSize
	ctxParams.NThreads = int32(runtime.NumCPU())
	ctxParams.NThreadsBatch = int32(runtime.NumCPU())
	ctx, err := llama.InitFromModel(model, ctxParams)
	if err != nil {
		llama.ModelFree(model)
		return fmt.Errorf("create context: %w", err)
	}

	e.model, e.ctx = model, ctx
	e.vocab = llama.ModelGetVocab(model)
	e.template = llama.ModelChatTemplate(model, "")

	// Warm the graph: the first decode is what compiles Metal's pipelines, and
	// paying for that here keeps the first translation instant.
	warmCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := e.generate(warmCtx, "你好", 1, func(string) error { return nil }); err != nil {
		log.Printf("translation engine: warm-up failed (%v); continuing anyway", err)
	}

	e.ready.Store(true)
	log.Printf("translation model ready: %s (llama.cpp %s, %d threads)", modelPath, llamaVersion, runtime.NumCPU())
	return nil
}

// Close releases the context and the weights. Worth doing on shutdown: an
// unfreed Metal device trips an assert in llama.cpp's static destructors, which
// turns a clean exit into a crash message nobody can act on.
func (e *engine) Close() {
	// A shutdown during the six-second load would otherwise free llama.cpp's
	// backend under the loader's feet. Wait for it; a load that never finishes
	// is not worth waiting for.
	select {
	case <-e.loadDone:
	case <-time.After(10 * time.Second):
		log.Printf("shutdown: the model is still loading, leaving teardown to the OS")
		return
	}

	e.ready.Store(false)

	select {
	case e.sem <- struct{}{}:
		defer func() { <-e.sem }()
	default:
		// A translation is in flight; exit anyway rather than wait for it.
		return
	}

	if e.ctx != 0 {
		if err := llama.Free(e.ctx); err != nil {
			log.Printf("free context: %v", err)
		}
		e.ctx = 0
	}
	if e.model != 0 {
		if err := llama.ModelFree(e.model); err != nil {
			log.Printf("free model: %v", err)
		}
		e.model = 0
	}
	llama.BackendFree()
}

// Translate answers one request. Requests are serialised on the context, and
// the whole thing is bounded by the caller's context.
func (e *engine) Translate(ctx context.Context, message string, emit func(piece string) error) error {
	if !e.ready.Load() {
		return engineUnavailable
	}

	select {
	case e.sem <- struct{}{}:
		defer func() { <-e.sem }()
	case <-ctx.Done():
		return ctx.Err()
	}

	return e.generate(ctx, message, engineMaxTokens, emit)
}

// generate runs one completion: clear the KV cache, apply the model's chat
// template, decode the prompt, then sample token by token. Cancellation is
// checked between tokens, so an abandoned tab stops the model within one token
// (~15 ms) instead of finishing a translation nobody wants.
func (e *engine) generate(ctx context.Context, message string, budget int, emit func(piece string) error) error {
	memory, err := llama.GetMemory(e.ctx)
	if err != nil {
		return fmt.Errorf("context memory: %w", err)
	}
	if err := llama.MemoryClear(memory, true); err != nil {
		return fmt.Errorf("clear context: %w", err)
	}

	tokens := llama.Tokenize(e.vocab, e.applyTemplate(message), true, true)
	if len(tokens) == 0 {
		return errors.New("prompt tokenised to nothing")
	}
	// Never ask for more than the context can hold: the prompt is already in it.
	if room := engineCtxSize - len(tokens) - 8; budget > room {
		budget = room
	}
	if budget <= 0 {
		return fmt.Errorf("prompt uses the whole context (%d tokens)", len(tokens))
	}

	if _, err := llama.Decode(e.ctx, llama.BatchGetOne(tokens)); err != nil {
		return fmt.Errorf("decode prompt: %w", err)
	}

	sampler := llama.SamplerChainInit(llama.SamplerChainDefaultParams())
	defer llama.SamplerFree(sampler)
	llama.SamplerChainAdd(sampler, llama.SamplerInitTopK(engineTopK))
	llama.SamplerChainAdd(sampler, llama.SamplerInitTopP(engineTopP, 1))
	llama.SamplerChainAdd(sampler, llama.SamplerInitTemp(engineTemperature))
	llama.SamplerChainAdd(sampler, llama.SamplerInitDist(rand.Uint32()))

	piece := make([]byte, 256)
	var carry []byte

	for produced := 0; produced < budget; produced++ {
		if err := ctx.Err(); err != nil {
			return err
		}

		token := llama.SamplerSample(sampler, e.ctx, -1)
		if llama.VocabIsEOG(e.vocab, token) {
			return nil
		}

		written := llama.TokenToPiece(e.vocab, token, piece, 0, false)
		if written < 0 {
			return fmt.Errorf("token %d holds no text (%d)", token, written)
		}

		// A token can end mid-rune: byte-fallback pieces for emoji and rare
		// hanzi split a character across two tokens. Hold the incomplete tail
		// back, or json.Marshal would replace it with U+FFFD.
		carry = append(carry, piece[:written]...)
		if whole := completePrefix(carry); whole > 0 {
			if err := emit(string(carry[:whole])); err != nil {
				return err
			}
			carry = carry[whole:]
		}

		if _, err := llama.Decode(e.ctx, llama.BatchGetOne([]llama.Token{token})); err != nil {
			return fmt.Errorf("decode token %d: %w", token, err)
		}
	}

	return nil // out of budget: the caller's stream just ends
}

// applyTemplate renders the model's own chat template around one user turn.
// HY-MT takes no system prompt — instruction and text share the one turn — and
// llama-server used to do this for us.
func (e *engine) applyTemplate(message string) string {
	chat := []llama.ChatMessage{llama.NewChatMessage("user", message)}
	size := 2*len(message) + 1024
	for {
		buf := make([]byte, size)
		written := llama.ChatApplyTemplate(e.template, chat, true, buf)
		if written <= 0 {
			return message // no template in the GGUF: the raw text is all we have
		}
		if int(written) <= len(buf) {
			return string(buf[:written])
		}
		size = int(written)
	}
}

// completePrefix returns how many bytes at the front of b are whole UTF-8
// runes. An incomplete trailing sequence is left for the next piece; a byte
// that cannot begin any rune is dropped, so a broken stream cannot wedge the
// carry buffer forever.
func completePrefix(b []byte) int {
	whole := 0
	for i := 0; i < len(b); {
		if !utf8.FullRune(b[i:]) {
			break
		}
		r, size := utf8.DecodeRune(b[i:])
		if r == utf8.RuneError && size == 1 {
			i++ // invalid byte: skip it rather than stalling
			whole = i
			continue
		}
		i += size
		whole = i
	}
	return whole
}

// gpuLayers is how much of the model goes to the GPU: all of it by default, so
// Metal (macOS) and CUDA/Vulkan (Linux) pick it up without flags. -1 means
// "everything" to llama.cpp; CPU-only is 0.
func gpuLayers() int32 {
	switch strings.ToLower(os.Getenv("GPU_LAYERS")) {
	case "0", "cpu", "off":
		return 0
	case "":
		return -1
	}
	return -1
}

// resolveModelPath finds the translation weights. MODEL_PATH wins; then
// models/ under the working directory (what `make translate-model` fills); then
// the Hugging Face cache that llama-server used to download into, so an
// existing 1.1 GB file is not downloaded twice.
func resolveModelPath(explicit string) (string, error) {
	const name = "HY-MT1.5-1.8B-Q4_K_M.gguf"

	if explicit != "" {
		if _, err := os.Stat(explicit); err != nil {
			return "", fmt.Errorf("translation model %s: %w", explicit, err)
		}
		return explicit, nil
	}

	candidates := []string{filepath.Join("models", name)}
	for _, root := range hfCaches() {
		pattern := filepath.Join(root, "hub", "models--tencent--HY-MT1.5-1.8B-GGUF", "snapshots", "*", name)
		matches, _ := filepath.Glob(pattern)
		candidates = append(candidates, matches...)
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("translation model not found: run `make translate-model`, or set MODEL_PATH (looked in %s)",
		strings.Join(candidates, ", "))
}

// hfCaches lists where a Hugging Face download may live, newest convention
// first.
func hfCaches() []string {
	if home := os.Getenv("HF_HOME"); home != "" {
		return []string{home}
	}
	if cache, err := os.UserCacheDir(); err == nil {
		return []string{filepath.Join(cache, "huggingface")}
	}
	return nil
}
