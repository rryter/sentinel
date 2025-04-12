use crate::rules_registry::RulesRegistry;
use crate::utilities::{log, DebugLevel};
use crate::FileAnalysisResult;
use crate::RuleDiagnostic;

use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;

use rayon::prelude::*;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};

const BATCH_SIZE: usize = 4; // Tune this based on benchmarking

/// Holds shared resources for batch processing
struct BatchProcessor {
    allocator: Allocator,
    rules_registry: Arc<RulesRegistry>,
    debug_level: DebugLevel,
}

impl BatchProcessor {
    fn new(rules_registry: Arc<RulesRegistry>, debug_level: DebugLevel) -> Self {
        Self {
            allocator: Allocator::default(),
            rules_registry,
            debug_level,
        }
    }

    fn process_batch(&mut self, files: &[String]) -> Vec<FileAnalysisResult> {
        files
            .iter()
            .map(|file_path| self.analyze_file(file_path))
            .collect()
    }

    fn analyze_file(&mut self, file_path: &str) -> FileAnalysisResult {
        let file_start = Instant::now();

        // Read file
        let source = match fs::read(file_path) {
            Ok(bytes) => match String::from_utf8(bytes) {
                Ok(content) => content,
                Err(_) => return self.create_error_result(file_path, "UTF-8 conversion failed"),
            },
            Err(err) => return self.create_error_result(file_path, &err.to_string()),
        };

        // Parse file
        let parse_start = Instant::now();
        let source_type = match SourceType::from_path(Path::new(file_path)) {
            Ok(st) => st,
            Err(_) => return self.create_error_result(file_path, "Invalid source type"),
        };

        let parse_result = Parser::new(&self.allocator, &source, source_type).parse();
        if !parse_result.errors.is_empty() {
            log(
                DebugLevel::Error,
                self.debug_level,
                &format!(
                    "Parse errors in {}: {}",
                    file_path,
                    parse_result.errors.len()
                ),
            );

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
                parse_duration: parse_start.elapsed(),
                semantic_duration: Duration::from_secs(0),
                rule_durations: HashMap::new(),
                total_duration: file_start.elapsed(),
                diagnostics: parser_diagnostics,
            };
        }

        let parse_duration = parse_start.elapsed();

        // Semantic analysis
        let semantic_start = Instant::now();
        let semantic_result = SemanticBuilder::new().build(&parse_result.program);
        let semantic_duration = semantic_start.elapsed();

        // Run rules
        let (diagnostics, rule_durations) = self
            .rules_registry
            .run_rules_with_metrics(&semantic_result, file_path);

        FileAnalysisResult {
            file_path: file_path.to_string(),
            parse_duration,
            semantic_duration,
            rule_durations,
            total_duration: file_start.elapsed(),
            diagnostics,
        }
    }

    fn create_error_result(&self, file_path: &str, error_msg: &str) -> FileAnalysisResult {
        log(
            DebugLevel::Error,
            self.debug_level,
            &format!("Error processing {}: {}", file_path, error_msg),
        );

        FileAnalysisResult {
            file_path: file_path.to_string(),
            parse_duration: Duration::from_secs(0),
            semantic_duration: Duration::from_secs(0),
            rule_durations: HashMap::new(),
            total_duration: Duration::from_secs(0),
            diagnostics: Vec::new(),
        }
    }
}

/// Process files in parallel using rayon with batch optimization
pub fn process_files(
    files: &[String],
    rules_registry_arc: &Arc<RulesRegistry>,
    debug_level: DebugLevel,
) -> (Vec<FileAnalysisResult>, Duration) {
    let analysis_start = Instant::now();

    let analysis_results: Vec<FileAnalysisResult> = files
        .par_chunks(BATCH_SIZE)
        .map(|batch| {
            let mut processor = BatchProcessor::new(Arc::clone(rules_registry_arc), debug_level);
            processor.process_batch(batch)
        })
        .flatten()
        .collect();

    let analysis_duration = analysis_start.elapsed();
    (analysis_results, analysis_duration)
}
