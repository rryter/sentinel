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

# Build the binaries
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 ./runIndexer.sh

# Development stage
FROM debian:bookworm-slim AS development

# Install runtime dependencies
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

# Copy binaries and necessary files from builder
COPY --from=builder /app/bin/uploader /app/bin/uploader
COPY --from=builder /app/bin/indexer /app/bin/indexer
COPY --from=builder /app/bin/rules /app/bin/rules
COPY --from=builder /app/results /app/results

# Create necessary directories and set permissions
RUN mkdir -p /app/bin/uploads && \
    chmod +x /app/bin/uploader /app/bin/indexer

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Command to run
CMD ["./bin/uploader"]

# Production stage
FROM debian:bookworm-slim AS production

# Install runtime dependencies
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