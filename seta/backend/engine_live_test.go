package main

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestEngineTranslatesLive runs the real weights in this process. It needs both
// halves of the payload — the GGUF (`make translate-model`, or an existing
// Hugging Face cache) and the embedded llama.cpp libraries (`make libs`) — and
// skips when either is missing, the way the practice model's end-to-end test
// does. It is the only place that proves the whole chain: load, template,
// decode, stream, cancel, reuse.
func TestEngineTranslatesLive(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: loading the model takes seconds")
	}

	modelPath, err := resolveModelPath(os.Getenv("MODEL_PATH"))
	if err != nil {
		t.Skipf("no translation weights on this machine: %v", err)
	}

	engine := newEngine(modelPath, os.Getenv("LIB_DIR"))
	require.NoError(t, engine.Load(), "load the engine")
	require.True(t, engine.Ready())

	// Free the model and the Metal device before the process exits: llama.cpp
	// asserts in its static destructors otherwise, and the assert is noisy even
	// when every test passed.
	t.Cleanup(engine.Close)

	translate := func(ctx context.Context, text string, onPiece func(string)) (string, error) {
		var out strings.Builder
		err := engine.Translate(ctx, buildUserPrompt(TranslateRequest{Text: text}), func(piece string) error {
			out.WriteString(piece)
			if onPiece != nil {
				onPiece(piece)
			}
			return nil
		})
		return out.String(), err
	}

	t.Run("translates english to chinese", func(t *testing.T) {
		out, err := translate(context.Background(), "I went to the bank to get some money.", nil)
		require.NoError(t, err)

		assert.Contains(t, out, "银行")
		assert.True(t, hasCJK(out), "the output should be Chinese, got %q", out)
	})

	t.Run("translates chinese to english", func(t *testing.T) {
		out, err := translate(context.Background(), "我去银行取钱。", nil)
		require.NoError(t, err)

		assert.NotEmpty(t, out)
		assert.False(t, hasCJK(out), "the output should be English, got %q", out)
	})

	t.Run("cancelling stops the model and the next request still works", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		pieces := 0
		start := time.Now()
		_, err := translate(ctx, "This morning the caravan left the oasis before sunrise, carrying silk and a great deal of patience.", func(string) {
			pieces++
			if pieces == 2 {
				cancel()
			}
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, context.Canceled)
		assert.Less(t, time.Since(start), 5*time.Second, "cancelling must stop generation, not wait it out")

		// The context was reused for the next request: this is what proves the
		// KV cache is cleared and the semaphore released.
		out, err := translate(context.Background(), "Good morning.", nil)
		require.NoError(t, err)
		assert.True(t, hasCJK(out), "a request after an abort should still translate, got %q", out)
	})
}

// hasCJK reports whether s contains a CJK ideograph.
func hasCJK(s string) bool {
	for _, r := range s {
		if isCJK(r) {
			return true
		}
	}
	return false
}
