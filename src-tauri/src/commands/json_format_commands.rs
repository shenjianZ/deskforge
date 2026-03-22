//! JSON 格式化命令
//!
//! 定义 JSON 格式化相关的 Tauri 命令

use crate::models::json_format::{JsonFormatConfig, JsonFormatResult, JsonValidateResult};
use crate::services::json_format_service::JsonFormatService;

/// 格式化 JSON 命令
///
/// Tauri 命令，用于从前端调用 JSON 格式化功能
///
/// # 参数
///
/// * `input` - 输入的 JSON 字符串
/// * `config` - 格式化配置
///
/// # 返回
///
/// 返回格式化结果，包含成功标志、结果字符串和错误信息
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// const result = await invoke('format_json', {
///   input: '{"name":"test","value":123}',
///   config: {
///     indent: 2,
///     sort_keys: false,
///     mode: 'pretty'
///   }
/// });
/// console.log(result.success); // true
/// console.log(result.result);  // 格式化后的 JSON
/// ```
#[tauri::command]
pub fn format_json(input: String, config: JsonFormatConfig) -> JsonFormatResult {
    JsonFormatService::format(&input, &config).unwrap_or_else(|e| JsonFormatResult {
        success: false,
        result: String::new(),
        error: Some(e.to_string()),
        is_valid: false,
    })
}

/// 验证 JSON 命令
///
/// 验证输入的字符串是否为有效的 JSON
///
/// # 参数
///
/// * `input` - 输入的 JSON 字符串
///
/// # 返回
///
/// 返回验证结果
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// const result = await invoke('validate_json', {
///   input: '{"valid": true}'
/// });
/// console.log(result.is_valid); // true
/// ```
#[tauri::command]
pub fn validate_json(input: String) -> JsonValidateResult {
    JsonFormatService::validate(&input).unwrap_or_else(|e| JsonValidateResult {
        is_valid: false,
        error_message: Some(e.to_string()),
        error_line: None,
        error_column: None,
    })
}

/// 压缩 JSON 命令
///
/// 去除 JSON 中的所有空格和换行
///
/// # 参数
///
/// * `input` - 输入的 JSON 字符串
///
/// # 返回
///
/// 返回压缩后的 JSON
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// const result = await invoke('compact_json', {
///   input: '{ "name" : "test" }'
/// });
/// console.log(result.result); // '{"name":"test"}'
/// ```
#[tauri::command]
pub fn compact_json(input: String) -> JsonFormatResult {
    JsonFormatService::compact(&input).unwrap_or_else(|e| JsonFormatResult {
        success: false,
        result: String::new(),
        error: Some(e.to_string()),
        is_valid: false,
    })
}
