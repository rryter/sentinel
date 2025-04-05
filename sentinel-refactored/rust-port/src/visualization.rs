use std::path::Path;
use std::fs;
use anyhow::{Result, Context};
use serde_json::Value;
use plotters::prelude::*;
use plotters::style::Color;

/// Information about a rule's performance
#[derive(Debug, Clone)]
pub struct RulePerformanceInfo {
    pub rule_id: String,
    pub total_execution_time_ms: f64,
    pub normalized_execution_time_ms: f64,
    pub file_count: usize,
    pub match_count: usize,
}

/// Overall performance metrics for a run
#[derive(Debug, Clone)]
pub struct PerformanceRunInfo {
    pub timestamp: String,
    pub total_execution_time_ms: f64,
    pub normalized_execution_time_ms: f64,
    pub file_count: usize,
    pub files_per_second: f64,
    pub rules: Vec<RulePerformanceInfo>,
}

/// Loads performance data from a JSON file
pub fn load_performance_data(file_path: &Path) -> Result<PerformanceRunInfo> {
    let content = fs::read_to_string(file_path)
        .with_context(|| format!("Failed to read performance file: {}", file_path.display()))?;
    
    let data: Value = serde_json::from_str(&content)
        .with_context(|| format!("Failed to parse JSON from: {}", file_path.display()))?;
    
    let timestamp = data["timestamp"].as_str()
        .unwrap_or("Unknown")
        .to_string();
    
    let total_execution_time_ms = data["totalExecutionTimeMs"].as_f64()
        .unwrap_or(0.0);
    
    let normalized_execution_time_ms = data["normalizedExecutionTimeMs"].as_f64()
        .unwrap_or(0.0);
    
    let file_count = data["totalEvaluations"].as_u64()
        .map(|count| count as usize / data["rulePerformance"].as_array().map_or(1, |arr| arr.len()))
        .unwrap_or(0);
    
    // Calculate files per second based on normalized time
    let files_per_second = if normalized_execution_time_ms > 0.0 {
        file_count as f64 / (normalized_execution_time_ms / 1000.0)
    } else {
        0.0
    };
    
    let mut rules = Vec::new();
    if let Some(rule_data) = data["rulePerformance"].as_array() {
        for rule in rule_data {
            rules.push(RulePerformanceInfo {
                rule_id: rule["ruleId"].as_str().unwrap_or("Unknown").to_string(),
                total_execution_time_ms: rule["totalExecutionTimeMs"].as_f64().unwrap_or(0.0),
                normalized_execution_time_ms: rule["normalizedExecutionTimeMs"].as_f64().unwrap_or(0.0),
                file_count: rule["fileCount"].as_u64().unwrap_or(0) as usize,
                match_count: rule["matchCount"].as_u64().unwrap_or(0) as usize,
            });
        }
    }
    
    Ok(PerformanceRunInfo {
        timestamp,
        total_execution_time_ms,
        normalized_execution_time_ms,
        file_count,
        files_per_second,
        rules,
    })
}

/// Loads multiple performance data sets from a directory, filtering by a prefix pattern
pub fn load_performance_history(dir: &Path, prefix: &str) -> Result<Vec<PerformanceRunInfo>> {
    let mut history = Vec::new();
    
    if !dir.exists() || !dir.is_dir() {
        return Ok(history); // Return empty history if directory doesn't exist
    }
    
    // Read the directory entries
    let entries = fs::read_dir(dir)
        .with_context(|| format!("Failed to read directory: {}", dir.display()))?;
    
    println!("Searching for performance data files in: {}", dir.display());
    
    // Track unique timestamps to prevent duplicates
    let mut seen_timestamps = std::collections::HashSet::new();
    
    // Filter for JSON files that match our pattern
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            
            // Only consider JSON files
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            
            // Check if filename starts with our prefix (includes timestamped files)
            let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
            
            // Match both formats: 
            // - prefix.json (the "latest" file)
            // - prefix_YYYYMMDD_HHMMSS.json (timestamped files)
            if stem == prefix || stem.starts_with(&format!("{}_", prefix)) {
                println!("  Found potential performance file: {}", file_name);
                
                match load_performance_data(&path) {
                    Ok(run_info) => {
                        // Skip duplicates based on timestamp
                        if seen_timestamps.insert(run_info.timestamp.clone()) {
                            println!("    Adding performance data from {} (timestamp: {})", 
                                     file_name, run_info.timestamp);
                            history.push(run_info);
                        } else {
                            println!("    Skipping duplicate timestamp: {}", run_info.timestamp);
                        }
                    },
                    Err(e) => {
                        eprintln!("Warning: Failed to load performance data from {}: {}", path.display(), e);
                    }
                }
            }
        }
    }
    
    // Sort by timestamp (should be ISO 8601 format)
    history.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
    
    Ok(history)
}

/// Generate a horizontal bar chart showing the top N slowest rules
pub fn generate_slowest_rules_chart(
    performance_data: &[PerformanceRunInfo],
    output_path: &Path,
    top_n: usize,
) -> Result<()> {
    if performance_data.is_empty() {
        return Err(anyhow::anyhow!("No performance data available"));
    }
    
    // Use the most recent run
    let latest_run = &performance_data[performance_data.len() - 1];
    
    // Sort rules by normalized execution time and take top N
    let mut top_rules = latest_run.rules.clone();
    top_rules.sort_by(|a, b| b.normalized_execution_time_ms.partial_cmp(&a.normalized_execution_time_ms).unwrap());
    top_rules.truncate(top_n);
    
    // Reverse for bottom-to-top drawing
    top_rules.reverse();
    
    // Create color gradient
    let color_gradient = colorous::VIRIDIS;
    
    // Set up the drawing area with Full HD resolution
    let root = BitMapBackend::new(output_path, (1920, 1080))
        .into_drawing_area();
    root.fill(&WHITE)?;
    
    let max_time = top_rules.iter()
        .map(|r| r.normalized_execution_time_ms)
        .fold(0.0, f64::max) * 1.1; // Add 10% margin
    
    let mut chart = ChartBuilder::on(&root)
        .margin(30) // Increased margin for better spacing
        .caption(
            format!("Top {} Slowest Rules - Normalized ({})", top_n, latest_run.timestamp),
            ("sans-serif", 40), // Increased font size
        )
        .set_label_area_size(LabelAreaPosition::Left, 400) // Increased space for rule IDs
        .set_label_area_size(LabelAreaPosition::Bottom, 80) // Increased bottom margin
        .build_cartesian_2d(
            0.0..max_time,
            0..top_rules.len(),
        )?;
    
    chart.configure_mesh()
        .disable_y_mesh()
        .x_desc("Normalized Execution Time (ms)")
        .y_desc("Rule")
        .y_labels(top_rules.len())
        .label_style(("sans-serif", 20)) // Increased label font size
        .x_label_formatter(&|v| format!("{:.2}", v))
        .y_label_formatter(&|idx| {
            if *idx < top_rules.len() {
                // Truncate long rule IDs
                let id = &top_rules[*idx].rule_id;
                if id.len() > 35 { // Allow longer rule IDs with higher resolution
                    format!("{}...", &id[0..32])
                } else {
                    id.clone()
                }
            } else {
                "".to_string()
            }
        })
        .axis_desc_style(("sans-serif", 24)) // Increased axis description font size
        .draw()?;
    
    // Draw bars
    for (idx, rule) in top_rules.iter().enumerate() {
        // Pick color from gradient
        let color_idx = (idx as f64) / (top_rules.len() as f64);
        let rgb = color_gradient.eval_continuous(color_idx);
        let color = RGBColor(rgb.r, rgb.g, rgb.b);
        
        chart.draw_series(std::iter::once(
            Rectangle::new(
                [(0.0, idx), (rule.normalized_execution_time_ms, idx + 1)],
                color.filled(),
            )
        ))?
        .label(format!("{}: {:.2}ms", rule.rule_id, rule.normalized_execution_time_ms))
        .legend(move |(x, y)| Rectangle::new([(x, y - 5), (x + 15, y + 5)], color.filled()));
    }
    
    chart.configure_series_labels()
        .position(SeriesLabelPosition::UpperRight)
        .background_style(WHITE.filled())
        .border_style(&BLACK)
        .label_font(("sans-serif", 18)) // Increased legend font size
        .draw()?;
    
    Ok(())
}

/// Generate a line chart showing execution time trends across runs
pub fn generate_performance_trend_chart(
    performance_data: &[PerformanceRunInfo],
    output_path: &Path,
) -> Result<()> {
    if performance_data.len() < 2 {
        return Err(anyhow::anyhow!("Insufficient performance data for trend analysis"));
    }
    
    // Set up the drawing area with Full HD resolution
    let root = BitMapBackend::new(output_path, (1920, 1080))
        .into_drawing_area();
    root.fill(&WHITE)?;
    
    // Format timestamps for display (use only date part if possible)
    let formatted_timestamps: Vec<String> = performance_data.iter()
        .map(|run| {
            if run.timestamp.len() > 10 {
                run.timestamp[0..10].to_string() // Just the date part
            } else {
                run.timestamp.clone()
            }
        })
        .collect();
    
    // Use normalized time as the primary y-axis scale
    let max_time = performance_data.iter()
        .map(|run| run.normalized_execution_time_ms)
        .fold(0.0, f64::max) * 1.1; // Add 10% margin
    
    let mut chart = ChartBuilder::on(&root)
        .margin(30) // Increased margin
        .caption("Performance Trend Over Time (Normalized)", ("sans-serif", 40)) // Increased title font
        .set_label_area_size(LabelAreaPosition::Left, 120) // Increased left margin
        .set_label_area_size(LabelAreaPosition::Bottom, 80) // Increased bottom margin
        .build_cartesian_2d(
            0..performance_data.len(),
            0.0..max_time,
        )?;
    
    chart.configure_mesh()
        .x_labels(performance_data.len().min(10))
        .x_label_formatter(&|idx| {
            if *idx < formatted_timestamps.len() {
                formatted_timestamps[*idx].clone()
            } else {
                "".to_string()
            }
        })
        .x_desc("Date")
        .y_desc("Execution Time (ms)")
        .label_style(("sans-serif", 20)) // Increased label font size
        .axis_desc_style(("sans-serif", 24)) // Increased axis description font size
        .draw()?;
    
    // Draw normalized execution time series first, with prominent color and thickness
    chart.draw_series(LineSeries::new(
        performance_data.iter().enumerate()
            .map(|(idx, run)| (idx, run.normalized_execution_time_ms)),
        RED.stroke_width(4), // Increased line thickness and using RED for primary metric
    ))?
    .label("Normalized Execution Time (ms)")
    .legend(|(x, y)| PathElement::new(vec![(x, y), (x + 30, y)], RED.stroke_width(4)));
    
    // Draw total execution time series as secondary
    chart.draw_series(LineSeries::new(
        performance_data.iter().enumerate()
            .map(|(idx, run)| (idx, run.total_execution_time_ms)),
        BLUE.mix(0.7).stroke_width(2), // Reduced prominence 
    ))?
    .label("Total Execution Time (ms)")
    .legend(|(x, y)| PathElement::new(vec![(x, y), (x + 30, y)], BLUE.mix(0.7).stroke_width(2)));
    
    chart.configure_series_labels()
        .position(SeriesLabelPosition::UpperLeft)
        .background_style(WHITE.filled())
        .border_style(&BLACK)
        .label_font(("sans-serif", 18)) // Increased legend font size
        .draw()?;
    
    Ok(())
}

/// Calculate files per second metrics using normalized execution time
fn calculate_normalized_fps(run: &PerformanceRunInfo) -> f64 {
    if run.normalized_execution_time_ms > 0.0 {
        run.file_count as f64 / (run.normalized_execution_time_ms / 1000.0)
    } else {
        0.0
    }
}

/// Generate a chart showing files processed per second
pub fn generate_files_per_second_chart(
    performance_data: &[PerformanceRunInfo],
    output_path: &Path,
) -> Result<()> {
    if performance_data.len() < 2 {
        return Err(anyhow::anyhow!("Insufficient performance data for trend analysis"));
    }
    
    // Set up the drawing area with Full HD resolution
    let root = BitMapBackend::new(output_path, (1920, 1080))
        .into_drawing_area();
    root.fill(&WHITE)?;
    
    // Format timestamps for display
    let formatted_timestamps: Vec<String> = performance_data.iter()
        .map(|run| {
            if run.timestamp.len() > 10 {
                run.timestamp[0..10].to_string() // Just the date part
            } else {
                run.timestamp.clone()
            }
        })
        .collect();
    
    // Calculate normalized files per second for each run
    let normalized_fps: Vec<f64> = performance_data.iter()
        .map(calculate_normalized_fps)
        .collect();
    
    let max_fps = normalized_fps.iter()
        .copied()
        .fold(0.0, f64::max) * 1.1; // Add 10% margin
    
    // Calculate max file count for scale
    let max_file_count = performance_data.iter()
        .map(|r| r.file_count)
        .max()
        .unwrap_or(1) * 12 / 10;
    
    // Use i32 instead of usize for x-axis to match Rectangle expectations
    let mut chart = ChartBuilder::on(&root)
        .margin(30) // Increased margin
        .caption("Normalized Files Processed Per Second", ("sans-serif", 40)) // Increased title font
        .set_label_area_size(LabelAreaPosition::Left, 120) // Increased left margin
        .set_label_area_size(LabelAreaPosition::Bottom, 80) // Increased bottom margin
        .build_cartesian_2d(
            0i32..(performance_data.len() as i32),
            0.0..max_fps,
        )?;
    
    chart.configure_mesh()
        .x_labels(performance_data.len().min(10))
        .x_label_formatter(&|idx| {
            let idx_usize = *idx as usize;
            if idx_usize < formatted_timestamps.len() {
                formatted_timestamps[idx_usize].clone()
            } else {
                "".to_string()
            }
        })
        .x_desc("Date")
        .y_desc("Files Per Second (normalized)")
        .label_style(("sans-serif", 20)) // Increased label font size
        .axis_desc_style(("sans-serif", 24)) // Increased axis description font size
        .draw()?;
    
    // Draw files per second as bars with increased opacity
    chart.draw_series(
        performance_data.iter().enumerate().map(|(idx, run)| {
            let idx = idx as i32; // Convert usize to i32
            let color = Palette99::pick(3).mix(0.8); // Increased color opacity
            Rectangle::new(
                [(idx, 0.0), (idx + 1, calculate_normalized_fps(run))],
                color.filled(),
            )
        })
    )?
    .label("Files Per Second (normalized)");
    
    // Draw a line chart for file count directly in the same chart with thicker line
    chart.draw_series(LineSeries::new(
        performance_data.iter().enumerate()
            .map(|(idx, run)| (idx as i32, (run.file_count as f64 / max_file_count as f64) * max_fps)),
        GREEN.stroke_width(3), // Increased line thickness
    ))?
    .label("File Count (scaled)")
    .legend(|(x, y)| PathElement::new(vec![(x, y), (x + 30, y)], GREEN.stroke_width(3)));
    
    chart.configure_series_labels()
        .position(SeriesLabelPosition::UpperLeft)
        .background_style(WHITE.filled())
        .border_style(&BLACK)
        .label_font(("sans-serif", 18)) // Increased legend font size
        .draw()?;
    
    Ok(())
}

/// Generate a dashboard with multiple performance charts
pub fn generate_performance_dashboard(
    performance_data: &[PerformanceRunInfo],
    output_dir: &Path,
    prefix: &str,
) -> Result<()> {
    // Create the output directory if it doesn't exist
    if !output_dir.exists() {
        fs::create_dir_all(output_dir)?;
    }
    
    // Generate slowest rules chart
    let slowest_rules_path = output_dir.join(format!("{}_slowest_rules.png", prefix));
    if let Err(e) = generate_slowest_rules_chart(performance_data, &slowest_rules_path, 10) {
        eprintln!("Warning: Failed to generate slowest rules chart: {}", e);
    } else {
        println!("Generated slowest rules chart: {}", slowest_rules_path.display());
    }
    
    // Generate performance trend chart if we have enough data
    if performance_data.len() >= 2 {
        let trend_path = output_dir.join(format!("{}_performance_trend.png", prefix));
        if let Err(e) = generate_performance_trend_chart(performance_data, &trend_path) {
            eprintln!("Warning: Failed to generate performance trend chart: {}", e);
        } else {
            println!("Generated performance trend chart: {}", trend_path.display());
        }
        
        // Generate files per second chart
        let fps_path = output_dir.join(format!("{}_files_per_second.png", prefix));
        if let Err(e) = generate_files_per_second_chart(performance_data, &fps_path) {
            eprintln!("Warning: Failed to generate files per second chart: {}", e);
        } else {
            println!("Generated files per second chart: {}", fps_path.display());
        }
    } else {
        println!("Need at least 2 performance runs to generate trend charts.");
    }
    
    Ok(())
}

/// Generate visualizations from performance data
pub fn visualize_performance(
    json_path: &Path,
    output_dir: &Path,
) -> Result<()> {
    // Load the latest performance data
    let latest_data = load_performance_data(json_path)?;
    
    // Try to load historical data from the same directory
    let history_dir = json_path.parent().unwrap_or(Path::new("."));
    
    // Get the base file name without timestamp or extension for finding related files
    // For both "performance.json" and "performance_20230504_120000.json" we want "performance"
    let file_name = json_path.file_name().and_then(|n| n.to_str()).unwrap_or("performance");
    let prefix = if let Some(pos) = file_name.find('_') {
        // If filename contains underscore, assume it's a timestamped file
        // and extract the base prefix (e.g., "performance" from "performance_20230504_120000.json")
        &file_name[0..pos]
    } else {
        // Otherwise just use the filename without extension
        file_name.split('.').next().unwrap_or("performance")
    };
    
    println!("Looking for historical performance data with prefix: {}", prefix);
    
    // Load all historical data (including timestamped files)
    let mut all_data = load_performance_history(history_dir, prefix)?;
    
    // Add the latest data if it's not already included
    if all_data.is_empty() || all_data.last().unwrap().timestamp != latest_data.timestamp {
        all_data.push(latest_data);
    }
    
    println!("Found {} performance data points", all_data.len());
    
    // Generate the dashboard
    generate_performance_dashboard(&all_data, output_dir, prefix)?;
    
    Ok(())
} 