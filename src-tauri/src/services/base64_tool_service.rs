//! Base64 工具服务
//!
//! 提供 Base64 编解码功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::base64_tool::{Base64ProcessConfig, Base64ProcessResult, Base64ValidateResult};
use crate::utils::base64_tool;

/// Base64 工具服务
pub struct Base64ToolService;

impl Base64ToolService {
    /// 编码文本为 Base64
    pub fn encode(input: &str, config: &Base64ProcessConfig) -> AppResult<Base64ProcessResult> {
        if input.is_empty() {
            return Ok(Base64ProcessResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        Ok(Base64ProcessResult {
            success: true,
            result: base64_tool::encode_base64(input, config),
            error: None,
        })
    }

    /// 解码 Base64 为文本
    pub fn decode(input: &str, config: &Base64ProcessConfig) -> AppResult<Base64ProcessResult> {
        if input.trim().is_empty() {
            return Ok(Base64ProcessResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match base64_tool::decode_base64(input, config) {
            Ok(result) => Ok(Base64ProcessResult {
                success: true,
                result,
                error: None,
            }),
            Err(error) => Ok(Base64ProcessResult {
                success: false,
                result: String::new(),
                error: Some(error),
            }),
        }
    }

    /// 校验输入是否为有效的 Base64
    pub fn validate(input: &str, config: &Base64ProcessConfig) -> AppResult<Base64ValidateResult> {
        if input.trim().is_empty() {
            return Ok(Base64ValidateResult {
                is_valid: false,
                error_message: Some("输入内容不能为空".to_string()),
            });
        }

        match base64_tool::validate_base64(input, config) {
            Ok(_) => Ok(Base64ValidateResult {
                is_valid: true,
                error_message: None,
            }),
            Err(error) => Ok(Base64ValidateResult {
                is_valid: false,
                error_message: Some(error),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_text() {
        let result = Base64ToolService::encode("DeskForge", &Base64ProcessConfig::default()).unwrap();
        assert!(result.success);
        assert_eq!(result.result, "RGVza0Zvcmdl");
    }

    #[test]
    fn test_decode_text() {
        let result = Base64ToolService::decode("RGVza0Zvcmdl", &Base64ProcessConfig::default()).unwrap();
        assert!(result.success);
        assert_eq!(result.result, "DeskForge");
    }

    #[test]
    fn test_validate_invalid_input() {
        let result = Base64ToolService::validate("bad@@@", &Base64ProcessConfig::default()).unwrap();
        assert!(!result.is_valid);
        assert!(result.error_message.is_some());
    }
}
