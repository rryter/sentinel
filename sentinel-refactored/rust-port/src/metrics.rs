use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Write, Read};
use std::path::Path;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};

/// Performance metrics for tracking execution time of different operations
/// Thread-safe implementation for parallel processing
#[derive(Clone)]
pub struct Metrics {
    start_time: Instant,
    /// Total execution time (wall time)
    pub total_duration: Option<Duration>,
    /// Time spent scanning for files
    pub scan_duration: Option<Duration>,
    /// Time spent analyzing all files (wall time)
    pub analysis_duration: Option<Duration>,
    /// Individual file processing times (file path -> duration)
    pub file_times: Arc<Mutex<HashMap<String, Duration>>>,
    /// Detailed breakdown of file parse times
    pub parse_times: Arc<Mutex<HashMap<String, Duration>>>,
    /// Detailed breakdown of semantic analysis times
    pub semantic_times: Arc<Mutex<HashMap<String, Duration>>>,
}

/// Serializable metrics for export to JSON
#[derive(Serialize, Deserialize, Clone)]
struct ExportableMetrics {
    timestamp: String,
    // Wall time metrics
    total_duration_ms: u64,
    scan_duration_ms: u64,
    analysis_duration_ms: u64,
    // File metrics
    files_processed: usize,
    files_per_second_wall_time: f64,
    // CPU time metrics
    cumulative_processing_time_ms: u64,
    avg_time_per_file_ms: f64,
    files_per_second_cpu_time: f64,
    // Parallelism metrics
    parallel_cores_used: usize,
    parallel_speedup_factor: f64,
    parallel_efficiency_percent: f64,
    // Slowest file tracking
    slowest_file: String,
    slowest_file_duration_ms: u64,
    // Parse/semantic analysis breakdown
    total_parse_time_ms: u64,
    total_semantic_time_ms: u64,
    avg_parse_time_ms: f64,
    avg_semantic_time_ms: f64,
}

impl Metrics {
    /// Create a new metrics instance, starting the timer
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            total_duration: None,
            scan_duration: None,
            analysis_duration: None,
            file_times: Arc::new(Mutex::new(HashMap::new())),
            parse_times: Arc::new(Mutex::new(HashMap::new())),
            semantic_times: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    /// Record the duration of scanning for files
    pub fn record_scan_time(&mut self, duration: Duration) {
        self.scan_duration = Some(duration);
    }
    
    /// Record the duration of analyzing all files
    pub fn record_analysis_time(&mut self, duration: Duration) {
        self.analysis_duration = Some(duration);
    }
    
    /// Record the duration of processing a single file
    pub fn record_file_time(&mut self, file_path: &str, duration: Duration) {
        if let Ok(mut times) = self.file_times.lock() {
            times.insert(file_path.to_string(), duration);
        }
    }
    
    /// Record the parse time for a file
    pub fn record_parse_time(&mut self, file_path: &str, duration: Duration) {
        if let Ok(mut times) = self.parse_times.lock() {
            times.insert(file_path.to_string(), duration);
        }
    }
    
    /// Record the semantic analysis time for a file
    pub fn record_semantic_time(&mut self, file_path: &str, duration: Duration) {
        if let Ok(mut times) = self.semantic_times.lock() {
            times.insert(file_path.to_string(), duration);
        }
    }
    
    /// Stop timing and record total duration
    pub fn stop(&mut self) {
        self.total_duration = Some(self.start_time.elapsed());
    }
    
    /// Export metrics to a JSON file, appending to existing data
    pub fn export_to_json(&self, file_path: &str) -> Result<(), String> {
        if self.total_duration.is_none() {
            return Err("Total duration not measured yet. Call stop() first.".to_string());
        }
        
        // Create directory if it doesn't exist
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory for {}: {}", file_path, e))?;
        }
        
        let metrics = self.calculate_metrics()?;
        
        // Check if file exists and read existing metrics
        let mut metrics_array: Vec<ExportableMetrics> = if Path::new(file_path).exists() {
            let mut file = File::open(file_path)
                .map_err(|e| format!("Failed to open existing file {}: {}", file_path, e))?;
            
            let mut contents = String::new();
            file.read_to_string(&mut contents)
                .map_err(|e| format!("Failed to read existing file {}: {}", file_path, e))?;
            
            // Try to parse as array first
            serde_json::from_str::<Vec<ExportableMetrics>>(&contents)
                .unwrap_or_else(|_| {
                    // If not an array, try as single object and convert to array
                    if let Ok(single) = serde_json::from_str::<ExportableMetrics>(&contents) {
                        vec![single]
                    } else {
                        // If parsing fails completely, start with empty array
                        Vec::new()
                    }
                })
        } else {
            Vec::new()
        };
        
        // Add new metrics to array
        metrics_array.push(metrics);
        
        // Serialize and write to file
        let json = serde_json::to_string_pretty(&metrics_array)
            .map_err(|e| format!("Failed to serialize metrics: {}", e))?;
        
        let mut file = File::create(file_path)
            .map_err(|e| format!("Failed to create file {}: {}", file_path, e))?;
            
        file.write_all(json.as_bytes())
            .map_err(|e| format!("Failed to write to file {}: {}", file_path, e))?;
            
        Ok(())
    }
    
    /// Export metrics to a CSV file, appending to existing data
    pub fn export_to_csv(&self, file_path: &str) -> Result<(), String> {
        if self.total_duration.is_none() {
            return Err("Total duration not measured yet. Call stop() first.".to_string());
        }
        
        // Create directory if it doesn't exist
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory for {}: {}", file_path, e))?;
        }
        
        let metrics = self.calculate_metrics()?;
        
        // Create CSV content
        let header = "timestamp,total_duration_ms,scan_duration_ms,analysis_duration_ms,files_processed,files_per_second_wall_time,cumulative_processing_time_ms,avg_time_per_file_ms,files_per_second_cpu_time,parallel_cores_used,parallel_speedup_factor,parallel_efficiency_percent,slowest_file,slowest_file_duration_ms,total_parse_time_ms,total_semantic_time_ms,avg_parse_time_ms,avg_semantic_time_ms\n";
        
        // Create the record with escaped quotes for CSV
        let escaped_slowest_file = metrics.slowest_file.replace("\"", "\"\"");
        let record = format!(
            "{},{},{},{},{},{:.2},{},{:.2},{:.2},{},{:.2},{:.2},\"{}\",{},{},{},{:.2},{:.2}\n",
            metrics.timestamp,
            metrics.total_duration_ms,
            metrics.scan_duration_ms,
            metrics.analysis_duration_ms,
            metrics.files_processed,
            metrics.files_per_second_wall_time,
            metrics.cumulative_processing_time_ms,
            metrics.avg_time_per_file_ms,
            metrics.files_per_second_cpu_time,
            metrics.parallel_cores_used,
            metrics.parallel_speedup_factor,
            metrics.parallel_efficiency_percent,
            escaped_slowest_file,
            metrics.slowest_file_duration_ms,
            metrics.total_parse_time_ms,
            metrics.total_semantic_time_ms,
            metrics.avg_parse_time_ms,
            metrics.avg_semantic_time_ms
        );
        
        // Check if file exists
        let file_exists = Path::new(file_path).exists();
        
        // Open file in append or create mode
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .append(true)
            .open(file_path)
            .map_err(|e| format!("Failed to open file {}: {}", file_path, e))?;
        
        // Write header only if file is new
        if !file_exists {
            file.write_all(header.as_bytes())
                .map_err(|e| format!("Failed to write header to file {}: {}", file_path, e))?;
        }
        
        // Always append the new record
        file.write_all(record.as_bytes())
            .map_err(|e| format!("Failed to write record to file {}: {}", file_path, e))?;
            
        Ok(())
    }
    
    /// Calculate normalized metrics, accounting for parallel processing
    fn calculate_metrics(&self) -> Result<ExportableMetrics, String> {
        let total_duration = self.total_duration
            .ok_or_else(|| "Total duration not measured yet".to_string())?;
        let scan_duration = self.scan_duration.unwrap_or(Duration::default());
        let analysis_duration = self.analysis_duration.unwrap_or(Duration::default());
        
        // Safely access the metrics HashMaps
        let file_times = match self.file_times.lock() {
            Ok(guard) => guard,
            Err(_) => return Err("Failed to lock file_times for metrics calculation".to_string()),
        };
        
        let parse_times = match self.parse_times.lock() {
            Ok(guard) => guard,
            Err(_) => return Err("Failed to lock parse_times for metrics calculation".to_string()),
        };
        
        let semantic_times = match self.semantic_times.lock() {
            Ok(guard) => guard,
            Err(_) => return Err("Failed to lock semantic_times for metrics calculation".to_string()),
        };
        
        // File count and cumulative time (CPU time across all cores)
        let file_count = file_times.len();
        let cumulative_processing_time: Duration = file_times.values().sum();
        
        // Calculate metrics
        let avg_time_per_file = if file_count > 0 {
            cumulative_processing_time.as_secs_f64() * 1000.0 / file_count as f64
        } else {
            0.0
        };
        
        // Files per second (based on wall time)
        let files_per_second_wall_time = if !analysis_duration.is_zero() {
            file_count as f64 / analysis_duration.as_secs_f64()
        } else {
            0.0
        };
        
        // Files per second (based on cumulative CPU time)
        let files_per_second_cpu_time = if !cumulative_processing_time.is_zero() {
            file_count as f64 / cumulative_processing_time.as_secs_f64() 
        } else {
            0.0
        };
        
        // Find the slowest file
        let none_string = "none".to_string();
        let default_duration = Duration::default();
        
        let (slowest_file, slowest_duration) = file_times
            .iter()
            .max_by_key(|(_, &duration)| duration)
            .unwrap_or((&none_string, &default_duration));
        
        // Calculate parse and semantic analysis time totals
        let total_parse_time: Duration = parse_times.values().sum();
        let total_semantic_time: Duration = semantic_times.values().sum();
        
        let avg_parse_time = if file_count > 0 {
            total_parse_time.as_secs_f64() * 1000.0 / file_count as f64
        } else {
            0.0
        };
        
        let avg_semantic_time = if file_count > 0 {
            total_semantic_time.as_secs_f64() * 1000.0 / file_count as f64
        } else {
            0.0
        };
        
        // Parallelism metrics
        let parallel_cores_used = rayon::current_num_threads();
        
        // Calculate speedup as ratio of cumulative processing time to wall clock time
        let parallel_speedup_factor = if !analysis_duration.is_zero() {
            cumulative_processing_time.as_secs_f64() / analysis_duration.as_secs_f64()
        } else {
            0.0
        };
        
        // Calculate parallelism efficiency (how effectively we're using our cores)
        let parallel_efficiency_percent = if parallel_cores_used > 0 {
            (parallel_speedup_factor / parallel_cores_used as f64) * 100.0
        } else {
            0.0
        };
        
        Ok(ExportableMetrics {
            timestamp: chrono::Local::now().to_rfc3339(),
            total_duration_ms: total_duration.as_millis() as u64,
            scan_duration_ms: scan_duration.as_millis() as u64,
            analysis_duration_ms: analysis_duration.as_millis() as u64,
            files_processed: file_count,
            files_per_second_wall_time,
            cumulative_processing_time_ms: cumulative_processing_time.as_millis() as u64,
            avg_time_per_file_ms: avg_time_per_file,
            files_per_second_cpu_time,
            parallel_cores_used,
            parallel_speedup_factor,
            parallel_efficiency_percent,
            slowest_file: slowest_file.clone(),
            slowest_file_duration_ms: slowest_duration.as_millis() as u64,
            total_parse_time_ms: total_parse_time.as_millis() as u64,
            total_semantic_time_ms: total_semantic_time.as_millis() as u64,
            avg_parse_time_ms: avg_parse_time,
            avg_semantic_time_ms: avg_semantic_time,
        })
    }
    
    /// Print a summary of the collected metrics
    pub fn print_summary(&self) {
        if self.total_duration.is_none() {
            println!("No metrics collected yet.");
            return;
        }
        
        match self.calculate_metrics() {
            Ok(metrics) => {
                println!("\n--- Performance Metrics ---");
                
                // Wall time metrics
                println!("Total execution time: {:.2?}", Duration::from_millis(metrics.total_duration_ms));
                println!("File scanning time: {:.2?}", Duration::from_millis(metrics.scan_duration_ms));
                println!("File analysis time: {:.2?}", Duration::from_millis(metrics.analysis_duration_ms));
                
                // File metrics
                println!("Files processed: {}", metrics.files_processed);
                println!("Files per second (wall time): {:.2}", metrics.files_per_second_wall_time);
                
                // CPU time metrics 
                let cpu_time = Duration::from_millis(metrics.cumulative_processing_time_ms);
                println!("\n--- CPU Usage Metrics ---");
                println!("Cumulative CPU time: {:.2?}", cpu_time);
                println!("Average time per file: {:.2?} μs", metrics.avg_time_per_file_ms * 1000.0);
                println!("Processing rate per core: {:.2} files/sec", metrics.files_per_second_cpu_time);
                
                // Parallelism metrics
                println!("\n--- Parallelism Metrics ---");
                println!("Parallel processing: {} threads", metrics.parallel_cores_used);
                println!("Speedup factor: {:.2}x", metrics.parallel_speedup_factor);
                println!("Parallel efficiency: {:.1}%", metrics.parallel_efficiency_percent);
                
                // Slowest file
                let slowest_duration = Duration::from_millis(metrics.slowest_file_duration_ms);
                println!("Slowest file: {} ({:.2?})", metrics.slowest_file, slowest_duration);
                
                // Parse and semantic analysis breakdown
                println!("\n--- Detailed Analysis ---");
                let parse_time = Duration::from_millis(metrics.total_parse_time_ms);
                let semantic_time = Duration::from_millis(metrics.total_semantic_time_ms);
                
                // Clarify these are cumulative times across all cores
                println!("Cumulative parse time (all cores): {:.2?}", parse_time);
                println!("Cumulative semantic analysis time (all cores): {:.2?}", semantic_time);
                
                // Show normalized times (per thread estimates)
                if metrics.parallel_cores_used > 0 {
                    let normalized_parse_time = parse_time.div_f64(metrics.parallel_cores_used as f64);
                    let normalized_semantic_time = semantic_time.div_f64(metrics.parallel_cores_used as f64);
                    
                    println!("Est. parse time per thread: {:.2?}", normalized_parse_time);
                    println!("Est. semantic analysis time per thread: {:.2?}", normalized_semantic_time);
                }
                
                // Per-file averages
                println!("Average parse time per file: {:.2?} μs", metrics.avg_parse_time_ms * 1000.0);
                println!("Average semantic analysis time per file: {:.2?} μs", metrics.avg_semantic_time_ms * 1000.0);
                
                // Phase breakdown (using the cumulative times for percentage calculation)
                if !parse_time.is_zero() || !semantic_time.is_zero() {
                    let total = parse_time + semantic_time;
                    if !total.is_zero() {
                        let parse_percent = parse_time.as_secs_f64() / total.as_secs_f64() * 100.0;
                        let semantic_percent = semantic_time.as_secs_f64() / total.as_secs_f64() * 100.0;
                        println!("Phase breakdown: Parsing {:.1}% / Semantic Analysis {:.1}%", 
                            parse_percent, semantic_percent);
                    }
                }
                
                println!("---------------------------");
            },
            Err(e) => {
                println!("Error calculating metrics: {}", e);
            }
        }
    }
} 