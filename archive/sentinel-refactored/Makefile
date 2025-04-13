.PHONY: all rust go clean

all: rust go

# Build the Rust bridge library
rust:
	cd rust-oxc-bridge && cargo build --release

# Build the Go program
go: rust
	cd go && go build -o ../oxc-parser-go

# Example command to run the parser on a JavaScript file
run: all
	./oxc-parser-go go/main.go

# Clean up build artifacts
clean:
	cd rust-oxc-bridge && cargo clean
	rm -f oxc-parser-go 