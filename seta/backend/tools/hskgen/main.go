// Command hskgen turns the complete-hsk-vocabulary dataset into the trimmed
// word list seta embeds.
//
// It runs at build time, by hand (`make hsk`), and its output is committed:
// the app never fetches vocabulary at runtime, and a build needs no network.
//
// The source is TheOpenDictionary/complete-hsk-vocabulary (MIT). Only the new
// HSK 3.0 bands are kept (n1…n6, n7+ → 7); the old HSK 2.0 bands (o1…o6) are
// dropped, since the app is a 3.0 map. Each word keeps the lowest level it is
// listed under, its frequency rank (lower is more common), its tone-marked
// pinyin and a short English gloss.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

// sourceEntry is one row of complete.min.json, with its abbreviated keys.
type sourceEntry struct {
	Simplified string   `json:"s"`
	Levels     []string `json:"l"`
	Frequency  int      `json:"q"`
	Forms      []struct {
		Pinyin struct {
			ToneMarks string `json:"y"`
		} `json:"i"`
		Meanings []string `json:"m"`
	} `json:"f"`
}

// word is the embedded shape. Keys are short because the file is shipped
// inside the binary, and the schema is documented in PROVENANCE.md.
type word struct {
	Simplified string `json:"s"`
	Level      int    `json:"lv"`
	Frequency  int    `json:"q"`
	Pinyin     string `json:"py"`
	Gloss      string `json:"m"`
}

const (
	// unranked is the source's sentinel for "no frequency data"; such words
	// sort last within their level.
	unranked = 1000000

	// maxGlosses and maxGlossRunes keep a row terse enough for a list. The
	// full senses are still in the source file if a lookup ever needs them.
	maxGlosses    = 2
	maxGlossRunes = 60
)

func main() {
	in := flag.String("in", "", "path to complete.min.json from complete-hsk-vocabulary")
	out := flag.String("out", "data/hsk.json", "path of the embedded word list to write")
	sourceURL := flag.String("source-url", "", "provenance: URL the input came from")
	sourceCommit := flag.String("source-commit", "", "provenance: source commit SHA")
	flag.Parse()

	if *in == "" {
		fatal("-in is required")
	}

	raw, err := os.ReadFile(*in)
	if err != nil {
		fatal("read source: %v", err)
	}

	var entries []sourceEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		fatal("decode source: %v", err)
	}

	words, err := convert(entries)
	if err != nil {
		fatal("%v", err)
	}

	if err := os.MkdirAll(filepath.Dir(*out), 0o755); err != nil {
		fatal("create output dir: %v", err)
	}

	encoded, err := json.Marshal(words)
	if err != nil {
		fatal("encode output: %v", err)
	}
	if err := os.WriteFile(*out, encoded, 0o644); err != nil {
		fatal("write output: %v", err)
	}

	if err := writeProvenance(*out, *sourceURL, *sourceCommit, len(entries), words); err != nil {
		fatal("write provenance: %v", err)
	}

	fmt.Printf("wrote %s: %d words, %.1f KB\n", *out, len(words), float64(len(encoded))/1024)
	for level, count := range countByLevel(words) {
		fmt.Printf("  HSK %d: %d\n", level, count)
	}
}

// convert normalises source rows into the embedded shape: HSK 3.0 only, one row
// per simplified form (lowest level wins), sorted by level then frequency.
func convert(entries []sourceEntry) ([]word, error) {
	bySimplified := make(map[string]word, len(entries))

	for _, e := range entries {
		level, ok := newHSKLevel(e.Levels)
		if !ok {
			continue // HSK 2.0-only word
		}
		if strings.TrimSpace(e.Simplified) == "" {
			continue
		}
		if len(e.Forms) == 0 {
			return nil, fmt.Errorf("%q has no forms (needs pinyin and a gloss)", e.Simplified)
		}

		form := bestForm(e.Forms)
		pinyin := strings.ToLower(strings.TrimSpace(form.Pinyin.ToneMarks))
		gloss := shortGloss(form.Meanings)
		if pinyin == "" || gloss == "" {
			return nil, fmt.Errorf("%q is missing pinyin or a gloss", e.Simplified)
		}

		freq := e.Frequency
		if freq <= 0 {
			freq = unranked
		}

		candidate := word{
			Simplified: e.Simplified,
			Level:      level,
			Frequency:  freq,
			Pinyin:     pinyin,
			Gloss:      gloss,
		}

		// A word listed under several levels keeps the earliest one; on a tie
		// the more frequent row wins, so the output does not depend on file
		// order.
		if existing, seen := bySimplified[e.Simplified]; seen {
			if existing.Level < candidate.Level ||
				(existing.Level == candidate.Level && existing.Frequency <= candidate.Frequency) {
				continue
			}
		}
		bySimplified[e.Simplified] = candidate
	}

	words := make([]word, 0, len(bySimplified))
	for _, w := range bySimplified {
		words = append(words, w)
	}
	sort.Slice(words, func(i, j int) bool {
		if words[i].Level != words[j].Level {
			return words[i].Level < words[j].Level
		}
		if words[i].Frequency != words[j].Frequency {
			return words[i].Frequency < words[j].Frequency
		}
		return words[i].Simplified < words[j].Simplified
	})

	return words, nil
}

// newHSKLevel maps the source level tokens onto the app's 1–7 numbering
// (HSK 3.0 publishes 7, 8 and 9 as one band) and reports whether the word
// belongs to the new standard at all.
func newHSKLevel(tokens []string) (int, bool) {
	best := 0
	for _, token := range tokens {
		if !strings.HasPrefix(token, "n") {
			continue
		}
		level := 0
		for _, digit := range token[1:] {
			if digit < '0' || digit > '9' {
				break
			}
			level = level*10 + int(digit-'0')
		}
		if level <= 0 {
			continue
		}
		if level > 7 {
			level = 7 // n7+ covers 7, 8 and 9
		}
		if best == 0 || level < best {
			best = level
		}
	}
	return best, best > 0
}

// form is one reading of a word: its pinyin and its senses.
type form = struct {
	Pinyin struct {
		ToneMarks string `json:"y"`
	} `json:"i"`
	Meanings []string `json:"m"`
}

// bestForm picks the reading to show. The source lists proper-noun readings
// first for some words — 路 as "surname Lu" before "road", 钱 as "surname Qian"
// before "money" — so a form whose senses are all marginal is passed over.
func bestForm(forms []form) form {
	for _, candidate := range forms {
		meaningful := false
		for _, meaning := range candidate.Meanings {
			if strings.TrimSpace(meaning) != "" && !isMarginalSense(meaning) {
				meaningful = true
				break
			}
		}
		if meaningful {
			return candidate
		}
	}
	return forms[0]
}

// shortGloss keeps the first sense or two, trimmed to list width.
//
// The source sometimes lists the surname or a variant reading first (路 → "surname
// Lu", 钱 → "surname Qian"), which is useless to a beginner looking at a gap
// list. Those senses are pushed to the back so the ordinary meaning survives
// the trimming.
func shortGloss(meanings []string) string {
	ordered := make([]string, 0, len(meanings))
	deferred := make([]string, 0, len(meanings))
	for _, meaning := range meanings {
		meaning = strings.TrimSpace(meaning)
		if meaning == "" {
			continue
		}
		if isMarginalSense(meaning) {
			deferred = append(deferred, meaning)
			continue
		}
		ordered = append(ordered, meaning)
	}
	ordered = append(ordered, deferred...)

	// Fill with whole senses while they fit under the cap, so a row never ends
	// mid-word; the first sense is always kept, truncated if it is enormous.
	kept := make([]string, 0, maxGlosses)
	length := 0
	for _, meaning := range ordered {
		if len(kept) == maxGlosses {
			break
		}
		addition := utf8.RuneCountInString(meaning)
		if len(kept) > 0 {
			addition += 2 // "; "
		}
		if length+addition > maxGlossRunes && len(kept) > 0 {
			break
		}
		kept = append(kept, meaning)
		length += addition
	}

	gloss := strings.Join(kept, "; ")
	if utf8.RuneCountInString(gloss) <= maxGlossRunes {
		return gloss
	}
	return strings.TrimSpace(string([]rune(gloss)[:maxGlossRunes-1])) + "…"
}

// isMarginalSense reports senses that teach a beginner nothing about the word's
// ordinary meaning.
func isMarginalSense(meaning string) bool {
	lower := strings.ToLower(meaning)
	for _, prefix := range []string{
		"surname ",
		"variant of ",
		"old variant",
		"used in ",
		"see ",
		"abbr. for ",
	} {
		if strings.HasPrefix(lower, prefix) {
			return true
		}
	}
	// A reading the source files under this character only as an archaic
	// curiosity is not the word a beginner is being taught: 听 is tīng ("to
	// listen"), not yǐn ("to smile", archaic), and 离 is lí ("to leave"), not
	// chī (a mythical beast, archaic). Prefer the living reading.
	return strings.Contains(lower, "(archaic)")
}

func countByLevel(words []word) map[int]int {
	counts := make(map[int]int)
	for _, w := range words {
		counts[w.Level]++
	}
	return counts
}

// writeProvenance records where the embedded list came from, in the same
// directory, so the file can be re-generated (or audited) a year from now.
func writeProvenance(outPath, sourceURL, sourceCommit string, sourceCount int, words []word) error {
	var b strings.Builder
	b.WriteString("# HSK vocabulary provenance\n\n")
	b.WriteString("Generated by `make hsk` (backend/tools/hskgen) — do not edit by hand.\n\n")
	fmt.Fprintf(&b, "- Source: %s\n", orUnknown(sourceURL))
	fmt.Fprintf(&b, "- Source commit: %s\n", orUnknown(sourceCommit))
	b.WriteString("- Upstream project: https://github.com/TheOpenDictionary/complete-hsk-vocabulary (MIT)\n")
	fmt.Fprintf(&b, "- Fetched: %s\n", time.Now().UTC().Format("2006-01-02"))
	fmt.Fprintf(&b, "- Source rows: %d · embedded words: %d\n\n", sourceCount, len(words))
	b.WriteString("## Shape\n\n")
	b.WriteString("`hsk.json` is a flat array, sorted by level then frequency:\n\n")
	b.WriteString("```json\n{\"s\": \"爱\", \"lv\": 1, \"q\": 382, \"py\": \"ài\", \"m\": \"to love; affection\"}\n```\n\n")
	b.WriteString("- `s` simplified form (the only key the app matches on)\n")
	b.WriteString("- `lv` HSK 3.0 level, 1–7 (7 is the published 7–9 band)\n")
	b.WriteString("- `q` frequency rank — lower is more common; 1000000 means unranked\n")
	b.WriteString("- `py` tone-marked pinyin, lowercased for consistency\n")
	fmt.Fprintf(&b, "- `m` English gloss: up to %d senses within %d runes, cut at a sense boundary\n\n", maxGlosses, maxGlossRunes)
	b.WriteString("## Filtering\n\n")
	b.WriteString("Old HSK 2.0 bands (`o1`…`o6`) are dropped. Words listed under several\n")
	b.WriteString("HSK 3.0 bands keep their lowest level, so every simplified form appears once\n")
	b.WriteString("and per-level counts do not double count.\n\n")
	b.WriteString("## Readings and glosses\n\n")
	b.WriteString("A word with several readings keeps the first one whose senses say something\n")
	b.WriteString("useful, so 路 is the road, not `surname Lu`, and 钱 is money, not `surname Qian`.\n")
	b.WriteString("Senses starting with `surname`, `variant of`, `used in`, `see` or `abbr. for` are\n")
	b.WriteString("pushed behind the ordinary ones. The pinyin still describes one reading only:\n")
	b.WriteString("行 is háng here, which is right for 银行 and wrong for 行动.\n")

	return os.WriteFile(filepath.Join(filepath.Dir(outPath), "PROVENANCE.md"), []byte(b.String()), 0o644)
}

func orUnknown(value string) string {
	if value == "" {
		return "(not recorded)"
	}
	return value
}

func fatal(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "hskgen: "+format+"\n", args...)
	os.Exit(1)
}
