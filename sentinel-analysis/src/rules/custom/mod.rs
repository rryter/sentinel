use oxc_ast::ast::PropertyKey;

// Module declarations for custom rules
pub mod angular_component_class_suffix;
pub mod angular_directive_class_suffix;
pub mod angular_input_count;
pub mod angular_legacy_decorators;
pub mod angular_obsolete_standalone_true;
pub mod typescript_non_null_assertion_operator;
pub mod typescript_type_assertion;

// Re-export custom rules
pub use angular_component_class_suffix::AngularComponentClassSuffixRule;
pub use angular_directive_class_suffix::AngularDirectiveClassSuffixRule;
pub use angular_input_count::AngularInputCountRule;
pub use angular_legacy_decorators::AngularLegacyDecoratorsRule;
pub use angular_obsolete_standalone_true::AngularObsoleteStandaloneTrueRule;
pub use typescript_non_null_assertion_operator::TypeScriptNonNullAssertionRule;
pub use typescript_type_assertion::TypeScriptAssertionRule;

// Module declarations for custom rules
pub fn prop_key_name<'a>(key: &PropertyKey<'a>) -> &'a str {
    match key {
        PropertyKey::StaticIdentifier(ident) => ident.name.as_str(),
        PropertyKey::PrivateIdentifier(ident) => ident.name.as_str(),
        PropertyKey::Identifier(ident) => ident.name.as_str(),
        _ => "false",
    }
}