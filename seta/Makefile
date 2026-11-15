.PHONY: help frontend build run test test-go test-frontend type-check clean

help:
	@echo "frontend    build the Alpine app into frontend/dist"
	@echo "build       embed the frontend and build bin/seta"
	@echo "run         build, then serve on :8080 (UPSTREAM_URL to override)"
	@echo "test        Go tests + frontend tests + type check"
	@echo "clean       remove build output"

frontend:
	npm --prefix frontend install
	npm --prefix frontend run build

build: frontend
	@mkdir -p bin
	cp -R frontend/dist/. backend/dist/
	cd backend && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../bin/seta .

run: build
	./bin/seta

test: test-go test-frontend type-check

test-go:
	cd backend && go test ./...

test-frontend:
	npm --prefix frontend run test

type-check:
	npm --prefix frontend run type-check

clean:
	rm -rf frontend/dist bin
	git clean -qX backend/dist
