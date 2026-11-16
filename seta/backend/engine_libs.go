/* ==========================================================================
   seta — the llama.cpp libraries, inside the binary
   The libraries are embedded at build time (see scripts/fetch-libs.sh) and
   unpacked into the user's cache on first run, because a shared library has to
   exist as a file before the loader can open it. No CGo, no install step, no
   LD_LIBRARY_PATH.

   The double name is required: llama.cpp's libraries refer to each other by
   install name (libggml-base.1.dylib) while yzma's loader opens the plain name
   (libggml-base.dylib), so the unpacked directory gets a small symlink chain.
   ========================================================================== */

package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// llamaVersion is the llama.cpp build the embedded libraries come from. It is
// also the cache key, so a new build unpacks beside the old one instead of on
// top of it. Bump it together with `make libs`.
const llamaVersion = "b12359"

// libFS holds whatever `make libs` put in backend/libs. Only the library files
// matter; the directory always contains a README so a fresh clone still builds
// (and then says "run make libs" at startup rather than failing to compile).
//
//go:embed libs
var libFS embed.FS

// libsDir returns a directory holding llama.cpp's shared libraries: the
// explicit override when given, otherwise the ones embedded in this binary,
// unpacked into the user's cache.
func libsDir(explicit string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}

	root, err := os.UserCacheDir()
	if err != nil {
		return "", fmt.Errorf("locate a cache directory for the llama.cpp libraries: %w", err)
	}
	dir := filepath.Join(root, "seta", "llama.cpp", llamaVersion)
	if libsReady(dir) {
		return dir, nil
	}
	if err := unpackLibsFrom(libFS, dir); err != nil {
		return "", err
	}
	return dir, nil
}

// libsReady reports whether the directory already holds the unpacked set.
func libsReady(dir string) bool {
	if _, err := os.Stat(filepath.Join(dir, ".complete")); err != nil {
		return false
	}
	for _, pattern := range []string{"libllama*.dylib", "libllama*.so*"} {
		if matches, _ := filepath.Glob(filepath.Join(dir, pattern)); len(matches) > 0 {
			return true
		}
	}
	return false
}

// unpackLibsFrom writes the libraries in libs to dir and links their alternative
// names. The .complete marker goes last: an interrupted unpack is simply redone
// on the next run.
func unpackLibsFrom(libs fs.FS, dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create %s: %w", dir, err)
	}

	written := 0
	err := fs.WalkDir(libs, "libs", func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || !looksLikeLibrary(entry.Name()) {
			return nil
		}

		blob, err := fs.ReadFile(libs, path)
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dir, entry.Name()), blob, 0o755); err != nil {
			return err
		}
		written++
		return nil
	})
	if err != nil {
		return fmt.Errorf("unpack the embedded llama.cpp libraries: %w", err)
	}
	if written == 0 {
		return errors.New("this binary carries no llama.cpp libraries: run `make libs`, then `make build`")
	}

	if err := linkLibs(dir); err != nil {
		return err
	}

	marker := filepath.Join(dir, ".complete")
	if err := os.WriteFile(marker, []byte(llamaVersion+"\n"), 0o644); err != nil {
		return fmt.Errorf("mark the unpack complete: %w", err)
	}
	return nil
}

// linkLibs gives every versioned library its plain and major-version names, the
// way a package manager would.
func linkLibs(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		major, short, ok := libraryLinkNames(entry.Name())
		if !ok {
			continue
		}
		// The short name is what the loader opens; the major name is what the
		// neighbouring libraries reference.
		for _, name := range []string{major, short} {
			link := filepath.Join(dir, name)
			if _, err := os.Stat(link); err == nil {
				continue // already there (the real file, or the other link)
			}
			if err := os.Symlink(entry.Name(), link); err != nil {
				return fmt.Errorf("link %s: %w", name, err)
			}
		}
	}

	return nil
}

// libraryLinkNames returns the two names a versioned library also answers to:
// the major-version name its neighbours reference, and the plain name the
// loader opens. macOS is libggml-base.1.0.0.dylib → libggml-base.1.dylib and
// libggml-base.dylib; ELF is libllama.so.0.0.0 → libllama.so.0 and libllama.so.
// A name that is already short (or a Windows .dll) reports ok=false.
func libraryLinkNames(name string) (major, short string, ok bool) {
	if strings.HasSuffix(name, ".dylib") {
		stem := strings.TrimSuffix(name, ".dylib")
		dot := strings.Index(stem, ".")
		if dot <= 0 {
			return "", "", false
		}
		base, version := stem[:dot], stem[dot+1:]
		first := strings.SplitN(version, ".", 2)[0]
		if !allDigits(first) {
			return "", "", false
		}
		return base + "." + first + ".dylib", base + ".dylib", true
	}

	if i := strings.Index(name, ".so."); i > 0 {
		base := name[:i+3]
		first := strings.SplitN(name[i+4:], ".", 2)[0]
		if !allDigits(first) {
			return "", "", false
		}
		return base + "." + first, base, true
	}

	return "", "", false
}

func allDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// looksLikeLibrary reports whether a file is a shared library for this OS.
func looksLikeLibrary(name string) bool {
	return strings.HasSuffix(name, ".dylib") || strings.Contains(name, ".so")
}
