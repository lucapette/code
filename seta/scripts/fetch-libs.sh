#!/usr/bin/env bash
# Fetch the llama.cpp shared libraries that seta embeds into its binary.
#
#   scripts/fetch-libs.sh        # for this machine, if not already there
#   FORCE=1 scripts/fetch-libs.sh
#
# They land in backend/libs/ (gitignored) and are embedded at build time; the
# app unpacks them into the user's cache on first run. Nothing here needs a
# compiler: these are the releases llama.cpp publishes, the same builds yzma
# (the pure-Go bindings seta uses) is tested against.
set -euo pipefail

cd "$(dirname "$0")/.."

tag="${LLAMA_CPP_TAG:-b12359}"
dest="backend/libs"

if [[ -z "${FORCE:-}" ]] && compgen -G "$dest/libllama*" >/dev/null; then
  echo "llama.cpp $tag libraries already in $dest (FORCE=1 to refetch)"
  exit 0
fi

case "$(uname -s)/$(uname -m)" in
  Darwin/arm64)   url="https://github.com/ggml-org/llama.cpp/releases/download/${tag}/llama-${tag}-bin-macos-arm64.tar.gz" ;;
  Darwin/x86_64)  url="https://github.com/ggml-org/llama.cpp/releases/download/${tag}/llama-${tag}-bin-macos-x64.tar.gz" ;;
  Linux/x86_64)   url="https://github.com/ggml-org/llama.cpp/releases/download/${tag}/llama-${tag}-bin-ubuntu-x64.tar.gz" ;;
  # llama.cpp publishes no linux/arm64 CPU build; the llama-cpp-builder project
  # fills that gap, and its v1.0.0 tag is the same upstream code as this tag.
  Linux/aarch64)  url="https://github.com/hybridgroup/llama-cpp-builder/releases/download/v1.0.0/llama-v1.0.0-bin-ubuntu-cpu-arm64.tar.gz" ;;
  *)
    echo "error: no prebuilt llama.cpp libraries for $(uname -s) $(uname -m)." >&2
    echo "       See https://github.com/hybridgroup/llama-cpp-builder/releases and put" >&2
    echo "       libllama/libggml* shared libraries in $dest by hand." >&2
    exit 1
    ;;
esac

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "→ fetching llama.cpp $tag libraries"
echo "  $url"
curl -fsSL "$url" -o "$tmp/libs.tgz"
tar -xzf "$tmp/libs.tgz" -C "$tmp"

# What seta needs: the model itself, the ggml core, its CPU and GPU backends,
# and the two backends libggml links against. The archive ships short names as
# symlinks, so take the real (versioned) files and let the app link them.
mkdir -p "$dest"
rm -f "$dest"/libllama*.dylib "$dest"/libllama*.so* "$dest"/libggml*.dylib "$dest"/libggml*.so*

for base in libllama libggml libggml-base libggml-cpu libggml-metal libggml-blas libggml-rpc; do
  file="$(find "$tmp" -maxdepth 2 -type f \
    \( -name "${base}.[0-9]*.dylib" -o -name "${base}.so.[0-9]*" \) | head -1)"
  if [[ -n "$file" ]]; then
    cp "$file" "$dest/"
  else
    echo "  (no $base in this build — fine, it is platform specific)"
  fi
done

echo "→ $(ls -1 "$dest" | grep -c '^lib') libraries in $dest ($(du -sh "$dest" | cut -f1))"
