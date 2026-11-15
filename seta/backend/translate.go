// Package main implements seta's thin Go orchestrator: it builds the model
// prompt, calls the OpenAI-compatible upstream, and proxies the stream.
package main

import (
	"encoding/json"
	"fmt"
)

// promptTemplate is Tencent's Chinese prompt template for translating into
// Simplified Chinese. HY-MT takes no system prompt: the instruction and the
// text share the single user turn, and the Chinese template (not the English
// one) is the official guidance for Chinese ⇔ other pairs.
const promptTemplate = "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： %s"

// maxTextBytes caps the source text before it reaches the model, so a pasted
// document cannot silently consume the token budget and stall the stream.
const maxTextBytes = 5000

// upstreamModel is the name vLLM serves HY-MT under.
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
// vLLM-specific extras better left to launch flags).
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
