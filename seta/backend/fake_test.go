package main

import (
	"context"
	"sync"
)

// fakeTranslator stands in for the engine in handler tests: it streams whatever
// the test tells it to, records what it was asked, and can be made to fail, to
// hold the request open until its context ends, or to be not-ready.
type fakeTranslator struct {
	ready  bool
	pieces []string
	err    error

	// hold makes Translate emit its pieces and then wait for the context, which
	// is how the timeout and abort paths are reached.
	hold bool

	started chan struct{}
	once    sync.Once

	mu      sync.Mutex
	message string
	calls   int
	ctxErr  error
}

func (f *fakeTranslator) Ready() bool { return f.ready }

func (f *fakeTranslator) Translate(ctx context.Context, message string, emit func(piece string) error) error {
	f.mu.Lock()
	f.calls++
	f.message = message
	f.mu.Unlock()

	if f.started != nil {
		f.once.Do(func() { close(f.started) })
	}

	for _, piece := range f.pieces {
		if err := emit(piece); err != nil {
			f.remember(err)
			return err
		}
	}

	if f.hold {
		<-ctx.Done()
		f.remember(ctx.Err())
		return ctx.Err()
	}

	return f.err
}

func (f *fakeTranslator) remember(err error) {
	f.mu.Lock()
	f.ctxErr = err
	f.mu.Unlock()
}

// callCount is how many times Translate was entered.
func (f *fakeTranslator) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls
}

// lastMessage is the user turn the handler asked the engine to translate.
func (f *fakeTranslator) lastMessage() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.message
}

// lastErr is what the engine saw on its context, for the abort test.
func (f *fakeTranslator) lastErr() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.ctxErr
}

// readyTranslator is the engine every non-translate test needs: loaded, with
// nothing to say.
func readyTranslator() *fakeTranslator {
	return &fakeTranslator{ready: true}
}
