//! 代码格式化命令
//!
//! 定义代码格式化相关的 Tauri 命令

use crate::models::code_format::{CodeFormatConfig, CodeFormatResult, CodeValidateResult, CodeLanguage};
use crate::services::code_format_service::CodeFormatService;

/// 格式化代码命令
#[tauri::command]
pub fn format_code(input: String, config: CodeFormatConfig) -> CodeFormatResult {
    CodeFormatService::format(&input, &config)
        .unwrap_or_else(|e| CodeFormatResult {
            success: false,
            result: String::new(),
            error: Some(e.to_string()),
        })
}

/// 验证代码命令
#[tauri::command]
pub fn validate_code(input: String, language: CodeLanguage) -> CodeValidateResult {
    CodeFormatService::validate(&input, language)
        .unwrap_or_else(|e| CodeValidateResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_line: None,
        })
}
