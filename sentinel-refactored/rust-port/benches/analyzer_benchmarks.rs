use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use std::path::PathBuf;
use std::sync::Arc;
use typescript_analyzer::rules::custom::AngularLegacyDecoratorsRule;
use typescript_analyzer::{
    analyzer::process_files, rules_registry::RulesRegistry, utilities::DebugLevel,
};
use walkdir::WalkDir;

fn collect_test_files() -> Vec<String> {
    // Collect TypeScript/JavaScript files from the test directory
    let test_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    WalkDir::new(test_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext == "ts" || ext == "js")
                .unwrap_or(false)
        })
        .map(|e| e.path().to_string_lossy().into_owned())
        .collect()
}

fn setup_registry() -> Arc<RulesRegistry> {
    let mut registry = RulesRegistry::new();
    registry.register_rule(Box::new(AngularLegacyDecoratorsRule::new()));
    registry.enable_rule("angular-legacy-decorators");
    Arc::new(registry)
}

fn benchmark_file_processing(c: &mut Criterion) {
    let mut group = c.benchmark_group("file_processing");
    let test_files = collect_test_files();
    let files_count = test_files.len();

    // Test with different batch sizes
    for &size in &[1, 8, 16, 32, 64] {
        group.bench_with_input(
            BenchmarkId::new("batch_size", size),
            &test_files,
            |b, files| {
                let registry = setup_registry();
                b.iter(|| process_files(black_box(files), black_box(&registry), DebugLevel::Error));
            },
        );
    }

    group.finish();
    println!("Benchmarked with {} files", files_count);
}

criterion_group!(benches, benchmark_file_processing);
criterion_main!(benches);
