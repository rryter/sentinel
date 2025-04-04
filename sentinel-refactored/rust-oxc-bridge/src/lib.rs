use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
use serde::Serialize;

// Simple serializable response structure with only essential data
#[derive(Serialize)]
struct ParseResponse {
    success: bool,
    ast_json: Option<serde_json::Value>,
    errors: Vec<String>,
    panicked: bool,
}

// Helper function to convert AST to a JSON representation without relying on serializing Program directly
fn ast_to_json(program: &oxc_ast::ast::Program) -> Option<serde_json::Value> {
    // Create a simpler representation of the AST that can be serialized
    let mut nodes = Vec::new();
    
    // Extract basic info about each statement
    for stmt in &program.body {
        // Format the statement type directly
        let node_type = format!("{:?}", stmt);
        nodes.push(node_type);
    }
    
    // Wrap in a simple object
    Some(serde_json::json!({
        "type": "Program",
        "body_count": program.body.len(),
        "node_types": nodes,
    }))
}

#[no_mangle]
pub extern "C" fn parse_js(filename: *const c_char, code: *const c_char) -> *mut c_char {
    // Safety checks for null pointers
    if filename.is_null() || code.is_null() {
        let error = r#"{"success":false,"error":"NULL input provided"}"#;
        return CString::new(error).unwrap().into_raw();
    }

    // Convert C strings to Rust strings
    let filename_str = match unsafe { CStr::from_ptr(filename) }.to_str() {
        Ok(s) => s,
        Err(_) => {
            let error = r#"{"success":false,"error":"Invalid UTF-8 in filename"}"#;
            return CString::new(error).unwrap().into_raw();
        }
    };

    let code_str = match unsafe { CStr::from_ptr(code) }.to_str() {
        Ok(s) => s,
        Err(_) => {
            let error = r#"{"success":false,"error":"Invalid UTF-8 in code"}"#;
            return CString::new(error).unwrap().into_raw();
        }
    };
    
    // Parse the code
    let allocator = Allocator::default();
    let source_type = match SourceType::from_path(filename_str) {
        Ok(st) => st,
        Err(_) => SourceType::default(),
    };
    
    let result = Parser::new(&allocator, code_str, source_type).parse();

    // Extract useful information that we can serialize
    let response = ParseResponse {
        success: !result.panicked && result.errors.is_empty(),
        ast_json: if result.panicked { None } else { ast_to_json(&result.program) },
        errors: result.errors.iter().map(|e| format!("{:?}", e)).collect(),
        panicked: result.panicked,
    };
    
    // Serialize and return
    match serde_json::to_string(&response) {
        Ok(json) => CString::new(json).unwrap_or_default().into_raw(),
        Err(e) => {
            let error = format!(r#"{{"success":false,"error":"Failed to serialize response: {e}"}}"#);
            CString::new(error).unwrap_or_default().into_raw()
        }
    }
}

#[no_mangle]
pub extern "C" fn free_result(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
} 