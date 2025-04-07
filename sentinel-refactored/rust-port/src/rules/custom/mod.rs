// Module declarations for custom rules
pub mod no_console;
pub mod no_console_warn;
pub mod no_console_warn_visitor;

// Re-export custom rules
pub use no_console::NoConsoleRule;
pub use no_console_warn::NoConsoleWarnRule;
pub use no_console_warn_visitor::NoConsoleWarnVisitorRule; 