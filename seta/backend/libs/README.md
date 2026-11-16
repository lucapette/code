# llama.cpp libraries

`make libs` fills this directory with the llama.cpp shared libraries for the
machine you are building on. They are embedded into the binary at build time
(`backend/engine_libs.go`) and unpacked into the user's cache on first run, so
the app ships as one file with no CGo and no install step.

Nothing here is committed except this file, which keeps `//go:embed libs`
satisfied on a fresh clone — the binary then builds fine and says
"run `make libs`, then `make build`" if you try to translate.

What lands here (macOS arm64, llama.cpp b12359):

    libllama.1.0.0.dylib
    libggml.1.0.0.dylib
    libggml-base.1.0.0.dylib
    libggml-cpu.1.0.0.dylib
    libggml-metal.1.0.0.dylib
    libggml-blas.1.0.0.dylib
    libggml-rpc.1.0.0.dylib

Copied as plain files, without symlinks: `go:embed` cannot follow them, so the
short and major-version names (`libllama.dylib`, `libllama.1.dylib`) are created
when the app unpacks the set. Linux gets the same set with `.so` names; Windows
with `.dll`.
