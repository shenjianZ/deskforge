//! 日期时间工具命令
//!
//! 定义日期时间转换相关的 Tauri 命令

use crate::models::datetime_tool::{DateTimeToolConfig, DateTimeToolResult};
use crate::services::datetime_tool_service::DateTimeToolService;

/// 将时间戳转换为日期时间
#[tauri::command]
pub fn timestamp_to_datetime(input: String, config: DateTimeToolConfig) -> DateTimeToolResult {
    DateTimeToolService::timestamp_to_datetime(&input, &config).unwrap_or_else(|error| {
        DateTimeToolResult {
            success: false,
            result: String::new(),
            error: Some(error.to_string()),
        }
    })
}

/// 将日期时间转换为时间戳
#[tauri::command]
pub fn datetime_to_timestamp(input: String, config: DateTimeToolConfig) -> DateTimeToolResult {
    DateTimeToolService::datetime_to_timestamp(&input, &config).unwrap_or_else(|error| {
        DateTimeToolResult {
            success: false,
            result: String::new(),
            error: Some(error.to_string()),
        }
    })
}
