//! HTML 格式化命令
//!
//! 定义 HTML 格式化相关的 Tauri 命令

use crate::models::html_format::{HtmlFormatConfig, HtmlFormatResult, HtmlValidateResult};
use crate::services::html_format_service::HtmlFormatService;

/// 格式化 HTML 命令
#[tauri::command]
pub fn format_html(input: String, config: HtmlFormatConfig) -> HtmlFormatResult {
    HtmlFormatService::format(&input, &config)
        .unwrap_or_else(|e| HtmlFormatResult {
            success: false,
            result: String::new(),
            error: Some(e.to_string()),
        })
}

/// 验证 HTML 命令
#[tauri::command]
pub fn validate_html(input: String) -> HtmlValidateResult {
    HtmlFormatService::validate(&input).unwrap_or_else(|e| HtmlValidateResult {
        is_valid: false,
        error_message: Some(e.to_string()),
        error_line: None,
    })
}

/// 压缩 HTML 命令
#[tauri::command]
pub fn compact_html(input: String) -> HtmlFormatResult {
    HtmlFormatService::compact(&input).unwrap_or_else(|e| HtmlFormatResult {
        success: false,
        result: String::new(),
        error: Some(e.to_string()),
    })
}
