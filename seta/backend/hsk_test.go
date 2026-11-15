package main

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fixtureVocabulary covers the matching cases that matter: a two-character word
// that must beat its own characters (银行 over 银 + 行), a single character that
// must still match on its own (的), and levels spread far apart.
const fixtureVocabulary = `[
  {"s":"的","lv":1,"q":1,"py":"de","m":"of"},
  {"s":"我","lv":1,"q":2,"py":"wǒ","m":"I"},
  {"s":"爱","lv":1,"q":3,"py":"ài","m":"to love"},
  {"s":"行","lv":2,"q":100,"py":"háng","m":"row"},
  {"s":"银行","lv":3,"q":300,"py":"yín háng","m":"bank"},
  {"s":"银","lv":5,"q":500,"py":"yín","m":"silver"}
]`

func mustIndex(t *testing.T) *hskIndex {
	t.Helper()
	index, err := parseHSK([]byte(fixtureVocabulary))
	require.NoError(t, err)
	return index
}

func TestParseHSK(t *testing.T) {
	index := mustIndex(t)

	assert.Len(t, index.byWord, 6)
	assert.Equal(t, []int{1, 2, 3, 5}, index.levels)
	assert.Equal(t, 2, index.maxRunes, "银行 is the longest form")
	assert.Equal(t, "yín háng", index.byWord["银行"].Pinyin)
}

func TestParseHSKRejectsBadInput(t *testing.T) {
	_, err := parseHSK([]byte(`not json`))
	require.Error(t, err)

	_, err = parseHSK([]byte(`[]`))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "empty")

	_, err = parseHSK([]byte(`[{"s":"","lv":1}]`))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "malformed")
}

func TestMaxMatchPrefersLongestWord(t *testing.T) {
	index := mustIndex(t)
	seen := index.seenWords([]string{"我去银行"})

	assert.Contains(t, seen, "我")
	assert.Contains(t, seen, "银行")
	assert.NotContains(t, seen, "银", "银 is covered by 银行 here, not counted twice")
	assert.NotContains(t, seen, "行", "the 行 inside 银行 is not the row 行")
}

func TestMaxMatchStandaloneCharacter(t *testing.T) {
	index := mustIndex(t)

	// 行 on its own still counts 行, and 的 counts even mid-sentence.
	seen := index.seenWords([]string{"这是行的意思"})
	assert.Contains(t, seen, "行")
	assert.Contains(t, seen, "的")
}

func TestMaxMatchIgnoresTextOutsideTheVocabulary(t *testing.T) {
	index := mustIndex(t)

	seen := index.seenWords([]string{"hello world", "，。！", "OK 好"})
	assert.Empty(t, seen, "no vocabulary word appears")
}

func TestCoverageCountsPerLevel(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage([]string{"我去银行"}, gapPage)

	byLevel := map[int]levelCoverage{}
	for _, row := range report.Levels {
		byLevel[row.Level] = row
	}
	assert.Equal(t, levelCoverage{Level: 1, Seen: 1, Total: 3}, byLevel[1], "only 我 of 的/我/爱")
	assert.Equal(t, levelCoverage{Level: 2, Seen: 0, Total: 1}, byLevel[2])
	assert.Equal(t, levelCoverage{Level: 3, Seen: 1, Total: 1}, byLevel[3])
	assert.Equal(t, levelCoverage{Level: 5, Seen: 0, Total: 1}, byLevel[5])
}

func TestCoverageCurrentLevelIsLowestBelowTarget(t *testing.T) {
	index := mustIndex(t)

	empty := index.coverage(nil, gapPage)
	assert.Equal(t, 1, empty.Current, "nothing saved yet: level 1 is the map's edge")

	// Level 3 is complete but level 1 is barely started, so level 1 stays current.
	partial := index.coverage([]string{"我去银行"}, gapPage)
	assert.Equal(t, 1, partial.Current)
}

func TestCoverageAdvanceWhenLevelIsMet(t *testing.T) {
	index := mustIndex(t)

	// Every level-1 word is present (的 我 爱), level 2 is untouched.
	report := index.coverage([]string{"我的爱"}, gapPage)
	assert.Equal(t, 2, report.Current)
	assert.Equal(t, 1, report.GapTotal, "行 is the only level-2 word missing")
	require.Len(t, report.Gaps, 1)
	assert.Equal(t, "行", report.Gaps[0].Simplified)
	assert.False(t, report.More)
}

func TestCoverageCurrentIsHighestWhenEverythingIsMet(t *testing.T) {
	index := mustIndex(t)

	// Max matching means 行 needs a standalone sighting and 银 its own too.
	report := index.coverage([]string{"我的爱", "银行行", "银"}, gapPage)

	assert.Equal(t, 5, report.Current, "the map's edge is the highest level")
	assert.Equal(t, 0, report.GapTotal)
	assert.Empty(t, report.Gaps)
}

func TestCoverageGapOrderIsByFrequency(t *testing.T) {
	index := mustIndex(t)

	// Level 1 has 的(1) 我(2) 爱(3); gap list keeps frequency order.
	report := index.coverage(nil, gapPage)
	require.Len(t, report.Gaps, 3)
	assert.Equal(t, []string{"的", "我", "爱"}, []string{
		report.Gaps[0].Simplified, report.Gaps[1].Simplified, report.Gaps[2].Simplified,
	})
}

func TestCoverageGapPaging(t *testing.T) {
	index := mustIndex(t)

	page := index.coverage(nil, 2)
	require.Len(t, page.Gaps, 2)
	assert.Equal(t, 3, page.GapTotal, "the total is the whole level, not the page")
	assert.True(t, page.More)

	whole := index.coverage(nil, 50)
	require.Len(t, whole.Gaps, 3)
	assert.False(t, whole.More)
}

func TestCoverageIgnoresDuplicatesAcrossItems(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage([]string{"我", "我", "我的"}, gapPage)

	assert.Equal(t, 2, report.Levels[0].Seen, "我 and 的 count once each")
}

func TestEmbeddedVocabularyLoads(t *testing.T) {
	index, err := loadHSK()
	require.NoError(t, err)

	assert.Greater(t, len(index.byWord), 10000, "the full HSK 3.0 list ships in the binary")
	assert.Equal(t, []int{1, 2, 3, 4, 5, 6, 7}, index.levels)

	// A handful of level-1 words a beginner meets first, with their data intact.
	word, ok := index.byWord["你"]
	require.True(t, ok)
	assert.Equal(t, 1, word.Level)
	assert.NotEmpty(t, word.Pinyin)
	assert.NotEmpty(t, word.Gloss)

	assert.Positive(t, index.byLevel[1][0].Frequency, "a level slice starts with a ranked word")
	for i := 1; i < 200; i++ {
		assert.LessOrEqual(t, index.byLevel[1][i-1].Frequency, index.byLevel[1][i].Frequency)
	}
}

func TestEmbeddedVocabularyMatchesRealSentences(t *testing.T) {
	index, err := loadHSK()
	require.NoError(t, err)

	seen := index.seenWords([]string{"我去银行取钱"})
	for _, want := range []string{"我", "去", "银行", "取", "钱"} {
		assert.Contains(t, seen, want, "a beginner sentence should light up its words")
	}
	assert.NotContains(t, seen, "行", "银行 must not also count as the standalone 行")
}

func TestVocabularyIsSmallEnoughToEmbed(t *testing.T) {
	raw, err := hskData.ReadFile(hskDataPath)
	require.NoError(t, err)
	assert.Less(t, len(raw), 2<<20, "keep the embedded list under 2 MB")
	assert.NotEmpty(t, strings.TrimSpace(string(raw)))
}
