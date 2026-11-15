# Build context is the seta/ project root (the frontend is embedded).

# --- frontend: build the Alpine app ------------------------------------
FROM node:26-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- backend: embed the frontend build into the binary ------------------
FROM golang:1.27-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend /src/dist ./dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /seta .

# --- runtime --------------------------------------------------------------
FROM alpine:3
RUN adduser -D -u 10001 seta
COPY --from=backend /seta /usr/local/bin/seta
USER seta
EXPOSE 8080

# Liveness only: a warming model must not mark the app unhealthy (that is what
# /api/ready is for, and the compose healthcheck on the model covers it).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["seta"]
