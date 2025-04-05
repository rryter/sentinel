use std::time::{Duration, Instant};

/// A timer for measuring performance of operations
pub struct Timer {
    start: Instant,
    name: String,
}

impl Timer {
    /// Create a new timer with a name
    pub fn new(name: &str) -> Self {
        Self {
            start: Instant::now(),
            name: name.to_string(),
        }
    }
    
    /// Get the elapsed time since the timer was created
    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }
    
    /// Print the elapsed time
    pub fn report(&self) {
        println!("{} took {:?}", self.name, self.elapsed());
    }
}

/// A collection of performance metrics for an analysis run
pub struct AnalysisMetrics {
    pub file_count: usize,
    pub total_lines: usize,
    pub total_size: u64,
    pub scan_duration: Duration,
    pub parse_duration: Option<Duration>,
    pub analysis_duration: Option<Duration>,
}

impl AnalysisMetrics {
    /// Create a new empty metrics object
    pub fn new() -> Self {
        Self {
            file_count: 0,
            total_lines: 0,
            total_size: 0,
            scan_duration: Duration::default(),
            parse_duration: None,
            analysis_duration: None,
        }
    }
    
    /// Print a summary of the metrics
    pub fn print_summary(&self, file_paths: Option<&[String]>) {
        println!("\n--- Analysis Metrics ---");
        println!("Files scanned: {}", self.file_count);
        
        // Print file paths if provided
        if let Some(paths) = file_paths {
            if !paths.is_empty() {
                println!("File paths:");
                for path in paths.iter().take(10) {
                    println!("  - {}", path);
                }
                if paths.len() > 10 {
                    println!("  ... and {} more files", paths.len() - 10);
                }
            }
        }
        
        println!("Total lines: {}", self.total_lines);
        println!("Total size: {} bytes", self.total_size);
        println!("Scan duration: {:?}", self.scan_duration);
        
        if let Some(parse_duration) = self.parse_duration {
            println!("Parse duration: {:?}", parse_duration);
        }
        
        if let Some(analysis_duration) = self.analysis_duration {
            println!("Analysis duration: {:?}", analysis_duration);
        }
        
        if self.scan_duration.as_secs_f64() > 0.0 {
            let files_per_second = self.file_count as f64 / self.scan_duration.as_secs_f64();
            println!("Files per second: {:.2}", files_per_second);
        }
    }
} 