---
tags:
  - golang
date: "2017-11-09T00:00:00Z"
description: I have been using Go long enough to form opinions around it
keywords: golang, go, programming language
title: My experience with Go
aliases:
  - /my-experience-with-go
---

I've never written about "why I like language X". I don't find the topic
particularly interesting either as a writer or as a reader. But I feel compelled
to make an exception with Go for two reasons:

- I had many "unfinished conversations" on Twitter about the topic, and I
  promised I would write about it.
- Most of the criticism around Go I run into lacks depth and makes me think
  people have never got past reading a few lines of Go.

Fair warning: I don't have a particular interest in language features in the
context of programming as a craft, so the article won't be about that. I like
theory and I enjoy reading about different languages. But when it comes to
building products, I care about other aspects:

- Documentation
- Testing experience
- Workflow experience
- Standard library
- Available libraries
- Community

As a result of this, I've often felt out of place among developers discussing
programming languages.

My experience is that some developers care about these points and the big
majority care about language features only. Of course I also find language
features relevant but, to me, they are only one aspect of a much broader
conversation about the experience.

## Documentation

Good documentation is invaluable. Since everyone has their own definition of
"good", here is my definition of "Good docs":

- They don't make me search on the web
- They have working examples I can start with
- They follow clear conventions that foster reading habits

The official Go documentation is _really_ good. I almost never have to search
the web – the official docs have the answer I'm looking for. As I use the superb
[Dash](https://kapeli.com/dash) for browsing documentation, I can go on just
with dash and the editor. There is very little context switch.

Godoc offers [testable examples](https://blog.golang.org/examples): snippets of
code embedded in the documentation itself. You can run them while reading the
docs and they are part of the automated test suite.

Each package in the standard library has an overview, a table of contents, and
an examples section. This convention created a habit: if I have no idea what the
package is about, I start from the overview. Otherwise, I go straight to the
examples section: I look around, find a good example that works for me, move on
to the next problem. In case you're not familiar with it, here is how testable
examples look like:

![go doc](/img/godoc.png)

Being able to run examples right there is helpful, I use the feature when I'm
not sure I understand the docs.

The first steps with a new language are always a bit cumbersome, because I don't
know what is idiomatic and what is not. [Effective
go](https://golang.org/doc/effective_go.html) was vital for me at the time. I'm
not sure if the name of the document is inspired by the wonderful [Effective
Java](https://www.goodreads.com/book/show/105099.Effective_Java_Programming_Language_Guide).
Either way, the result is the same: I constantly went back to it as the ultimate
source of inspiration for writing code. If you're relatively new to Go and want
to learn more, "effective Go" is a perfect companion.

In general, there is a strong documentation culture in the Go community and I
couldn't be happier about it.

## Testing experience

I experience a direct correlation between languages and the kind of testing I
can write. That's why I call it "testing experience"; writing tests is more than
just tooling.

Writing tests is possibly my favourite Go activity because:

- I can go far enough without external libraries

  I'm too old to ignore the maintenance cost, so I'm happy the standard library
  goes a long way. One little feature I miss is the lack of colors in the
  output, but that's a personal nuance.

- I enjoy Go testing idioms

  Go tests tend to make a heavy use of [table driven
  tests](https://github.com/golang/go/wiki/TableDrivenTests) and the approach
  fits well with my way of thinking about tests. [Advanced
  tests](https://www.youtube.com/watch?v=8hQG7QlcLBk) often use golden files
  that help to check complex output. The combination of golden files and table
  driven testing is what I like the most about writing tests with Go. It's easy
  to cover a bug fix or to add another test case for a new feature.

- I have a strong preference for integration tests

  A good explanation of my preference is out of scope of this article. It is
  sufficient to say that my own preference troubles me, because I can't easily
  write fast, reliable integration tests in many languages.

Because of these factors, I enjoy writing tests in Go more than in any other
language I worked with in the past. The tests I write give me a great deal of
confidence which is a driving factor of the "workflow experience", a perfect
segue to the next point.

## Workflow experience

The everyday relationship I have with the language, the combination of
tooling and language features is what I call "workflow experience".

Let's start with the tooling: Go provides great basics for everything but
dependencies. While I'm happy to see an amazing team doing amazing work on
[dep](https://github.com/golang/dep), the current status isn't great for such a
recent language. I vendor everything via
[govendor](https://github.com/kardianos/govendor) and it works. But I have to
read docs every time I use it.

Now, I'm sure one could say "it's your specific tool, X is better!" and I
wouldn't argue. The point is, though, that my experience with dependency
management is pretty much the same as in any other language I've come across. As
an everyday user, you only need to know how to download, update, add or remove
dependencies, and you're good to go (pun not intended). I have high hopes for
dep to become the one solution that makes Go a modern language from this
perspective too (yes, I'm indeed implying it is not right now).

Apart from dependency management, the tooling around Go is pretty awesome. The
official toolchain offers a coherent command line experience (coherent is better
than consistent when it comes to interaction, but developers seem to like the
latter more. Sorry, I digress).

I'm happy I don't have to bother with styling (`gofmt` is so good), I like even
more that testing is part of the official toolchain. The Go community builds a
lot of useful tooling, so to keep it short, I will discuss only the ones I use
every day.

The first on the list is
[gometalinter](https://github.com/alecthomas/gometalinter), a nice tool that
runs many linters and normalizes their output. I use it in all my Go projects
because it takes care of the boring parts (like installing the linters I use)
and makes setting up new linters a 1-minute process.

Another nice tool is [go-bindata](https://github.com/jteeuwen/go-bindata), a
small utility that generates Go code to embed files from a disk in the output
binary. I'm using it to embed React applications into binaries, it's easy to
use. Unfortunately, it seems completely abandoned right now, so I'm looking for
a replacement. Interesting note: it's been working fine for almost two years
after the last commit. Stability is a priority in the Go world and I appreciate
it a lot.

Last but not least, I love how well-integrated the Go tooling in [Visual Studio
Code](https://code.visualstudio.com/) is. The editor supports Go officially and
the editing experience is enjoyable. It's worth underlining that most features
are built upon tooling you can use in other editors; most features come from CLI
applications ([gocode](https://github.com/nsf/gocode) or
[gomodifytags](https://github.com/fatih/gomodifytags) are great examples).

Tooling makes for half of the workflow experience, the other half is language features.
When I started using Go, I found a mix of very high-level constructs (like
`select`, `go` and go routines) and low-level ones (like pointers, structs)
confusing.

After a while though, I started seeing an interesting development in my way of
thinking about code. I was more relaxed about naming and structural organization
of different parts. Go makes it easy for me to remove things, to restructure big
chucks of code or just to change them.

A few factors make a difference: very few language features make the code always
easy to read, a strange mix of high-level and low-level constructs gives me
enough power without too much responsibility for the underlining system, and the
ability of writing very solid integration tests makes refactoring a confident
process.

This workflow is the most relaxed I experienced so far. When discussing Go
features, I like to say: I came to Go for the `go` keywords and channels, I
stayed because of interfaces and lack of features.

The workflow experience helps to start new projects too. To me, starting a new
project means writing some code so I can understand the problem I'm
trying to solve better. There's a lot of cognitive load, because it's an uncharted
territory: I have to think hard about naming and about dependencies between
parts.

The workflow experience with Go makes bootstrapping easier on average. But
there's more: the compiler is super annoying (in a good way), and I have to
check all the errors _before_ I can even run the program once.

The frustration of writing `if err != nil` all over the place is at the core of
one of my favourite features: the distinction between errors and exceptions. It
forces me to consider things I can choose to ignore while bootstrapping a
project in other languages: the file may not be there, the network connection
may fail, and so on.

Unfortunately, it is indeed annoying to write a lot of `if err != nil`, so I
guess people often do not get past the initial impact. So they never experience
that "Go programs are production ready as soon as they compile". Sometimes,
that's really true.

## The standard library

The Go standard library is often praised and I can see why. Most parts are
solid, easy to use, and well documented. In no particular order, here are a few
things I enjoy about the standard library:

- [net/http](https://golang.org/pkg/net/http/)

  `http` has almost everything I needed so far. I only needed
  [goji](http://goji.io/) for registering endpoints under a specific pattern.

- [net/httptest](https://golang.org/pkg/net/httptest/)

  `httptest` provides a response recorder that makes testing HTTP handlers easy
  and fun. It gives me great confidence, because I can assert behaviour over the
  actual response output; I do not mock anything.

- [database/sql](https://golang.org/pkg/database/sql)

  Despite using a small ORM for the internal storage, I'm satisfied with `sql`.
  It feels low-level compared to any other library I've used (I did mostly Ruby.
  And Ruby has Sequel – an incredible library). Despite the low-level feeling,
  the package is well-designed and easy to use.

Working with time and dates has always been a bit painful in any language I
used. Sadly, Go manages to do worse than other languages, especially when it
comes to parsing time and dates. I don't find the API intuitive. You need to
provide a "date layout" instead of a pattern for parsing dates, something like
(copying from the official docs):

```go
// longForm shows by example how the reference time would be represented in
// the desired layout.
const longForm = "Jan 2, 2006 at 3:04pm (MST)"
t, _ := time.Parse(longForm, "Feb 3, 2013 at 7:54pm (PST)")
fmt.Println(t)
```

The package provides some layouts, and if you're lucky enough, the format you
want is there then parsing dates is OK. The experience gets considerably worse
if you need a custom layout. As a result "some random date" ends up in your
code as a constant.

I'm not entirely sure what the reason to diverge so much from the usual "give me
a pattern and I'll try to parse this for you" was, but the experience has not
been pleasant so far. If I felt more comfortable with the official issue tracker
(more about this in the "community" paragraph), I would propose to change the
package _a lot_ for the upcoming Go 2.

## Available libraries

Libraries and framework are among the most relevant factors that determine my
choice of a language. I feel "there's a good library for everything" nowadays,
as the community is large enough. I find interesting that, despite the lack of
dependency management tools, working with third-party libraries isn't a
nightmare.

The ecosystem is dynamic and moves slow (it's a good thing), so upgrading
libraries has always been easy despite the lack of official tooling.

## The community

This is the sore point of my experience with Go. I've been thinking a lot about
how to approach the topic.

The first strategy I came up with was to present a (sadly long) list of examples
of "culture that makes me uncomfortable". I decided against it, because as a
reader of that list, I'd feel the writer just wanted to call people out. That is
not my intention, I want to share how I experienced the community, so I will do
that without sharing links.

I will start from the official GitHub [issues
tracker](https://github.com/golang/go/issues). To understand more about the
project, I read the [contribution
guide](https://golang.org/doc/contribute.html). It was depressing:

- No mention of any code of conduct. It makes me think a CoC isn't relevant enough
  for contributing to Go.
- The only form of contribution mentioned is code. It makes me think the Go team
  only cares about code.
- The review process must happen via gerrit, which makes me think the team cares
  about their comfort of review much more than about external contributions.

I like [self-hosting](https://en.wikipedia.org/wiki/Self-hosting) languages, so
I moved on to issues anyway. But it has not been a better experience.

I've often felt people tried to be clever more than helpful, and I have seen
incredible resistance to change. I do understand changing a programming language
is no easy business, but in some cases it felt unreasonable. What I'm trying to
say is that I do not feel welcome to ever open an issue, because I expect it
will be dismissed right away.

Outside of the official spaces, I've experienced a lot of contempt culture. I have
seen many examples of "X sucks, just use Go". This is not something I am able to
tolerate, so I do not feel engaged with the community.

I've often seen contempt with JavaScript, and it is not unusual to hear things
like "I hope I never have to touch JavaScript again". I have seen twitter
threads saying "X is not a real language compared to Go" or "Use Go, that's a
real language". These things do not foster a good culture, and miss on great
learning opportunities. We could learn a lot from npm/yarn eh?

On the bright side, I had [this
conversation](https://twitter.com/lucapette/status/911931158396628992) on
twitter and I _really_ loved how
[NateTheFinch](https://twitter.com/NateTheFinch) handled it. Another great
example of positive attitude comes from a recent [twitter
thread](https://twitter.com/_rsc/status/921211286591098880) by
[\_rsc](https://twitter.com/_rsc).

We need to see many more examples of this attitude, especially from members of
the core team. Because, you know, "leading by example" has quite some truth in
it.
