// Module declarations for custom rules
pub mod no_console_warn_visitor;
pub mod angular_observable_inputs;
// Re-export custom rules
pub use no_console_warn_visitor::NoConsoleWarnVisitorRule; 
pub use angular_observable_inputs::AngularObservableInputsRule; 