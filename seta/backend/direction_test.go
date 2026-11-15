package main

import (
	"fmt"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDetectDirection(t *testing.T) {
	tests := []struct {
		name string
		text string
		want Direction
	}{
		{name: "english in, chinese out", text: "The caravan carried silk west.", want: ToChinese},
		{name: "chinese in, english out", text: "银行在哪里？", want: ToEnglish},
		{name: "any chinese wins", text: "my tutor said 谢谢 today", want: ToEnglish},
		{name: "a single hanzi is enough", text: "好", want: ToEnglish},
		{name: "punctuation only", text: "，。！？", want: ToChinese},
		{name: "empty", text: "", want: ToChinese},
		{name: "digits and latin", text: "HSK 3.0 level 1", want: ToChinese},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, detectDirection(tt.text))
		})
	}
}

func TestBuildPromptPerDirection(t *testing.T) {
	assert.Equal(t,
		"将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： hello",
		buildPrompt("hello", ToChinese))
	assert.Equal(t,
		"将以下文本翻译为英文，注意只需要输出翻译后的结果，不要额外解释： 你好",
		buildPrompt("你好", ToEnglish))

	// buildUserPrompt infers the direction from the text itself.
	assert.Contains(t, buildUserPrompt(TranslateRequest{Text: "你好"}), "翻译为英文")
	assert.Contains(t, buildUserPrompt(TranslateRequest{Text: "hello"}), "翻译为简体中文")
}

// directionEcho is a stub model that records the prompt it was sent.
func directionEcho(t *testing.T, seen *string) http.HandlerFunc {
	t.Helper()
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		*seen = string(body)

		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\n\n")
		fmt.Fprint(w, "data: [DONE]\n\n")
		w.(http.Flusher).Flush()
	}
}

func TestTranslateHandlerReportsDirection(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		want      Direction
		wantInReq string
	}{
		{
			name:      "chinese input goes to english",
			body:      `{"text":"你好"}`,
			want:      ToEnglish,
			wantInReq: "翻译为英文",
		},
		{
			name:      "english input goes to chinese",
			body:      `{"text":"hello"}`,
			want:      ToChinese,
			wantInReq: "翻译为简体中文",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var upstreamBody string
			server := newTestApp(t, directionEcho(t, &upstreamBody))

			resp := post(t, server, tt.body)
			require.Equal(t, http.StatusOK, resp.StatusCode)

			assert.Equal(t, string(tt.want), resp.Header.Get(directionHeader),
				"the client needs to know which language the output is in")
			assert.Contains(t, upstreamBody, tt.wantInReq,
				"the prompt must use the template for that direction")
			assert.NotContains(t, upstreamBody, `"role":"system"`)
		})
	}
}
