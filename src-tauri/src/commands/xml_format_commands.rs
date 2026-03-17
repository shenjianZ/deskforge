//! XML 格式化命令
//!
//! 定义 XML 格式化相关的 Tauri 命令

use crate::models::xml_format::{XmlFormatConfig, XmlFormatResult, XmlValidateResult};
use crate::services::xml_format_service::XmlFormatService;

/// 格式化 XML 命令
#[tauri::command]
pub fn format_xml(input: String, config: XmlFormatConfig) -> XmlFormatResult {
    XmlFormatService::format(&input, &config)
        .unwrap_or_else(|e| XmlFormatResult {
            success: false,
            result: String::new(),
            error: Some(e.to_string()),
        })
}

/// 验证 XML 命令
#[tauri::command]
pub fn validate_xml(input: String) -> XmlValidateResult {
    XmlFormatService::validate(&input).unwrap_or_else(|e| XmlValidateResult {
        is_valid: false,
        error_message: Some(e.to_string()),
        error_line: None,
    })
}

/// 压缩 XML 命令
#[tauri::command]
pub fn compact_xml(input: String) -> XmlFormatResult {
    XmlFormatService::compact(&input).unwrap_or_else(|e| XmlFormatResult {
        success: false,
        result: String::new(),
        error: Some(e.to_string()),
    })
}
