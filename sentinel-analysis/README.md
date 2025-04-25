# Scoper

A high-performance, rule-based analyzer for TypeScript/JavaScript codebases that helps identify patterns, potential issues, and enforce coding standards. Scoper specializes in analyzing code structures and dependencies to help maintain clean and maintainable codebases.

## Overview

TypeScript Analyzer scans your codebase for patterns defined in rule implementations. It uses the OXC parser to quickly analyze TypeScript/JavaScript files and provide insights through a rich rule evaluation system.

Key features:

- Fast, parallel analysis of large codebases
- Extensible rule system with customizable rules
- JSON export for integration with CI/CD pipelines
- Configurable rule activation through command-line options or YAML config

## Installation

### Prerequisites

- Rust (nightly recommended)
- Cargo

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd scoper

# Build the project
cargo build --release
```

## Usage

### Basic Command

```bash
scoper [OPTIONS] [PATH]
```

### Quick Start with Run Script

```bash
# Run analysis on a specific directory
./run.sh /path/to/typescript/project
```

### Command Line Options

```
OPTIONS:
  -v, --verbose               Enable verbose output
  -e, --extensions <EXTS>     File extensions to include (default: "ts,tsx")
  --no-rules                  Disable rules-based analysis
  --rule-debug                Enable verbose rule debugging output
  -s, --severity <LEVEL>      Minimum severity level to report (error, warning, info)
  --enable-rule <RULE_ID>     Enable specific rule by ID (can be used multiple times)
  --disable-rule <RULE_ID>    Disable specific rule by ID (can be used multiple times)
  --enable-tag <TAG>          Enable rules with specific tag (can be used multiple times)
  --disable-tag <TAG>         Disable rules with specific tag (can be used multiple times)
  --export-json <FILE>        Export rule findings to a JSON file
  -h, --help                  Print help
  -V, --version               Print version
```

### Example Commands

```bash
# Analyze a specific directory with verbose output
./scoper /path/to/project -v

# Only analyze JavaScript files
./scoper /path/to/project -e js

# Enable only specific rules
./scoper /path/to/project --enable-rule import-count --enable-rule typescript-assertion-detection

# Disable specific rules
./scoper /path/to/project --disable-rule import-rxjs

# Enable rules by tag
./scoper /path/to/project --enable-tag angular

# Export findings to JSON
./scoper /path/to/project --export-json ./findings.json
```

## Configuration

You can configure the analyzer using a `rules.json` file:

```json
{
  "rules": {
    "no-console-warn-visitor": "error",
    "angular-observable-inputs": "warn",
    "angular-input-count": ["error", { "maxInputs": 5 }]
  }
}
```

The rules object maps rule names to their configuration. There are three ways to specify a rule's configuration:

1. `"rule-name": "error"` or `"rule-name": "warn"` - Simple rule activation with specified severity
2. `"rule-name": ["error", { options }]` - Rule with severity and configuration options
3. `"rule-name": ["warn", { options }]` - Rule with severity and configuration options

### Command Line Configuration

For simple use cases, you can enable rules from the command line:

```bash
# Enable simple rules
./scoper --rules no-console-warn-visitor,angular-observable-inputs

# Enable a single rule
./scoper --enable-rule angular-input-count
```

For more complex configuration including rule options and severity levels, use a rules.json file:

```bash
./scoper --rules-config rules.json
```

### Rule Configuration Options

Different rules accept different configuration options:

#### angular-input-count

Controls the maximum number of Angular inputs allowed in a component.

```json
{ "maxInputs": 5 }
```

## Understanding Rule Results

When you run the analyzer, it will display rule results in the terminal:

```
Rule Results:
  2 Error findings:
    typescript-assertion-detection: 901 matches
    import-count-error: 138 matches
  1 Warning findings:
    import-rxjs: 4 matches

  Summary: 2 errors, 1 warnings
```

For each rule match, the analyzer counts individual occurrences. If a file has multiple matches for a rule, each match is counted separately.

## JSON Export

When using the `--export-json` option or the `export_json` configuration, the analyzer will create a JSON file with detailed findings:

```json
{
  "timestamp": "2023-04-05T12:03:00Z",
  "total_findings": 1043,
  "findings_by_rule": {
    "typescript-assertion-detection": 901,
    "import-count-error": 138,
    "import-rxjs": 4
  },
  "findings": [
    {
      "rule_id": "typescript-assertion-detection",
      "file_path": "/path/to/file.ts",
      "matched": true,
      "severity": "error",
      "message": "TypeScript type assertion detected",
      "location": {
        "line": 42,
        "column": 15,
        "start": 1234,
        "end": 1245
      },
      "metadata": {}
    }
    // More findings...
  ]
}
```

## Built-in Rules

The analyzer includes several built-in rules, including:

- `typescript-assertion-detection`: Detects TypeScript type assertions
- `import-rxjs`: Detects imports from the 'rxjs' module
- `import-rxjs-operators`: Detects imports from 'rxjs/operators'
- `import-count`: Counts the number of import statements in a file
- `angular-decorators-detection`: Detects Angular property decorators

## Creating Custom Rules

You can create custom rules by implementing the `Rule` trait. Here's a simple example:

```rust
use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program, ModuleDeclaration};
use crate::rules::{Rule, RuleMatch, RuleSeverity, SourceLocation};

pub struct CustomRule {
    id: String,
    description: String,
    tags: Vec<String>,
    severity: RuleSeverity,
}

impl CustomRule {
    pub fn new() -> Self {
        Self {
            id: "custom-rule".to_string(),
            description: "A custom rule example".to_string(),
            tags: vec!["custom".to_string()],
            severity: RuleSeverity::Warning,
        }
    }
}

impl Rule for CustomRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }

    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        // Your rule logic here
        let matched = false; // Set to true if your rule finds a match

        Ok(RuleMatch {
            rule_id: self.id.clone(),
            file_path: file_path.to_string(),
            matched,
            severity: self.severity,
            message: None,
            location: None,
            metadata: HashMap::new(),
        })
    }
}

pub fn create_custom_rule() -> Arc<dyn Rule> {
    Arc::new(CustomRule::new())
}
```

After implementing your custom rule, you can register it with the rule registry in `src/rules/custom/mod.rs`.

## Performance

The analyzer is designed for high performance:

- Uses parallel processing with Rayon
- Employs the MiMalloc memory allocator for faster memory operations
- Processes thousands of files per second on modern hardware

## License

[Add your license information here]
