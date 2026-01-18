## 0.2.1 (2026-01-18)

This was a version bump only for component-inspector to align it with other projects, there were no code changes.

## 0.2.0 (2026-01-18)

This was a version bump only for component-inspector to align it with other projects, there were no code changes.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-XX

### Added
- Initial release of @twygmbh/component-inspector
- Angular 19+ component inspector service with visual overlays
- Component detection and metadata extraction via Angular Ivy API
- Hover-based component highlighting with configurable colors per library
- Click-to-open in editor functionality (VS Code and 20+ other editors)
- Configuration panel for filtering components by library/selector
- Persistent localStorage configuration
- Performance optimizations: throttling, lazy rendering, IntersectionObserver
- esbuild plugin for automatic component manifest generation (`@twygmbh/component-inspector/plugin`)
- VS Code opener development server CLI tool (`vscode-opener` command)
- Comprehensive documentation and usage examples
- Zero-configuration setup with `provideComponentInspector()`
- Modern Angular patterns: standalone components, signals, inject()

### Features
- **ComponentInspectorService**: Main orchestration service
- **ComponentDetectorService**: DOM scanning and component detection
- **OverlayManagerService**: Visual overlay rendering and positioning
- **VscodeIntegrationService**: Editor integration API client
- **InspectorConfigPanel**: Configuration UI component
- **Utility functions**: Component metadata extraction, throttle/debounce, library color generation

### Technical Details
- Built with Angular 19+ (21.0.0-next.9)
- Uses Angular signals for reactive state management
- Standalone components (no NgModules)
- TypeScript strict mode
- Comprehensive test coverage with Jest
- Bundle size: ~15-20kb minified
