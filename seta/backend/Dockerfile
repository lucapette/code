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
COPY --from=backend /seta /usr/local/bin/seta
EXPOSE 8080
ENTRYPOINT ["seta"]
