//! Base64 工具命令
//!
//! 定义 Base64 编解码相关的 Tauri 命令

use crate::models::base64_tool::{
    Base64ImageResult, Base64ProcessConfig, Base64ProcessResult, Base64ValidateResult,
};
use crate::services::base64_tool_service::Base64ToolService;

/// 编码 Base64 命令
#[tauri::command]
pub fn encode_base64(input: String, config: Base64ProcessConfig) -> Base64ProcessResult {
    Base64ToolService::encode(&input, &config).unwrap_or_else(|error| Base64ProcessResult {
        success: false,
        result: String::new(),
        error: Some(error.to_string()),
    })
}

/// 解码 Base64 命令
#[tauri::command]
pub fn decode_base64(input: String, config: Base64ProcessConfig) -> Base64ProcessResult {
    Base64ToolService::decode(&input, &config).unwrap_or_else(|error| Base64ProcessResult {
        success: false,
        result: String::new(),
        error: Some(error.to_string()),
    })
}

/// 校验 Base64 命令
#[tauri::command]
pub fn validate_base64(input: String, config: Base64ProcessConfig) -> Base64ValidateResult {
    Base64ToolService::validate(&input, &config).unwrap_or_else(|error| Base64ValidateResult {
        is_valid: false,
        error_message: Some(error.to_string()),
    })
}

/// 将图片文件编码为 Base64
#[tauri::command]
pub fn encode_image_to_base64(input_path: String) -> Result<Base64ImageResult, String> {
    Base64ToolService::encode_image(&input_path).map_err(|error| error.to_string())
}

/// 将 Base64 或 Data URL 解码为图片
#[tauri::command]
pub fn decode_base64_to_image(input: String) -> Result<Base64ImageResult, String> {
    Base64ToolService::decode_image(&input).map_err(|error| error.to_string())
}

/// 将 Base64 或 Data URL 保存为图片文件
#[tauri::command]
pub fn save_base64_image(output_path: String, input: String) -> Result<(), String> {
    Base64ToolService::save_image(&output_path, &input).map_err(|error| error.to_string())
}
