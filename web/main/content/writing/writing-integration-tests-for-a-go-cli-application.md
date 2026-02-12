---
tags:
  - golang
  - testing
  - fakedata
date: "2017-05-18T00:00:00Z"
description: how I do end-to-end testing of Go CLI applications
keywords: golang, testing, integration tests, end-to-end tests
title: Writing integration tests for a Go CLI application
aliases:
  - /writing-integration-tests-for-a-go-cli-application
---

[Fakedata]({{< ref "/tags/fakedata" >}} "Fakedata") is a small Go program that I
wrote to generate test data on the command line.

A few weeks after I released, a user reported an issue that had been introduced
just a few hours before. The regression was obvious but, at the time, fakedata
had no test covering the feature end-to-end, so we didn't catch it.

This bug report got me thinking about how I could end-to-end test Go CLI
applications. After working on it for a bit, I found a simple and effective way
of writing integration tests for Go CLI applications.

The recipe looks like this:

- A `make test` target builds a test binary and then runs the integration tests.
- Each integration test uses a `runBinary` helper function (which relies on a
  specific `TestMain` setup) to run the CLI application.
- Finally, each integration test asserts correct behaviour using golden files.

The point of this approach is that integrations tests are running fakedata like
a user would and only assert the output of command run; these tests know nothing
about the code under test.

For the sake of the discussion, I created an example CLI application, available
on [GitHub](https://github.com/lucapette/go-cli-integration-tests).

The example app is a tiny CLI program called `echo-args`. It works like this:

```sh
$ echo-args # no arguments, no output
$
$ echo-args ciao # it prints each argument on its own line
$ ciao
$ echo-args ciao hello
ciao
hello
$ echo-args -shout ciao # it shouts at you if you ask it to
CIAO
$ echo-args -whisper CIAO # it whispers if you ask it to
ciao
```

Now that we know what we're end-to-end testing, we can move on to the build
file. Here's how the Makefile looks like:

```make
test: build-with-coverage
    @rm -fr .coverdata
    @mkdir -p .coverdata
    @go test ./...
    @go tool covdata percent -i=.coverdata

build-with-coverage:
    @go build -cover -o echo-args-coverage
```

The `test` target depends on `build-with-coverage` so that we always build a
test binary before we runs the test. At the end of the article, I go over the
coverage stuff so we can ignore it for now.

Now that we have a test binary, we're ready to write a couple of helper
functions to run the tests. First up, a custom `TestMain`:

```go
var binaryName = "echo-args-coverage"

var binaryPath = ""

func TestMain(m *testing.M) {
	err := os.Chdir("..")
	if err != nil {
		fmt.Printf("could not change dir: %v", err)
		os.Exit(1)
	}

	dir, err := os.Getwd()
	if err != nil {
		fmt.Printf("could not get current dir: %v", err)
	}

	binaryPath = filepath.Join(dir, binaryName)

	os.Exit(m.Run())
}
```

Two things are worth mentioning:

- [TestMain](https://golang.org/pkg/testing/#hdr-Main) is the recommended way to
  do setup and teardown of tests.
- `os.Chdir("..")` is _ugly but practical_... a bit like Go 🧌. It allows us to
  set `binaryPath` with the absolute path of the test binary.

Now we can write a `runBinary` helper. It looks like this:

```go
func runBinary(args []string) ([]byte, error) {
	cmd := exec.Command(binaryPath, args...)
	cmd.Env = append(os.Environ(), "GOCOVERDIR=.coverdata")
	return cmd.CombinedOutput()
}
```

A trivial function that does two things for us:

- It runs the binary with the correct `binaryPath`. Since our `TestMain`
  function runs before any test, we can assume this is correctly setup.
- It adds coverage setup to the environment. More about at the end of the
  article.

Now everything is in place for the actual tests. Here's how they look like:

```go
func TestCliArgs(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		fixture string
	}{
		{"no arguments", []string{}, "no-args.golden"},
		{"one argument", []string{"ciao"}, "one-argument.golden"},
		{"multiple arguments", []string{"ciao", "hello"}, "multiple-arguments.golden"},
		{"shout arg", []string{"--shout", "ciao"}, "shout-arg.golden"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := runBinary(tt.args)

			if err != nil {
				t.Fatal(err)
			}

			if *update {
				writeFixture(t, tt.fixture, output)
			}

			actual := string(output)

			expected := loadFixture(t, tt.fixture)

			if !reflect.DeepEqual(actual, expected) {
				t.Fatalf("actual = %s, expected = %s", actual, expected)
			}
		})
	}
}
```

The tests use two of my favourite Go testing practices:

- Golden files.
- [TableDrivenTests](https://github.com/golang/go/wiki/TableDrivenTests).

While Table Driven tests are officially documented, I couldn't find too much
about golden files. The basic idea is this:

- You store on disk (in so-called golden files) the expected (and possibly
  complex) output of the code under test.
- Then you use a simple comparison of the actual output and the content of
  corresponding golden file in the test itself.

It's good practice to use a command line flag to automatically update the golden
file when the specified behaviour changes:

```sh
go test integration/cli_test.go -update
```

and then check the golden file before running the tests again. I wrote a few
helpers for golden files and I've been copying them around in my Go projects.
Feel free to do the name.

We can finally run the tests:

```sh
make test
?   github.com/lucapette/go-cli-integration-tests               [no test files]
ok  github.com/lucapette/go-cli-integration-tests/integration   0.498s
    github.com/lucapette/go-cli-integration-tests coverage:     90.9% of statements
```

While this is a trivial example, it's still pretty amazing that building the
binary, running it four times, loading four files, and asserting its behaviour
takes as little time as `0.498s`.

The integration tests run nicely on [GitHub
Actions](https://github.com/lucapette/go-cli-integration-tests/actions) as well.

Thanks to TableDrivenTests, covering more use cases is simple. Say `echo-args`
now accepts a `reverse` flag, we can test the new behaviour with one more line:

```go
tests := []struct {
		name    string
		args    []string
		fixture string
	}{
        // existing tests not shown
		{"reversed", []string{"--reverse", "ciao", "hello"}, "reversed.golden"},
	}
```

I **really** like it takes so little to test a relatively complex behaviour.

The tests make only two assumptions: how to build the binary (running `make` in
a specific directory) and the name of the binary.

If you would completely change the internals of the program, the tests would
stay untouched:

> The tests need to change only if the behaviour of the program changes.

That is the **only** [kind of testing]({{< ref
"/writing/my-programming-principles#write-actual-tests" >}} "kind of testing")
I'm comfortable with.

Now, as promised, a short note about coverage. Go
[1.20](https://tip.golang.org/doc/go1.20#cover) added a `-cover` flag to its
build command. You can now instrument binaries to emit coverage profile
information. Before this release, the technique I use in this article wouldn't
provide any coverage information.

To help you play around with coverage information and table driven testing, I
purposefully left out the `-whisper` flag. You can check out how the coverage
looks like with `make check-coverage`. It reports a `90%` coverage because the
`-whisper` isn't tested. If you add one more test case, you'll see `100%`
coverage :)

I enjoy using this technique, hopefully you will too. Happy testing with Go!
