use crate::utilities::config::Config;
use crate::utilities::{log, DebugLevel};

/// Configure the thread pool for parallel processing
pub fn configure_thread_pool(config: &Config, debug_level: DebugLevel) {
    if let Some(threads) = config.threads {
        rayon::ThreadPoolBuilder::new()
            .num_threads(threads)
            .build_global()
            .unwrap_or_else(|e| {
                log(
                    DebugLevel::Error,
                    debug_level,
                    &format!("Failed to configure thread pool: {}", e),
                )
            });
    }
}
