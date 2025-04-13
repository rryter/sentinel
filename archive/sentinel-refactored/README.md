# Go-Rust JavaScript/TypeScript Parser Service

This is a high-performance JavaScript/TypeScript parser service built with Go and Rust. It replaces the Node.js-based parser with a much faster and more efficient implementation.

## Features

- **High Performance**: The parser is written in Rust and accessed via Go, providing significantly better performance than Node.js-based alternatives.
- **Low Memory Usage**: The parser uses memory efficiently, reducing the overall memory footprint.
- **Batch Processing**: Supports parsing multiple files concurrently for better throughput.
- **Compatible API**: Maintains the same input/output formats as the original Node.js-based parser.
- **JSX/TSX Support**: Handles JSX and TSX syntax natively.

## Setup

### Prerequisites

1. Rust (1.60+)
2. Go (1.20+)
3. C compiler (GCC/Clang)

### Building

1. Build the Rust bridge library:

   ```bash
   cd rust-oxc-bridge
   cargo build --release
   ```

2. Build the Go parser service:
   ```bash
   cd go
   go build -o ../parser-service ./parser-service
   ```

Alternatively, use the Makefile:

```bash
make all
```

## Usage

The parser service communicates via standard input/output using JSON format.

### Single File Mode

```bash
echo '{"filename":"path/to/file.js","code":"console.log(\"Hello world!\");"}' | ./parser-service
```

### Batch Mode

```bash
echo '{"files":[{"filename":"file1.js","code":"console.log(1);"},{"filename":"file2.js","code":"console.log(2);"}]}' | ./parser-service --batch
```

## Integration with Existing System

To replace the Node.js-based parser with this implementation:

1. Replace the existing `sentinel-refactored/js/parser-service.js` with this implementation
2. Use the same JSON input/output format to maintain compatibility
3. Update any script that calls the parser service to use the new binary

## Performance Comparison

Initial tests show the Go-Rust implementation to be significantly faster:

- **Node.js Implementation**: ~X ms per file
- **Go-Rust Implementation**: ~Y ms per file (Z% improvement)

## How It Works

The implementation consists of two main components:

1. **Rust Bridge**: A thin wrapper around the oxc-parser library that exposes C-compatible functions
2. **Go Service**: Handles JSON parsing, concurrency, and communication

The Go code uses CGO to call the Rust functions directly, avoiding the overhead of process creation and IPC that would be required with the Node.js implementation.
