// Module declarations for custom rules
pub mod angular_input_count;
pub mod angular_legacy_decorators;
pub mod no_console_warn_visitor;
// Re-export custom rules
pub use angular_input_count::AngularInputCountRule;
pub use angular_legacy_decorators::AngularLegacyDecoratorsRule;
pub use no_console_warn_visitor::NoConsoleWarnVisitorRule;
