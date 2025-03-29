# Build stage
FROM golang:1.24.1-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git bash build-base

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build rules and binaries using the script
RUN chmod +x build_rules.sh runIndexer.sh && \
    CGO_ENABLED=1 ./runIndexer.sh

# Development stage
FROM golang:1.24.1-alpine AS development

# Install development tools
RUN apk add --no-cache git curl bash build-base

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build rules and binaries using the script
RUN chmod +x build_rules.sh runIndexer.sh && \
    CGO_ENABLED=1 ./runIndexer.sh

# Production stage
FROM golang:1.24.1-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache ca-certificates curl

# Set working directory
WORKDIR /app

# Copy binaries and rules from builder
COPY --from=builder /app/bin/uploader ./bin/uploader
COPY --from=builder /app/bin/indexer ./bin/indexer
COPY --from=builder /app/bin/rules ./bin/rules

# Create necessary directories
RUN mkdir -p uploads results

# Set permissions
RUN chmod +x ./bin/uploader ./bin/indexer

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/up || exit 1

# Run the binary
CMD ["./bin/uploader"] 