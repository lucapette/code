package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// promptTemplate is Tencent's Chinese prompt template for translating into
// Simplified Chinese. HY-MT takes no system prompt: the instruction and the
// text share the single user turn, and the Chinese template (not the English
// one) is the official guidance for Chinese ⇔ other pairs.
const promptTemplate = "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： %s"

// maxTextBytes caps the source text before it reaches the model, so a pasted
// document cannot silently consume the token budget and stall the stream.
const maxTextBytes = 5000

// upstreamModel is the name the upstream serves HY-MT under.
const upstreamModel = "hy-mt-1.8b"

// TranslateRequest is the app's only input shape: text in, direction fixed.
// There is deliberately no source_lang or target_lang field.
type TranslateRequest struct {
	Text string `json:"text"`
}

// buildUserPrompt collapses instruction and source text into the one user
// turn the model expects.
func buildUserPrompt(req TranslateRequest) string {
	return fmt.Sprintf(promptTemplate, req.Text)
}

// upstreamMessage is one OpenAI-compatible chat message. Only "user" is ever
// sent — HY-MT is trained to take everything in a single turn.
type upstreamMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// upstreamChatRequest is the body sent to the upstream chat completions
// endpoint. Sampling values are Tencent's recommended ones; only the
// universally safe fields travel here (top_k and repetition_penalty are
// upstream-specific extras better left to launch flags).
type upstreamChatRequest struct {
	Model       string            `json:"model"`
	Messages    []upstreamMessage `json:"messages"`
	Temperature float64           `json:"temperature"`
	TopP        float64           `json:"top_p"`
	MaxTokens   int               `json:"max_tokens"`
	Stream      bool              `json:"stream"`
}

// newUpstreamRequest builds the stream request for the given user prompt.
func newUpstreamRequest(prompt string) upstreamChatRequest {
	return upstreamChatRequest{
		Model:       upstreamModel,
		Messages:    []upstreamMessage{{Role: "user", Content: prompt}},
		Temperature: 0.7,
		TopP:        0.6,
		MaxTokens:   2048,
		Stream:      true,
	}
}

// upstreamChunk is one OpenAI-compatible stream event. Only the delta
// content of the first choice matters to us.
type upstreamChunk struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
}

// extractDelta decodes one upstream SSE payload (the "data: " prefix already
// stripped). ok=false with a nil error means a benign chunk carrying no
// content (the role-only first chunk, a usage footer); a non-nil error means
// the payload is malformed.
func extractDelta(payload string) (delta string, ok bool, err error) {
	var chunk upstreamChunk
	if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
		return "", false, fmt.Errorf("decode upstream chunk: %w", err)
	}
	if len(chunk.Choices) == 0 || chunk.Choices[0].Delta.Content == "" {
		return "", false, nil
	}
	return chunk.Choices[0].Delta.Content, true, nil
}

// consumeUpstreamLine applies one upstream SSE line to the outgoing stream.
// done reports the upstream terminator; a non-nil error means the payload was
// malformed.
func consumeUpstreamLine(stream *sseWriter, line string) (done bool, err error) {
	if !strings.HasPrefix(line, "data:") {
		return false, nil // comments, event fields, blank separators
	}
	payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
	if payload == "[DONE]" {
		return true, nil
	}

	delta, ok, err := extractDelta(payload)
	if err != nil {
		return false, err
	}
	if ok {
		stream.write(delta)
	}
	return false, nil
}

// upstreamLine is one line of the upstream body; eof marks the terminal value.
type upstreamLine struct {
	text string
	err  error // scanner failure, nil on a clean end of body
	eof  bool
}

// pumpLines reads the upstream body line by line on its own goroutine, so the
// handler can select on a stall timer as well as on input. stop releases the
// pump when the handler gives up, so nothing is left blocked on a dead model.
func pumpLines(body io.Reader, stop <-chan struct{}) <-chan upstreamLine {
	lines := make(chan upstreamLine)
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	go func() {
		defer close(lines)
		for scanner.Scan() {
			select {
			case lines <- upstreamLine{text: scanner.Text()}:
			case <-stop:
				return
			}
		}
		select {
		case lines <- upstreamLine{eof: true, err: scanner.Err()}:
		case <-stop:
		}
	}()

	return lines
}

// translateHandler validates the request, streams the upstream completion
// through as normalized SSE, and maps every failure to a clean status. Raw
// upstream error bodies are never forwarded: they can leak model paths, GPU
// diagnostics, or internal hostnames. The failures are logged, though — the
// operator needs them even when the client must not see them.
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

	upstreamBody, err := json.Marshal(newUpstreamRequest(buildUserPrompt(req)))
	if err != nil {
		log.Printf("encode upstream request: %v", err)
		writeError(w, http.StatusInternalServerError, "translation failed")
		return
	}

	// The parent is r.Context() on purpose: an aborted frontend fetch cancels
	// the vLLM generation instead of burning GPU cycles on it. The child lets
	// us cut the connection ourselves once the terminator arrives.
	ctx, cancelUpstream := context.WithCancel(r.Context())
	defer cancelUpstream()

	upstreamReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.upstreamURL, bytes.NewReader(upstreamBody))
	if err != nil {
		log.Printf("build upstream request: %v", err)
		writeError(w, http.StatusInternalServerError, "translation failed")
		return
	}
	upstreamReq.Header.Set("Content-Type", "application/json")
	upstreamReq.Header.Set("Accept", "text/event-stream")

	resp, err := a.client.Do(upstreamReq)
	if err != nil {
		if r.Context().Err() != nil {
			return // client already gone — nothing to report
		}
		log.Printf("upstream request: %v", err)
		writeError(w, http.StatusServiceUnavailable, "translation engine unavailable")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Drain a little for connection reuse; never forward the body.
		io.Copy(io.Discard, io.LimitReader(resp.Body, 8<<10))
		log.Printf("upstream status %s", resp.Status)
		writeError(w, http.StatusBadGateway, "invalid upstream response")
		return
	}

	// The SSE headers are committed lazily: until the first event is known
	// good, a failure can still become a proper 502 instead of a broken
	// 200 stream.
	stream := &sseWriter{w: w}
	stop := make(chan struct{})
	defer close(stop)
	lines := pumpLines(resp.Body, stop)

	idle := time.NewTimer(a.streamTimeout())
	defer idle.Stop()

	var (
		sawDone bool
		pumpErr error
	)

loop:
	for {
		select {
		case <-r.Context().Done():
			return // client went away mid-stream

		case <-idle.C:
			log.Printf("upstream stream idle for %s", a.streamTimeout())
			if stream.hasStarted() {
				stream.fail("translation timed out")
			} else {
				writeError(w, http.StatusGatewayTimeout, "translation timed out")
			}
			return

		case line, ok := <-lines:
			if !ok {
				break loop // pump stopped early; nothing left to read
			}
			if line.eof {
				pumpErr = line.err
				break loop
			}

			if !idle.Stop() {
				select {
				case <-idle.C:
				default:
				}
			}
			idle.Reset(a.streamTimeout())

			done, err := consumeUpstreamLine(stream, line.text)
			if err != nil {
				log.Printf("upstream stream: %v", err)
				if stream.hasStarted() {
					stream.fail("invalid upstream response")
				} else {
					writeError(w, http.StatusBadGateway, "invalid upstream response")
				}
				return
			}
			if done {
				sawDone = true
				break loop
			}
		}
	}

	if pumpErr != nil {
		if r.Context().Err() != nil {
			return // client went away mid-stream
		}
		log.Printf("upstream stream: %v", pumpErr)
		if stream.hasStarted() {
			stream.fail("invalid upstream response")
		} else {
			writeError(w, http.StatusBadGateway, "invalid upstream response")
		}
		return
	}

	if !stream.hasStarted() {
		// 200 with nothing usable: an empty completion, or a bare [DONE] with
		// no deltas. Either way there is no translation to show, so say so
		// rather than closing an empty stream that reads as "no input".
		log.Printf("upstream stream produced no translation")
		writeError(w, http.StatusBadGateway, "invalid upstream response")
		return
	}

	if !sawDone {
		log.Printf("upstream stream ended without [DONE]")
	} else {
		// We stopped at the terminator; close the connection instead of
		// draining it, so a chatty upstream cannot pin this handler.
		cancelUpstream()
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
