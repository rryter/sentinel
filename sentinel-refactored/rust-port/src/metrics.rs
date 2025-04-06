use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use serde::{Serialize, Deserialize};

/// Performance metrics for tracking execution time of different operations
pub struct Metrics {
    start_time: Instant,
    /// Total execution time
    pub total_duration: Option<Duration>,
    /// Time spent scanning for files
    pub scan_duration: Option<Duration>,
    /// Time spent analyzing all files
    pub analysis_duration: Option<Duration>,
    /// Individual file processing times (file path -> duration)
    pub file_times: HashMap<String, Duration>,
    /// Detailed breakdown of file parse times
    pub parse_times: HashMap<String, Duration>,
    /// Detailed breakdown of semantic analysis times
    pub semantic_times: HashMap<String, Duration>,
}

/// Serializable metrics for export to JSON
#[derive(Serialize, Deserialize)]
struct ExportableMetrics {
    timestamp: String,
    total_duration_ms: u64,
    scan_duration_ms: u64,
    analysis_duration_ms: u64,
    files_processed: usize,
    avg_time_per_file_ms: f64,
    files_per_second: f64,
    slowest_file: String,
    slowest_file_duration_ms: u64,
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
            file_times: HashMap::new(),
            parse_times: HashMap::new(),
            semantic_times: HashMap::new(),
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
        self.file_times.insert(file_path.to_string(), duration);
    }
    
    /// Record the parse time for a file
    pub fn record_parse_time(&mut self, file_path: &str, duration: Duration) {
        self.parse_times.insert(file_path.to_string(), duration);
    }
    
    /// Record the semantic analysis time for a file
    pub fn record_semantic_time(&mut self, file_path: &str, duration: Duration) {
        self.semantic_times.insert(file_path.to_string(), duration);
    }
    
    /// Stop timing and record total duration
    pub fn stop(&mut self) {
        self.total_duration = Some(self.start_time.elapsed());
    }
    
    /// Export metrics to a JSON file
    pub fn export_to_json(&self, file_path: &str) -> Result<(), String> {
        if self.total_duration.is_none() {
            return Err("Total duration not measured yet. Call stop() first.".to_string());
        }
        
        // Create directory if it doesn't exist
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory for {}: {}", file_path, e))?;
        }
        
        let total_duration = self.total_duration.unwrap();
        let scan_duration = self.scan_duration.unwrap_or(Duration::default());
        let analysis_duration = self.analysis_duration.unwrap_or(Duration::default());
        
        // Calculate metrics for export
        let file_count = self.file_times.len();
        let total_file_time: Duration = self.file_times.values().sum();
        let avg_time_per_file = if file_count > 0 {
            total_file_time.as_secs_f64() * 1000.0 / file_count as f64
        } else {
            0.0
        };
        
        let files_per_second = if !total_file_time.is_zero() {
            file_count as f64 / total_file_time.as_secs_f64()
        } else {
            0.0
        };
        
        // Find the slowest file - fix temporary value issues
        let none_string = "none".to_string();
        let default_duration = Duration::default();
        
        let (slowest_file, slowest_duration) = self.file_times
            .iter()
            .max_by_key(|(_, &duration)| duration)
            .unwrap_or((&none_string, &default_duration));
        
        // Calculate parse and semantic analysis time totals
        let total_parse_time: Duration = self.parse_times.values().sum();
        let total_semantic_time: Duration = self.semantic_times.values().sum();
        
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
        
        // Create exportable metrics structure
        let exportable = ExportableMetrics {
            timestamp: chrono::Local::now().to_rfc3339(),
            total_duration_ms: total_duration.as_millis() as u64,
            scan_duration_ms: scan_duration.as_millis() as u64,
            analysis_duration_ms: analysis_duration.as_millis() as u64,
            files_processed: file_count,
            avg_time_per_file_ms: avg_time_per_file,
            files_per_second,
            slowest_file: slowest_file.clone(),
            slowest_file_duration_ms: slowest_duration.as_millis() as u64,
            total_parse_time_ms: total_parse_time.as_millis() as u64,
            total_semantic_time_ms: total_semantic_time.as_millis() as u64,
            avg_parse_time_ms: avg_parse_time,
            avg_semantic_time_ms: avg_semantic_time,
        };
        
        // Serialize and write to file
        let json = serde_json::to_string_pretty(&exportable)
            .map_err(|e| format!("Failed to serialize metrics: {}", e))?;
        
        let mut file = File::create(file_path)
            .map_err(|e| format!("Failed to create file {}: {}", file_path, e))?;
            
        file.write_all(json.as_bytes())
            .map_err(|e| format!("Failed to write to file {}: {}", file_path, e))?;
            
        Ok(())
    }
    
    /// Export metrics to a CSV file
    pub fn export_to_csv(&self, file_path: &str) -> Result<(), String> {
        if self.total_duration.is_none() {
            return Err("Total duration not measured yet. Call stop() first.".to_string());
        }
        
        // Create directory if it doesn't exist
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory for {}: {}", file_path, e))?;
        }
        
        let total_duration = self.total_duration.unwrap();
        let scan_duration = self.scan_duration.unwrap_or(Duration::default());
        let analysis_duration = self.analysis_duration.unwrap_or(Duration::default());
        
        // Calculate metrics for export
        let file_count = self.file_times.len();
        let total_file_time: Duration = self.file_times.values().sum();
        let avg_time_per_file = if file_count > 0 {
            total_file_time.as_secs_f64() * 1000.0 / file_count as f64
        } else {
            0.0
        };
        
        let files_per_second = if !total_file_time.is_zero() {
            file_count as f64 / total_file_time.as_secs_f64()
        } else {
            0.0
        };
        
        // Find the slowest file - fix temporary value issues
        let none_string = "none".to_string();
        let default_duration = Duration::default();
        
        let (slowest_file, slowest_duration) = self.file_times
            .iter()
            .max_by_key(|(_, &duration)| duration)
            .unwrap_or((&none_string, &default_duration));
            
        // Calculate parse and semantic analysis time totals
        let total_parse_time: Duration = self.parse_times.values().sum();
        let total_semantic_time: Duration = self.semantic_times.values().sum();
        
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
        
        // Create CSV content
        let timestamp = chrono::Local::now().to_rfc3339();
        let header = "timestamp,total_duration_ms,scan_duration_ms,analysis_duration_ms,files_processed,avg_time_per_file_ms,files_per_second,slowest_file,slowest_file_duration_ms,total_parse_time_ms,total_semantic_time_ms,avg_parse_time_ms,avg_semantic_time_ms\n";
        
        // Create the record with escaped quotes for CSV
        let escaped_slowest_file = slowest_file.replace("\"", "\"\"");
        let record = format!(
            "{},{},{},{},{},{:.2},{:.2},\"{}\",{},{},{},{:.2},{:.2}\n",
            timestamp,
            total_duration.as_millis(),
            scan_duration.as_millis(),
            analysis_duration.as_millis(),
            file_count,
            avg_time_per_file,
            files_per_second,
            escaped_slowest_file,
            slowest_duration.as_millis(),
            total_parse_time.as_millis(),
            total_semantic_time.as_millis(),
            avg_parse_time,
            avg_semantic_time
        );
        
        // Write to file
        let mut file = File::create(file_path)
            .map_err(|e| format!("Failed to create file {}: {}", file_path, e))?;
            
        file.write_all(header.as_bytes())
            .map_err(|e| format!("Failed to write header to file {}: {}", file_path, e))?;
            
        file.write_all(record.as_bytes())
            .map_err(|e| format!("Failed to write record to file {}: {}", file_path, e))?;
            
        Ok(())
    }
    
    /// Print a summary of the collected metrics
    pub fn print_summary(&self) {
        println!("\n--- Performance Metrics ---");
        
        // Total time
        if let Some(duration) = self.total_duration {
            println!("Total execution time: {:.2?}", duration);
        }
        
        // Scan time
        if let Some(duration) = self.scan_duration {
            println!("File scanning time: {:.2?}", duration);
        }
        
        // Analysis time
        if let Some(duration) = self.analysis_duration {
            println!("File analysis time: {:.2?}", duration);
        }
        
        // Files processed
        let file_count = self.file_times.len();
        if file_count > 0 {
            println!("Files processed: {}", file_count);
            
            // Calculate average processing time per file
            let total_file_time: Duration = self.file_times.values().sum();
            let avg_time = total_file_time / file_count as u32;
            println!("Average time per file: {:.2?}", avg_time);
            
            // Calculate files per second
            if !total_file_time.is_zero() {
                let seconds = total_file_time.as_secs_f64();
                let files_per_second = file_count as f64 / seconds;
                println!("Files per second: {:.2}", files_per_second);
            }
            
            // Find slowest file
            if let Some((slowest_file, duration)) = self.file_times
                .iter()
                .max_by_key(|(_, &duration)| duration) {
                println!("Slowest file: {} ({:.2?})", slowest_file, duration);
            }
            
            // Only print parse/semantic breakdown if we have data
            if !self.parse_times.is_empty() && !self.semantic_times.is_empty() {
                let total_parse_time: Duration = self.parse_times.values().sum();
                let total_semantic_time: Duration = self.semantic_times.values().sum();
                
                println!("\n--- Detailed Analysis ---");
                println!("Total parse time: {:.2?}", total_parse_time);
                println!("Total semantic analysis time: {:.2?}", total_semantic_time);
                
                let avg_parse_time = total_parse_time / file_count as u32;
                let avg_semantic_time = total_semantic_time / file_count as u32;
                
                println!("Average parse time per file: {:.2?}", avg_parse_time);
                println!("Average semantic analysis time per file: {:.2?}", avg_semantic_time);
                
                // Parse time percentage
                let total_processing = total_parse_time + total_semantic_time;
                if !total_processing.is_zero() {
                    let parse_percentage = total_parse_time.as_secs_f64() / total_processing.as_secs_f64() * 100.0;
                    let semantic_percentage = total_semantic_time.as_secs_f64() / total_processing.as_secs_f64() * 100.0;
                    
                    println!("Parsing: {:.1}% / Semantic Analysis: {:.1}%", parse_percentage, semantic_percentage);
                }
                
                // Find files with slowest parse and semantic times
                if let Some((slowest_parse_file, duration)) = self.parse_times
                    .iter()
                    .max_by_key(|(_, &duration)| duration) {
                    println!("Slowest parse: {} ({:.2?})", slowest_parse_file, duration);
                }
                
                if let Some((slowest_semantic_file, duration)) = self.semantic_times
                    .iter()
                    .max_by_key(|(_, &duration)| duration) {
                    println!("Slowest semantic analysis: {} ({:.2?})", slowest_semantic_file, duration);
                }
            }
        }
        
        println!("---------------------------");
    }
} 