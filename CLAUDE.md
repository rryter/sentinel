# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sentinel is a TypeScript/JavaScript code analysis platform consisting of three main services:
- **sentinel-analysis**: Rust-based analyzer using OXC parser (binary named "scoper")
- **sentinel-backend**: Ruby on Rails API for managing projects, analysis jobs, and results
- **sentinel-frontend**: Angular 19 frontend with Nx monorepo structure

## Common Commands

### Development
```bash
# Start all services
docker-compose up

# Backend only (Rails server on port 3000)
cd sentinel-backend
bundle install
rails server

# Frontend only (dev server on port 4200 + VS Code opener on port 3001)
cd sentinel-frontend
npm install
npm run dev  # Recommended: Starts dev server + VS Code opener + auto-manifest generation

# Alternative: Dev server only (without VS Code opener)
npx nx serve sentinel

# Analysis service
cd sentinel-analysis
cargo build --features custom_rules
./run.sh
```

### Testing
```bash
# Backend tests
cd sentinel-backend
bundle exec rspec
bundle exec rspec spec/path/to/specific_spec.rb  # Single test

# Frontend tests
cd sentinel-frontend
npx nx test sentinel
npx nx test sentinel --testFile=specific.spec.ts  # Single test

# Analysis tests
cd sentinel-analysis
cargo test
cargo test specific_test_name  # Single test
```

### Building
```bash
# Build all Docker images
./build.sh

# Build specific services
cd sentinel-backend && docker build -t sentinel-backend --target production .
cd sentinel-frontend && npm run build:prod
cd sentinel-analysis && cargo build --release --features custom_rules
```

### API Client Generation
```bash
# Generate TypeScript API clients from Rails OpenAPI spec
cd sentinel-backend
rails rswag:specs:swaggerize
cd ..
./tools/generate-api-clients.sh
```

## Architecture Overview

### Frontend (Angular)
- **Signal-based state management**: Use Angular signals for reactive state, avoid RxJS subjects
- **Standalone components**: All components should be standalone, no NgModules
- **Modern Angular patterns**: Use @if/@for/@switch instead of *ngIf/*ngFor, inject() instead of constructor injection
- **Spartan UI**: Component library for consistent UI
- **Route structure**: Lazy-loaded feature modules under apps/sentinel/src/app/

### Backend (Rails API)
- **API-only Rails**: No views, JSON responses only
- **Authentication**: Devise JWT with WebAuthn support
- **Background jobs**: Sidekiq for processing analysis jobs
- **OpenAPI docs**: Automatically generated at /api-docs
- **Key models**: Project, AnalysisJob, Violation, Rule, User

### Analysis Service (Rust)
- **OXC parser**: High-performance TypeScript/JavaScript parser
- **Rule system**: Extensible rules implementing the Rule trait
- **Parallel processing**: Multi-threaded file analysis
- **Output format**: JSON findings written to findings.json

## Key Patterns

### Angular Development
- Always use signals for state: `signal()`, `computed()`, `effect()`
- Prefer inject() over constructor dependency injection
- Use standalone components with direct imports
- Modern control flow: @if, @for, @switch, @defer
- Route data via input binding: `withComponentInputBinding()`

### API Integration
- TypeScript clients auto-generated in libs/sentinel/api-client/
- Use OpenAPI spec for contract-first development
- API versioning through /v1 prefix

### Analysis Rules
- Implement the Rule trait in sentinel-analysis/src/rules/
- Register new rules in the catalog
- Rules output violations with file path, line, column, and message