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
FROM golang:1.24.1-alpine AS development

# Install build dependencies
RUN apk add --no-cache \
    git \
    curl \
    build-base \
    nodejs \
    npm \
    openjdk17-jdk \
    bash

# Set working directory
WORKDIR /app

# Copy all source files first
COPY . .

# Make scripts executable
RUN chmod +x runIndexer.sh build_rules.sh

# Create necessary directories
RUN mkdir -p /app/bin/rules /app/uploads /app/results

# Copy binaries from builder stage
COPY --from=builder /app/bin/uploader /app/bin/uploader
COPY --from=builder /app/bin/indexer /app/bin/indexer

# Download dependencies
RUN go mod download

# Expose ports
EXPOSE 8080 2345 2346

# Create startup script
COPY <<EOF /app/start.sh
#!/bin/bash
cd /app
echo "Starting uploader service..."
/app/bin/uploader
EOF

RUN chmod +x /app/start.sh

# Start the development server
CMD ["/app/start.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

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

# Copy binaries and rules from development stage
COPY --from=development /app/bin/uploader /app/bin/uploader
COPY --from=development /app/bin/indexer /app/bin/indexer
COPY --from=development /app/bin/rules /app/bin/rules
COPY --from=development /app/results /app/results

RUN mkdir -p /app/bin/uploads && \
    chmod +x /app/bin/uploader /app/bin/indexer

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./bin/uploader"] 