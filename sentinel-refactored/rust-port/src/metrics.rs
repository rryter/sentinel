use std::time::{Duration, Instant};
use std::collections::HashMap;

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
    
    /// Stop timing and record total duration
    pub fn stop(&mut self) {
        self.total_duration = Some(self.start_time.elapsed());
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
        }
        
        println!("---------------------------");
    }
} 