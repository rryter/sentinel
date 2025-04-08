use crate::rules_registry::RulesRegistry;
use crate::utilities::{log, DebugLevel};
use crate::FileAnalysisResult;
use crate::RuleDiagnostic;

use oxc_allocator::Allocator;
use oxc_diagnostics::NamedSource;
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;

use rayon::prelude::*;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Analyze a file and return detailed results
pub fn analyze_file(
    file_path: &str,
    rules_registry: Arc<RulesRegistry>,
    debug_level: DebugLevel,
) -> FileAnalysisResult {
    // Return the new struct
    let file_start = Instant::now();

    // Read file
    let source = match fs::read_to_string(file_path) {
        Ok(content) => content,
        Err(err) => {
            log(
                DebugLevel::Error,
                debug_level,
                &format!("Error reading file {}: {}", file_path, err),
            );
            return FileAnalysisResult {
                file_path: file_path.to_string(),
                parse_duration: Duration::from_secs(0),
                semantic_duration: Duration::from_secs(0),
                rule_durations: HashMap::new(),
                total_duration: Duration::from_secs(0),
                diagnostics: Vec::new(),
            };
        }
    };

    // Measure parsing time
    let parse_start = Instant::now();

    // Parse file
    let allocator = Allocator::default();
    let source_type = match SourceType::from_path(Path::new(file_path)) {
        Ok(st) => st,
        Err(_) => {
            return FileAnalysisResult {
                file_path: file_path.to_string(),
                parse_duration: Duration::from_secs(0),
                semantic_duration: Duration::from_secs(0),
                rule_durations: HashMap::new(),
                total_duration: Duration::from_secs(0),
                diagnostics: Vec::new(),
            }
        }
    };

    let parse_result = Parser::new(&allocator, &source, source_type).parse();
    if !parse_result.errors.is_empty() {
        log(
            DebugLevel::Error,
            debug_level,
            &format!(
                "Parse errors in {}: {}",
                file_path,
                parse_result.errors.len()
            ),
        );

        // Convert parse errors to RuleDiagnostics with "parser" as the rule_id
        let parser_diagnostics = parse_result
            .errors
            .into_iter()
            .map(|err| RuleDiagnostic {
                rule_id: "parser".to_string(),
                diagnostic: err,
            })
            .collect();

        return FileAnalysisResult {
            file_path: file_path.to_string(),
            parse_duration: Duration::from_secs(0),
            semantic_duration: Duration::from_secs(0),
            rule_durations: HashMap::new(),
            total_duration: Duration::from_secs(0),
            diagnostics: parser_diagnostics,
        };
    }

    // Record parse time
    let parse_duration = parse_start.elapsed();

    // Measure semantic analysis time
    let semantic_start = Instant::now();

    // Perform semantic analysis
    let semantic_result = SemanticBuilder::new().build(&parse_result.program);

    // Record semantic analysis time
    let semantic_duration = semantic_start.elapsed();

    // Run configured lint rules with metrics tracking - Now returns diagnostics and rule durations
    let (diagnostics, rule_durations) =
        rules_registry.run_rules_with_metrics(&semantic_result, file_path);

    if !diagnostics.is_empty() && debug_level >= DebugLevel::Info {
        println!("Found {} issues in {}", diagnostics.len(), file_path);
        for rule_diagnostic in &diagnostics {
            // Iterate over reference
            let named_source = NamedSource::new(file_path, source.clone());
            let error = rule_diagnostic
                .diagnostic
                .clone()
                .with_source_code(named_source);
            println!("{:?}", error);
        }
    }

    // Record total file processing time
    let total_duration = file_start.elapsed();

    FileAnalysisResult {
        file_path: file_path.to_string(),
        parse_duration,
        semantic_duration,
        rule_durations,
        total_duration,
        diagnostics,
    }
}

/// Process files in parallel using rayon
pub fn process_files(
    files: &[String],
    rules_registry_arc: &Arc<RulesRegistry>,
    debug_level: DebugLevel,
) -> (Vec<FileAnalysisResult>, Duration) {
    let analysis_start = Instant::now();

    let analysis_results: Vec<FileAnalysisResult> = files
        .par_iter()
        .map(|file_path| {
            let rules_ref = Arc::clone(rules_registry_arc);
            analyze_file(file_path, rules_ref, debug_level)
        })
        .collect();

    let analysis_duration = analysis_start.elapsed();

    (analysis_results, analysis_duration)
}
