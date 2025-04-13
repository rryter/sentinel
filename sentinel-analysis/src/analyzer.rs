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

// Calculate optimal batch size based on available CPU cores
fn calculate_batch_size() -> usize {
    let num_cpus = num_cpus::get();
    // Use a multiple of CPU cores for better parallelization
    // This allows for some I/O overlap while keeping memory usage reasonable
    num_cpus * 2
}

/// Holds shared resources for batch processing
struct BatchProcessor {
    allocator: Allocator,
    rules_registry: Arc<RulesRegistry>,
    debug_level: DebugLevel,
}

#[derive(Default)]
struct FileContent {
    content: String,
    source_type: Option<SourceType>,
}

impl BatchProcessor {
    fn new(rules_registry: Arc<RulesRegistry>, debug_level: DebugLevel) -> Self {
        // Initialize with a larger capacity for reuse
        let allocator = Allocator::with_capacity(1024 * 1024); // 1MB initial capacity
        Self {
            allocator,
            rules_registry,
            debug_level,
        }
    }

    // Pre-load file contents in parallel
    fn preload_files(files: &[String]) -> Vec<(String, Result<FileContent, String>)> {
        files
            .par_iter()
            .map(|file_path| {
                let content = match fs::read(file_path) {
                    Ok(bytes) => match String::from_utf8(bytes) {
                        Ok(content) => {
                            let source_type = SourceType::from_path(Path::new(file_path)).ok();
                            Ok(FileContent {
                                content,
                                source_type,
                            })
                        }
                        Err(_) => Err("UTF-8 conversion failed".to_string()),
                    },
                    Err(err) => Err(err.to_string()),
                };
                (file_path.clone(), content)
            })
            .collect()
    }

    fn process_batch(&mut self, files: &[String]) -> Vec<FileAnalysisResult> {
        // Pre-load all files in parallel
        let preloaded_files = Self::preload_files(files);

        // Process preloaded files sequentially to reuse allocator
        preloaded_files
            .iter()
            .map(|(file_path, content)| {
                let result = match content {
                    Ok(file_content) => self.analyze_preloaded_file(file_path, file_content),
                    Err(err) => self.create_error_result(file_path, err),
                };
                // Reset allocator for next file
                self.allocator.reset();
                result
            })
            .collect()
    }

    fn analyze_preloaded_file(
        &mut self,
        file_path: &str,
        content: &FileContent,
    ) -> FileAnalysisResult {
        let file_start = Instant::now();

        // Parse file
        let parse_start = Instant::now();
        let source_type = match content.source_type {
            Some(st) => st,
            None => return self.create_error_result(file_path, "Invalid source type"),
        };

        let parse_result = Parser::new(&self.allocator, &content.content, source_type).parse();
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

/// Process files in parallel using rayon with optimized batch processing
pub fn process_files(
    files: &[String],
    rules_registry_arc: &Arc<RulesRegistry>,
    debug_level: DebugLevel,
) -> (Vec<FileAnalysisResult>, Duration) {
    let analysis_start = Instant::now();
    let batch_size = calculate_batch_size();

    // Create processors up front, one per thread
    let thread_pool = rayon::ThreadPoolBuilder::new()
        .build()
        .expect("Failed to create thread pool");

    let analysis_results: Vec<FileAnalysisResult> = thread_pool.install(|| {
        files
            .par_chunks(batch_size)
            .map(|batch| {
                let mut processor =
                    BatchProcessor::new(Arc::clone(rules_registry_arc), debug_level);
                processor.process_batch(batch)
            })
            .flatten()
            .collect()
    });

    let analysis_duration = analysis_start.elapsed();
    (analysis_results, analysis_duration)
}
