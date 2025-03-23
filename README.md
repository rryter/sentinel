# Development

## Prerequisites

- Ruby 3.x
- Rails 7.x
- Redis (for Sidekiq)
- Go 1.x
- Node.js & npm

## Running the Application

1. Start Rails API server:
   ```bash
   rails server
   ```
2. Start Sidekiq for background jobs:
   ```bash
   bundle exec sidekiq
   ```
3. Start the Go server (if applicable):
   ```bash
   go run main.go
   ```
4. Launch the frontend application:
   ```bash
   npm start
   ```
