spell:
	@codespell *.md

toc:
	@bin/toc > TOC.md

css:
	@yarn run css

pdf: css
	@bin/pdf

epub: css
	@bin/epub

html:
	@bin/mdbookify
	@mdbook build

all: spell css pdf epub html
