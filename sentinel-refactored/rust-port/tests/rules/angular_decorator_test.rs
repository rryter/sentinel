use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;

use typescript_analyzer::rules::{
    Rule, RuleMatch,
    custom::angular::decorator_detection_rule::AngularDecoratorDetectionRule
};

// Test utilities
fn test_rule_with_code(code: &str) -> RuleMatch {
    // Create an allocator for each test
    let allocator = Allocator::default();
    let source_type = SourceType::default().with_typescript(true);
    
    // Parse the TypeScript code
    let parser_return = Parser::new(&allocator, code, source_type).parse();
    
    // Create the rule
    let rule = AngularDecoratorDetectionRule::new();
    
    // Evaluate the rule on the parsed program
    rule.evaluate(&parser_return.program, "test-file.ts").expect("Rule evaluation failed")
}

fn assert_decorator_match(result: &RuleMatch, expected_match: bool, decorator_name: Option<&str>) {
    assert_eq!(result.matched, expected_match, "Rule match status should be {}", expected_match);
    
    if let Some(decorator) = decorator_name {
        if expected_match {
            // If a decorator name was provided and we expect a match, check the metadata
            let found_decorators = result.metadata.get("found_decorators");
            assert!(found_decorators.is_some(), "Metadata should contain found_decorators");
            assert!(
                found_decorators.unwrap().contains(decorator),
                "Metadata should contain the decorator: {}",
                decorator
            );
        }
    }
}

#[test]
fn test_no_angular_imports() {
    // Test case with no Angular imports
    let code = r#"
        import { Something } from 'other-lib';
        
        class MyClass {
          @Input() property: string;
        }
    "#;
    
    let result = test_rule_with_code(code);
    assert_decorator_match(&result, false, None);
}

#[test]
fn test_angular_import_no_decorators() {
    // Test case with Angular import but no decorators
    let code = r#"
        import { Component } from '@angular/core';
        
        @Component({
          selector: 'app-root',
          template: '<div></div>'
        })
        class MyComponent {
          property: string;
        }
    "#;
    
    let result = test_rule_with_code(code);
    assert_decorator_match(&result, false, None);
    assert!(result.message.unwrap().contains("no property decorators"), "Should mention no decorators found");
}

#[test]
fn test_input_decorator() {
    // Test case with Angular import and Input decorator
    let code = r#"
        import { Component, Input } from '@angular/core';
        
        @Component({
          selector: 'app-root',
          template: '<div></div>'
        })
        class MyComponent {
          @Input() property: string;
        }
    "#;
    
    let result = test_rule_with_code(code);
    assert_decorator_match(&result, true, Some("Input"));
}

#[test]
fn test_output_decorator() {
    // Test case with Angular import and Output decorator
    let code = r#"
        import { Component, Output, EventEmitter } from '@angular/core';
        
        @Component({
          selector: 'app-root',
          template: '<div></div>'
        })
        class MyComponent {
          @Output() event = new EventEmitter<string>();
        }
    "#;
    
    let result = test_rule_with_code(code);
    assert_decorator_match(&result, true, Some("Output"));
}

#[test]
fn test_multiple_decorators() {
    // Test case with multiple decorators
    let code = r#"
        import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
        
        @Component({
          selector: 'app-root',
          template: '<div #ref></div>'
        })
        class MyComponent {
          @Input() property: string;
          @Output() event = new EventEmitter<string>();
          @ViewChild('ref') elementRef: ElementRef;
        }
    "#;
    
    let result = test_rule_with_code(code);
    assert_decorator_match(&result, true, Some("Input"));
    
    // Check that multiple decorators are found
    let found_decorators = result.metadata.get("found_decorators").unwrap();
    assert!(found_decorators.contains("Input"), "Should find Input decorator");
    assert!(found_decorators.contains("Output"), "Should find Output decorator");
    assert!(found_decorators.contains("ViewChild"), "Should find ViewChild decorator");
}

#[test]
fn test_method_decorators() {
    // Test case with decorators on methods that are not in our target list
    let code = r#"
        import { Component, HostListener } from '@angular/core';
        
        @Component({
          selector: 'app-root',
          template: '<div></div>'
        })
        class MyComponent {
          @HostListener('click') 
          onClick() {
            console.log('Clicked!');
          }
        }
    "#;
    
    // Note: HostListener isn't in our target list, so this shouldn't match
    let result = test_rule_with_code(code);
    assert_decorator_match(&result, false, None);
    assert!(result.message.unwrap().contains("no property decorators"), "Should mention no property decorators found");
} 