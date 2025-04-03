FROM node:20-slim

RUN apt-get update && apt-get install -y \
    bash \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/uploads /app/results /app/bin

# Copy the pre-built binaries
COPY bin/ /app/bin/
RUN chmod +x /app/bin/*

# Clean results directory
RUN rm -rf /app/results/*

# Add debug environment variables
ENV DEBUG=1
ENV LOG_LEVEL=debug

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run with verbose output
CMD ["/app/bin/uploader", "-v"]
