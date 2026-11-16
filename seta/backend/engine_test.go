package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCompletePrefix(t *testing.T) {
	tests := []struct {
		name string
		in   []byte
		want int
	}{
		{name: "empty", in: nil, want: 0},
		{name: "ascii", in: []byte("abc"), want: 3},
		{name: "whole hanzi", in: []byte("银行"), want: 6},
		{name: "emoji cut after one byte", in: []byte{0xF0}, want: 0},
		{name: "emoji cut after two bytes", in: []byte{0xF0, 0x9F}, want: 0},
		{
			name: "text then half a hanzi",
			// 好 is E5 A5 BD; keep two of its three bytes.
			in:   append([]byte("a"), 0xE5, 0xA5),
			want: 1,
		},
		{
			name: "text then half an emoji",
			// 🐉 is F0 9F 90 89.
			in:   append([]byte("好"), 0xF0, 0x9F, 0x90),
			want: 3,
		},
		{
			name: "invalid byte is dropped, not waited on",
			in:   []byte{'a', 0xFF, 'b'},
			want: 3, // the bad byte is skipped, so the stream cannot wedge
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, completePrefix(tt.in))
		})
	}

	t.Run("a rune split across two calls is emitted exactly once", func(t *testing.T) {
		dragon := []byte{0xF0, 0x9F, 0x90, 0x89}
		carry := append([]byte("好"), dragon[:2]...)

		whole := completePrefix(carry)
		require.Equal(t, 3, whole)
		assert.Equal(t, "好", string(carry[:whole]))

		carry = append(append([]byte{}, carry[whole:]...), dragon[2:]...)
		assert.Equal(t, 4, completePrefix(carry))
		assert.Equal(t, "🐉", string(carry))
	})
}

func TestLibraryLinkNames(t *testing.T) {
	tests := []struct {
		file      string
		wantMajor string
		wantShort string
		wantOK    bool
	}{
		{file: "libggml-base.1.0.0.dylib", wantMajor: "libggml-base.1.dylib", wantShort: "libggml-base.dylib", wantOK: true},
		{file: "libllama.1.0.0.dylib", wantMajor: "libllama.1.dylib", wantShort: "libllama.dylib", wantOK: true},
		{file: "libllama.dylib", wantOK: false},
		{file: "libllama.so.0.0.0", wantMajor: "libllama.so.0", wantShort: "libllama.so", wantOK: true},
		{file: "libggml-base.so.1.2.3", wantMajor: "libggml-base.so.1", wantShort: "libggml-base.so", wantOK: true},
		{file: "libllama.so", wantOK: false},
		{file: "llama.dll", wantOK: false},
		{file: "README.md", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.file, func(t *testing.T) {
			major, short, ok := libraryLinkNames(tt.file)
			assert.Equal(t, tt.wantOK, ok)
			assert.Equal(t, tt.wantMajor, major)
			assert.Equal(t, tt.wantShort, short)
		})
	}
}

func TestUnpackLibs(t *testing.T) {
	libs := fstest.MapFS{
		"libs/README.md":                {Data: []byte("# not a library")},
		"libs/libllama.1.0.0.dylib":     {Data: []byte("llama")},
		"libs/libggml-base.1.0.0.dylib": {Data: []byte("ggml-base")},
	}

	dir := filepath.Join(t.TempDir(), "libs")
	require.NoError(t, unpackLibsFrom(libs, dir))

	for _, name := range []string{
		"libllama.1.0.0.dylib",
		"libggml-base.1.0.0.dylib",
		"libllama.dylib",
		"libllama.1.dylib",
		"libggml-base.dylib",
		"libggml-base.1.dylib",
		".complete",
	} {
		_, err := os.Stat(filepath.Join(dir, name))
		assert.NoError(t, err, "%s should be unpacked or linked", name)
	}

	// The README is not a library: it must not be unpacked.
	_, err := os.Stat(filepath.Join(dir, "README.md"))
	assert.True(t, os.IsNotExist(err))

	// The links point at the real files, so the loader and the sibling
	// libraries both resolve.
	link, err := os.Readlink(filepath.Join(dir, "libllama.dylib"))
	require.NoError(t, err)
	assert.Equal(t, "libllama.1.0.0.dylib", link)

	assert.True(t, libsReady(dir), "the .complete marker means the unpack is done")
}

func TestUnpackLibsWithNothingToUnpack(t *testing.T) {
	libs := fstest.MapFS{"libs/README.md": {Data: []byte("no libraries here")}}

	err := unpackLibsFrom(libs, t.TempDir())

	require.Error(t, err)
	assert.Contains(t, err.Error(), "make libs", "the message must say how to fix it")
}

func TestLibsReadyNeedsTheMarker(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "libllama.1.0.0.dylib"), []byte("x"), 0o644))

	assert.False(t, libsReady(dir), "a half-unpacked directory is not ready")
}

func TestResolveModelPath(t *testing.T) {
	const name = "HY-MT1.5-1.8B-Q4_K_M.gguf"

	t.Run("explicit path wins", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "weights.gguf")
		require.NoError(t, os.WriteFile(path, []byte("x"), 0o644))

		got, err := resolveModelPath(path)
		require.NoError(t, err)
		assert.Equal(t, path, got)
	})

	t.Run("explicit path that is not there is an error", func(t *testing.T) {
		_, err := resolveModelPath(filepath.Join(t.TempDir(), "missing.gguf"))
		require.Error(t, err)
	})

	t.Run("models directory beside the working directory", func(t *testing.T) {
		dir := t.TempDir()
		require.NoError(t, os.MkdirAll(filepath.Join(dir, "models"), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "models", name), []byte("x"), 0o644))
		t.Chdir(dir)
		t.Setenv("HF_HOME", filepath.Join(dir, "no-cache"))

		got, err := resolveModelPath("")
		require.NoError(t, err)
		assert.Equal(t, filepath.Join("models", name), got, "make translate-model fills this one")
	})

	t.Run("the hugging face cache llama-server filled", func(t *testing.T) {
		dir := t.TempDir()
		snapshot := filepath.Join(dir, "hub", "models--tencent--HY-MT1.5-1.8B-GGUF",
			"snapshots", "265b2e615a7dc9b06c435dc878829ad99a512ba2")
		require.NoError(t, os.MkdirAll(snapshot, 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(snapshot, name), []byte("x"), 0o644))

		t.Chdir(t.TempDir()) // no models/ here
		t.Setenv("HF_HOME", dir)

		got, err := resolveModelPath("")
		require.NoError(t, err)
		assert.Equal(t, filepath.Join(snapshot, name), got, "an existing 1.1 GB download is reused")
	})

	t.Run("nothing anywhere", func(t *testing.T) {
		t.Chdir(t.TempDir())
		t.Setenv("HF_HOME", t.TempDir())

		_, err := resolveModelPath("")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "make translate-model")
	})
}

func TestGpuLayers(t *testing.T) {
	tests := []struct {
		value string
		want  int32
	}{
		{value: "", want: -1},
		{value: "0", want: 0},
		{value: "cpu", want: 0},
		{value: "OFF", want: 0},
		{value: "99", want: -1},
	}

	for _, tt := range tests {
		t.Setenv("GPU_LAYERS", tt.value)
		assert.Equal(t, tt.want, gpuLayers(), "GPU_LAYERS=%q", tt.value)
	}
}

func TestEngineIsNotReadyUntilLoaded(t *testing.T) {
	engine := newEngine("", "")

	assert.False(t, engine.Ready())
	assert.ErrorIs(t, engine.Translate(context.Background(), "你好", func(string) error { return nil }), engineUnavailable)
}
