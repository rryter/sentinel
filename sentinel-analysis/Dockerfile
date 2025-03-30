# Builder stage
FROM golang:1.24.1-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    gcc \
    musl-dev \
    git \
    bash

WORKDIR /app

# Copy source code
COPY . .

# Build the binaries with debug information
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 ./runIndexer.sh

# Development stage
FROM alpine:latest AS development
RUN apk add --no-cache go gcc musl-dev git wget
WORKDIR /app
COPY --from=builder /app/bin/uploader /app/bin/uploader
COPY --from=builder /app/bin/indexer /app/bin/indexer
COPY --from=builder /app/rules /app/rules
COPY --from=builder /app/uploads /app/uploads
COPY --from=builder /app/results /app/results
COPY --from=builder /app/build_rules.sh /app/build_rules.sh
COPY --from=builder /app/rules /app/rules
RUN chmod +x /app/bin/uploader /app/bin/indexer /app/build_rules.sh && \
    mkdir -p /app/src /app/bin/rules

# Install Delve debugger
RUN go install github.com/go-delve/delve/cmd/dlv@latest && \
    ln -s /root/go/bin/dlv /usr/local/bin/dlv

# Expose ports for both services
EXPOSE 8080 2345 2346

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Create a startup script to compile rules and start the uploader
COPY <<EOF /app/start.sh
#!/bin/sh
cd /app/src
echo "Compiling rules..."
cd rules
for category in */; do
  cd "\$category"
  for rule in *.go; do
    if [ -f "\$rule" ]; then
      echo "Building rule: \$rule"
      go build -buildmode=plugin -o "/app/bin/rules/\${category%/}/\${rule%.go}.so" "\$rule"
    fi
  done
  cd ..
done
cd /app
echo "Starting uploader service..."
/app/bin/uploader -port=8080
EOF

RUN chmod +x /app/start.sh

# Start uploader with Delve debugger
CMD ["/app/start.sh"]

# Production stage
FROM debian:bookworm-slim AS production

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/bin/uploader /app/bin/uploader
COPY --from=builder /app/bin/indexer /app/bin/indexer
COPY --from=builder /app/bin/rules /app/bin/rules
COPY --from=builder /app/results /app/results

RUN mkdir -p /app/bin/uploads && \
    chmod +x /app/bin/uploader /app/bin/indexer

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./bin/uploader"] 