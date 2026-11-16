package main

import (
	"fmt"
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

func TestFoldTones(t *testing.T) {
	// The sort key is pinyin without tone marks, so alphabetical order is the
	// reader's alphabetical order rather than Unicode's.
	cases := map[string]string{
		"wǒ":       "wo",
		"ài":       "ai",
		"shì":      "shi",
		"yín háng": "yin hang",
		"lǜ":       "lu",
		"nǚ":       "nu",
		"de":       "de",
		"ē é ě è":  "e e e e",
		"Běijīng":  "beijing",
	}
	for pinyin, want := range cases {
		assert.Equal(t, want, foldTones(pinyin), "foldTones(%q)", pinyin)
	}
}

func TestParseHSK(t *testing.T) {
	index := mustIndex(t)

	assert.Len(t, index.byWord, 6)
	assert.Equal(t, []int{1, 2, 3, 5}, index.levels)
	assert.Equal(t, 2, index.maxRunes, "银行 is the longest form")
	assert.Equal(t, "yín háng", index.byWord["银行"].Pinyin)
	assert.Equal(t, "yin hang", index.byWord["银行"].sortKey)
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

// book is the library the map runs over: one item per text, in the order the
// user saved them.
func book(texts ...string) []Item {
	items := make([]Item, len(texts))
	for i, text := range texts {
		items[i] = Item{ID: fmt.Sprintf("id-%d", i+1), Chinese: text}
	}
	return items
}

func TestCoverageCountsPerLevel(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我去银行"), coverageQuery{})

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

	empty := index.coverage(nil, coverageQuery{})
	assert.Equal(t, 1, empty.Current, "nothing saved yet: level 1 is the map's edge")

	// Level 3 is complete but level 1 is barely started, so level 1 stays current.
	partial := index.coverage(book("我去银行"), coverageQuery{})
	assert.Equal(t, 1, partial.Current)
}

func TestCoverageAdvanceWhenLevelIsMet(t *testing.T) {
	index := mustIndex(t)

	// Every level-1 word is present (的 我 爱), level 2 is untouched.
	report := index.coverage(book("我的爱"), coverageQuery{})
	assert.Equal(t, 2, report.Current)
	assert.Equal(t, 1, report.Gaps.Total, "行 is the only level-2 word missing")
	require.Len(t, report.Gaps.Words, 1)
	assert.Equal(t, "行", report.Gaps.Words[0].Simplified)
	assert.False(t, report.Gaps.More)
}

func TestCoverageCurrentIsHighestWhenEverythingIsMet(t *testing.T) {
	index := mustIndex(t)

	// Max matching means 行 needs a standalone sighting and 银 its own too.
	report := index.coverage(book("我的爱", "银行行", "银"), coverageQuery{})

	assert.Equal(t, 5, report.Current, "the map's edge is the highest level")
	assert.Equal(t, 0, report.Gaps.Total)
	assert.Empty(t, report.Gaps.Words)
}

func TestCoverageGapOrderIsAlphabeticalByPinyin(t *testing.T) {
	index := mustIndex(t)

	// Level 1 has 的(de) 我(wǒ) 爱(ài): the gap list reads ài, de, wǒ.
	report := index.coverage(nil, coverageQuery{})
	require.Len(t, report.Gaps.Words, 3)
	assert.Equal(t, []string{"爱", "的", "我"}, []string{
		report.Gaps.Words[0].Simplified, report.Gaps.Words[1].Simplified, report.Gaps.Words[2].Simplified,
	})
}

func TestCoverageGapPaging(t *testing.T) {
	index := mustIndex(t)

	page := index.coverage(nil, coverageQuery{GapPage: 2})
	require.Len(t, page.Gaps.Words, 2)
	assert.Equal(t, 3, page.Gaps.Total, "the total is the whole level, not the page")
	assert.True(t, page.Gaps.More)

	whole := index.coverage(nil, coverageQuery{GapPage: 50})
	require.Len(t, whole.Gaps.Words, 3)
	assert.False(t, whole.Gaps.More)
}

func TestCoverageIgnoresDuplicatesAcrossItems(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我", "我", "我的"), coverageQuery{})

	assert.Equal(t, 2, report.Levels[0].Seen, "我 and 的 count once each")
}

func TestKnownWordsCarryTheirLibraryItems(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我去银行", "我的爱"), coverageQuery{})

	require.Len(t, report.Known.Words, 4, "的 我 爱 at level 1, 银行 at level 3")
	assert.Equal(t, 4, report.Known.Total)
	assert.False(t, report.Known.More)

	// Level first, then pinyin: the list reads as a path through the bands.
	assert.Equal(t, []string{"爱", "的", "我", "银行"}, []string{
		report.Known.Words[0].Simplified,
		report.Known.Words[1].Simplified,
		report.Known.Words[2].Simplified,
		report.Known.Words[3].Simplified,
	})

	word := report.Known.Words[0]
	assert.Equal(t, "爱", word.Simplified)
	assert.Equal(t, 1, word.Level, "every row says which band it belongs to")
	assert.Equal(t, "ài", word.Pinyin)
	assert.NotEmpty(t, word.Gloss)
	require.Len(t, word.Refs, 1)
	assert.Equal(t, "id-2", word.Refs[0].ID)
	assert.Equal(t, "我的爱", word.Refs[0].Text)
}

func TestKnownWordPointBackAtEveryItemThatTaughtIt(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我去银行", "我的朋友"), coverageQuery{})

	var refs []wordRef
	for _, word := range report.Known.Words {
		if word.Simplified == "我" {
			refs = word.Refs
		}
	}
	require.Len(t, refs, 2, "我 appears in two saved items")
	assert.Equal(t, []string{"id-1", "id-2"}, []string{refs[0].ID, refs[1].ID})
	assert.Equal(t, []string{"我去银行", "我的朋友"}, []string{refs[0].Text, refs[1].Text})
}

func TestKnownWordCapsItsReferences(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我", "我的爱", "我去银行", "我的朋友"), coverageQuery{})

	var word knownWord
	for _, entry := range report.Known.Words {
		if entry.Simplified == "我" {
			word = entry
		}
	}
	require.NotEmpty(t, word.Refs)
	assert.Len(t, word.Refs, maxRefs, "four items, capped references")
	assert.Equal(t, 4, word.RefTotal, "...and the count behind them")
	assert.Equal(t, "id-1", word.Refs[0].ID, "the newest first")
}

func TestKnownWordCountsOneItemOnce(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我的我的", "我的爱", "我的爱"), coverageQuery{})

	// 我的爱 was saved twice: one sighting, not two.
	seen := map[string]knownWord{}
	for _, word := range report.Known.Words {
		seen[word.Simplified] = word
	}
	require.Contains(t, seen, "我")
	assert.Len(t, seen["我"].Refs, 2, "each distinct item once")
	assert.Equal(t, 2, seen["我"].RefTotal)
	assert.Equal(t, 1, seen["爱"].RefTotal, "the repeated sentence counts once")
}

func TestKnownListDefaultsToTheFirstThreeBands(t *testing.T) {
	index := mustIndex(t)

	// 银 is level 5 and must stay out of the default view even though it is saved.
	report := index.coverage(book("银", "我去银行"), coverageQuery{})
	for _, word := range report.Known.Words {
		assert.LessOrEqual(t, word.Level, 3, "%s is above the default bands", word.Simplified)
	}
	assert.Equal(t, 2, report.Known.Total, "我 and 银行")
}

func TestKnownListRespectsTheChosenBands(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("银", "我去银行"), coverageQuery{KnownLevels: []int{5}})

	require.Len(t, report.Known.Words, 1)
	assert.Equal(t, "银", report.Known.Words[0].Simplified)
	assert.Equal(t, 5, report.Known.Words[0].Level)
	assert.Equal(t, 1, report.Known.Total)

	assert.Equal(t, levelCoverage{Level: 5, Seen: 1, Total: 1}, report.Levels[3],
		"the bars still describe the whole map, not the filtered list")
}

func TestKnownListPaging(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我的爱银行"), coverageQuery{KnownPage: 2})

	require.Len(t, report.Known.Words, 2)
	assert.Equal(t, 4, report.Known.Total, "the total is the whole selection, not the page")
	assert.True(t, report.Known.More)
	assert.Equal(t, "爱", report.Known.Words[0].Simplified, "alphabetical: ài comes first")
}

func TestGapsCanTargetAnotherBand(t *testing.T) {
	index := mustIndex(t)
	report := index.coverage(book("我的爱"), coverageQuery{GapLevel: 5})

	require.Len(t, report.Gaps.Words, 1)
	assert.Equal(t, "银", report.Gaps.Words[0].Simplified)
	assert.Equal(t, 2, report.Current, "asking for a band does not move the map")
	assert.Nil(t, report.Gaps.Words[0].Refs, "an unseen word points nowhere")
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

	// A level slice is in pinyin order, so the list is scannable and stable.
	for i := 1; i < 200; i++ {
		assert.LessOrEqual(t, index.byLevel[1][i-1].sortKey, index.byLevel[1][i].sortKey,
			"%s should not sort before %s", index.byLevel[1][i-1].Simplified, index.byLevel[1][i].Simplified)
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
