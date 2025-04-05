use std::path::PathBuf;
use clap::Parser;
use anyhow::Result;
use typescript_analyzer::visualization;

/// CLI tool to generate performance visualizations from JSON data
#[derive(Parser, Debug)]
#[command(name = "sentinelvis", version, about = "Generate performance charts from Sentinel analyzer data")]
struct Args {
    /// Path to the performance JSON file
    #[arg(short, long, default_value = "./results/performance.json")]
    input: String,

    /// Directory to output visualization images
    #[arg(short, long, default_value = "./results/charts")]
    output_dir: String,
}

fn main() -> Result<()> {
    let args = Args::parse();
    
    println!("Generating visualizations from: {}", args.input);
    
    let input_path = PathBuf::from(&args.input);
    let output_path = PathBuf::from(&args.output_dir);
    
    match visualization::visualize_performance(&input_path, &output_path) {
        Ok(_) => {
            println!("Visualizations generated successfully in: {}", args.output_dir);
            Ok(())
        },
        Err(e) => {
            eprintln!("Failed to generate visualizations: {}", e);
            Err(e)
        }
    }
} 