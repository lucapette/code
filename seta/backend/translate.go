/* ==========================================================================
   seta — the translate endpoint
   The app's contract, unchanged from the days of the model sidecar: POST some
   text, get back SSE deltas, then [DONE]. What changed is what sits behind it —
   the model now runs in this process (engine.go), so there is no upstream HTTP
   request to make, no stream to pump and no idle watchdog to run.

   What stays here is the part that is about the product rather than the model:
   Tencent's prompt templates, the direction heuristic, the byte cap, and the
   SSE writer both the happy path and the failure path use.
   ========================================================================== */

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// Tencent's Chinese prompt templates, one per direction. HY-MT takes no system
// prompt: the instruction and the text share the single user turn, and the
// Chinese template (not the English one) is the official guidance for Chinese ⇔
// other pairs — which is the only kind of pair this app has.
const (
	promptToChinese = "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： %s"
	promptToEnglish = "将以下文本翻译为英文，注意只需要输出翻译后的结果，不要额外解释： %s"
)

// directionHeader names the response header that carries the inferred
// direction back to the client.
const directionHeader = "X-Seta-Direction"

// Direction is which way a request translates. It is inferred from the text,
// never chosen by the user, so it is not part of the wire request.
type Direction string

const (
	// ToEnglish means the input was Chinese: the user is looking up something
	// they met in the wild, so the Chinese they pasted is the item to keep.
	ToEnglish Direction = "zh-en"
	// ToChinese means the input was not Chinese: the user is producing Chinese,
	// so the translation is the item to keep.
	ToChinese Direction = "en-zh"
)

// detectDirection applies the app's single heuristic: any CJK ideograph means
// the input is Chinese and the translation should go to English.
func detectDirection(text string) Direction {
	for _, r := range text {
		if isCJK(r) {
			return ToEnglish
		}
	}
	return ToChinese
}

// isCJK reports whether r is a CJK Unified Ideograph (U+4E00–U+9FFF).
func isCJK(r rune) bool {
	return r >= '\u4e00' && r <= '\u9fff'
}

// maxTextBytes caps the source text before it reaches the model, so a pasted
// document cannot silently consume the token budget and stall the stream.
const maxTextBytes = 5000

// TranslateRequest is the app's only input shape: text in, direction fixed.
// There is deliberately no source_lang or target_lang field.
type TranslateRequest struct {
	Text string `json:"text"`
}

// buildUserPrompt collapses instruction and source text into the one user
// turn the model expects, in the direction the text implies.
func buildUserPrompt(req TranslateRequest) string {
	return buildPrompt(req.Text, detectDirection(req.Text))
}

// buildPrompt fills the template for a direction.
func buildPrompt(text string, direction Direction) string {
	if direction == ToEnglish {
		return fmt.Sprintf(promptToEnglish, text)
	}
	return fmt.Sprintf(promptToChinese, text)
}

// translateHandler validates the request, streams the engine's translation as
// SSE, and maps every failure to a clean status. Engine internals — model
// paths, Metal diagnostics, token counts — are logged, never forwarded.
func (a *app) translateHandler(w http.ResponseWriter, r *http.Request) {
	var req TranslateRequest
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "text exceeds limit")
			return
		}
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}
	if len(req.Text) > maxTextBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "text exceeds limit")
		return
	}

	// The client renders the result differently per direction (pinyin and a
	// Chinese voice only make sense one way), so it gets told which way this
	// went instead of guessing with its own copy of the heuristic.
	direction := detectDirection(req.Text)
	w.Header().Set(directionHeader, string(direction))

	if !a.engine.Ready() {
		writeError(w, http.StatusServiceUnavailable, "translation engine unavailable")
		return
	}

	// The parent is r.Context() on purpose: closing the tab stops the model on
	// the next token instead of finishing a translation nobody will read. The
	// timeout bounds a pathological run — it is not an idle-gap timer, because
	// an in-process decode cannot go quiet.
	ctx, cancel := context.WithTimeout(r.Context(), a.translateTimeout())
	defer cancel()

	// SSE headers are committed lazily: until the first delta arrives, a
	// failure can still become a proper status instead of a broken 200 stream.
	stream := &sseWriter{w: w}

	err := a.engine.Translate(ctx, buildPrompt(req.Text, direction), func(piece string) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		stream.write(piece)
		return nil
	})

	switch {
	case err == nil:
		// The model stopped on its own; there may still be nothing to show.

	case errors.Is(err, context.Canceled):
		return // the client went away mid-stream

	case errors.Is(err, context.DeadlineExceeded):
		log.Printf("translation timed out after %s", a.translateTimeout())
		if stream.hasStarted() {
			stream.fail("translation timed out")
		} else {
			writeError(w, http.StatusGatewayTimeout, "translation timed out")
		}
		return

	case errors.Is(err, engineUnavailable):
		writeError(w, http.StatusServiceUnavailable, "translation engine unavailable")
		return

	default:
		log.Printf("translation: %v", err)
		if stream.hasStarted() {
			stream.fail("translation failed")
		} else {
			writeError(w, http.StatusInternalServerError, "translation failed")
		}
		return
	}

	if !stream.hasStarted() {
		// A 200 with nothing in it reads as "no input"; say what happened.
		log.Printf("translation produced no output")
		writeError(w, http.StatusBadGateway, "translation failed")
		return
	}

	stream.finish()
}

// sseWriter emits the frontend's stream contract — data: {"delta":"…"} per
// chunk, data: [DONE] to finish, data: {"error":"…"} for mid-stream
// failures — flushing after every event so the browser renders live.
type sseWriter struct {
	w       http.ResponseWriter
	flusher http.Flusher
	started bool
}

func (s *sseWriter) start() {
	if s.started {
		return
	}
	s.started = true
	h := s.w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	s.w.WriteHeader(http.StatusOK)
	s.flusher, _ = s.w.(http.Flusher)
}

func (s *sseWriter) write(delta string) {
	s.start()
	s.emit(map[string]string{"delta": delta})
}

// fail reports a mid-stream error. Deltas already sent stand; the frontend
// shows the error alongside them.
func (s *sseWriter) fail(message string) {
	s.start()
	s.emit(map[string]string{"error": message})
	s.finish()
}

func (s *sseWriter) finish() {
	s.start()
	fmt.Fprint(s.w, "data: [DONE]\n\n")
	s.flush()
}

func (s *sseWriter) emit(payload map[string]string) {
	b, err := json.Marshal(payload)
	if err != nil {
		return // a map[string]string never fails to encode
	}
	fmt.Fprint(s.w, "data: ")
	s.w.Write(b)
	fmt.Fprint(s.w, "\n\n")
	s.flush()
}

func (s *sseWriter) flush() {
	if s.flusher != nil {
		s.flusher.Flush()
	}
}

func (s *sseWriter) hasStarted() bool {
	return s.started
}

// translateTimeout is the per-request deadline, with the default applied for
// the zero value so a hand-built app in tests still translates.
func (a *app) translateTimeout() time.Duration {
	if a.timeout > 0 {
		return a.timeout
	}
	return defaultTranslateTimeout
}
