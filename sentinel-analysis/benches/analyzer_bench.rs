use criterion::{BenchmarkId, Criterion, black_box, criterion_group, criterion_main};
use std::fs;
use std::sync::Arc;
use typescript_analyzer::{RulesRegistry, analyzer, utilities::DebugLevel};

const SMALL_FILE: &str = r#"
function test() {
    console.log("Hello World");
}
"#;

const MEDIUM_FILE: &str = r#"
import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    template: '<div>Hello</div>'
})
export class AppComponent {
    title = 'test';
}
"#;

fn setup_test_files(content: &str, count: usize) -> Vec<String> {
    let temp_dir = tempfile::tempdir().unwrap();
    (0..count)
        .map(|i| {
            let file_path = temp_dir.path().join(format!("test_{}.ts", i));
            fs::write(&file_path, content).unwrap();
            file_path.to_str().unwrap().to_string()
        })
        .collect()
}

fn bench_file_analysis(c: &mut Criterion) {
    let mut group = c.benchmark_group("file_analysis");
    group.sample_size(10); // Reduce sample size for large benchmarks

    let rules_registry = Arc::new(RulesRegistry::new());
    let debug_level = DebugLevel::None;

    // Test different file sizes
    let sizes = vec![
        ("small", SMALL_FILE, 100),
        ("medium", MEDIUM_FILE, 50),
        ("large", include_str!("../test_files/large.ts"), 20),
    ];

    for (size_name, content, count) in sizes {
        let files = setup_test_files(content, count);

        group.bench_with_input(
            BenchmarkId::new("batch_processing", size_name),
            &files,
            |b, files| {
                b.iter(|| analyzer::process_files(black_box(files), &rules_registry, debug_level))
            },
        );
    }

    group.finish();
}

fn bench_batch_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("batch_sizes");
    group.sample_size(10);

    let rules_registry = Arc::new(RulesRegistry::new());
    let debug_level = DebugLevel::None;
    let files = setup_test_files(MEDIUM_FILE, 100);

    // Test with different batch sizes relative to CPU count
    let cpu_count = num_cpus::get();
    let batch_sizes = vec![cpu_count, cpu_count * 2, cpu_count * 4, cpu_count * 8];

    for &batch_size in &batch_sizes {
        group.bench_with_input(
            BenchmarkId::new("batch_size", batch_size),
            &batch_size,
            |b, _| {
                // Changed to ignore the size parameter since we're not using it
                b.iter(|| {
                    let (results, _) =
                        analyzer::process_files(black_box(&files), &rules_registry, debug_level);
                    results
                })
            },
        );
    }

    group.finish();
}

fn bench_allocator_reuse(c: &mut Criterion) {
    let mut group = c.benchmark_group("allocator_reuse");
    group.sample_size(10);

    let rules_registry = Arc::new(RulesRegistry::new());
    let debug_level = DebugLevel::None;
    let files = setup_test_files(MEDIUM_FILE, 50);

    group.bench_function("with_allocator_reuse", |b| {
        b.iter(|| analyzer::process_files(black_box(&files), &rules_registry, debug_level))
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_file_analysis,
    bench_batch_sizes,
    bench_allocator_reuse
);
criterion_main!(benches);
