package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// A form is one reading of a character with its senses. The fixture mirrors the
// two places the source lists a dead reading before the living one.
func reading(pinyin string, meanings ...string) form {
	f := form{}
	f.Pinyin.ToneMarks = pinyin
	f.Meanings = meanings
	return f
}

func TestBestFormSkipsArchaicReadings(t *testing.T) {
	// 听: yǐn "to smile (archaic)" is listed before tīng "to listen".
	form := bestForm([]form{
		reading("yǐn", "smile (archaic)"),
		reading("tīng", "to listen to; to hear", "to heed; to obey"),
	})

	assert.Equal(t, "tīng", form.Pinyin.ToneMarks)
	assert.Equal(t, "to listen to; to hear; to heed; to obey", shortGloss(form.Meanings))
}

func TestBestFormStillPrefersTheFirstOrdinaryReading(t *testing.T) {
	best := bestForm([]form{
		reading("lù", "surname Lu"),
		reading("lù", "road; path"),
	})

	assert.Equal(t, "road; path", shortGloss(best.Meanings))
}

func TestIsMarginalSense(t *testing.T) {
	assert.True(t, isMarginalSense("smile (archaic)"))
	assert.True(t, isMarginalSense("variant of 淳朴"))
	assert.True(t, isMarginalSense("surname Lu"))
	assert.False(t, isMarginalSense("to listen to; to hear"))
	assert.False(t, isMarginalSense("(completed action marker)"))
}
