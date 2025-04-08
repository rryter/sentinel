// Module declarations for custom rules
pub mod angular_input_count;
pub mod angular_observable_inputs;
pub mod no_console_warn_visitor;
// Re-export custom rules
pub use angular_input_count::AngularInputCountRule;
pub use angular_observable_inputs::AngularObservableInputsRule;
pub use no_console_warn_visitor::NoConsoleWarnVisitorRule;
