#![feature(test)]

extern crate test;

use std::rc::Rc;
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use criterion::measurement::WallTime;
use criterion::Throughput;
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
use oxc_semantic::SemanticBuilder;

use typescript_analyzer::rules::custom::{NoConsoleWarnRule, NoConsoleWarnVisitorRule};
use typescript_analyzer::rules_registry::RulesRegistry;

// Complex test case
const COMPLEX_CODE: &str = r#"
    class TestClass {
        constructor() {
            this.warnings = ['a', 'b', 'c'];
        }

        logWarnings() {
            this.warnings.forEach(w => {
                console.warn('Warning:', w);
                if (w === 'b') {
                    console.warn('Special warning');
                }
            });
        }

        async testAsync() {
            await Promise.all(
                this.warnings.map(async (w) => {
                    console.warn('Async warning:', w);
                })
            );
        }
    }
"#;

// Traditional implementation function
fn run_traditional() -> Vec<oxc_diagnostics::OxcDiagnostic> {
    let allocator = Rc::new(Allocator::default());
    let source_type = SourceType::default();
    let parse_result = Parser::new(&allocator, COMPLEX_CODE, source_type).parse();
    let semantic_result = SemanticBuilder::new().build(&parse_result.program);
    
    let mut registry = RulesRegistry::new();
    registry.register_rule(Box::new(NoConsoleWarnRule));
    registry.enable_rule("no-console-warn");
    
    registry.run_rules(&semantic_result, "test.js").diagnostics
}

// Visitor pattern implementation function
fn run_visitor() -> Vec<oxc_diagnostics::OxcDiagnostic> {
    let allocator = Rc::new(Allocator::default());
    let source_type = SourceType::default();
    let parse_result = Parser::new(&allocator, COMPLEX_CODE, source_type).parse();
    let semantic_result = SemanticBuilder::new().build(&parse_result.program);
    
    let mut registry = RulesRegistry::new();
    registry.register_rule(Box::new(NoConsoleWarnVisitorRule));
    registry.enable_rule("no-console-warn-visitor");
    
    registry.run_rules(&semantic_result, "test.js").diagnostics
}

// Implementing Copy for Implementation enum
#[derive(Debug, Clone, Copy)]
enum Implementation {
    Traditional,
    Visitor
}

fn compare_implementations(c: &mut Criterion) {
    let implementations = vec![
        (Implementation::Traditional, "Traditional"),
        (Implementation::Visitor, "Visitor")
    ];
    
    let mut group = c.benchmark_group("Console Warn Detection");
    
    // Use longer measurement time for more accurate results
    group.measurement_time(std::time::Duration::from_secs(10));
    group.sample_size(100);
    
    for (implementation, name) in implementations {
        group.bench_with_input(
            BenchmarkId::new("Implementation", name), 
            &implementation, 
            |b, &impl_type| {
                match impl_type {
                    Implementation::Traditional => b.iter(|| black_box(run_traditional())),
                    Implementation::Visitor => b.iter(|| black_box(run_visitor())),
                }
            }
        );
    }
    
    group.finish();
}

// Configure Criterion for better comparison reporting
fn criterion_config() -> Criterion {
    Criterion::default()
        .with_plots() // Generate plots
        .configure_from_args() // Allow command line configuration
        .significance_level(0.01) // More strict statistical significance
        .sample_size(100) // Default sample size (group settings override this)
}

criterion_group!{
    name = benches;
    config = criterion_config();
    targets = compare_implementations
}
criterion_main!(benches); 