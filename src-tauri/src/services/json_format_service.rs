//! JSON 格式化服务
//!
//! 提供 JSON 格式化功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::json_format::{JsonFormatConfig, JsonFormatResult, JsonValidateResult};
use crate::utils::json_formatter;

/// JSON 格式化服务
pub struct JsonFormatService;

impl JsonFormatService {
    /// 格式化 JSON 字符串
    ///
    /// 根据配置对输入的 JSON 字符串进行格式化
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 JSON 字符串
    /// * `config` - 格式化配置
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    ///
    /// # 错误
    ///
    /// - 输入为空时返回 `AppError::InvalidData`
    pub fn format(input: &str, config: &JsonFormatConfig) -> AppResult<JsonFormatResult> {
        // 参数验证
        if input.trim().is_empty() {
            return Ok(JsonFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
                is_valid: false,
            });
        }

        // 调用工具函数进行格式化
        match json_formatter::format_json(input, config) {
            Ok(formatted) => Ok(JsonFormatResult {
                success: true,
                result: formatted,
                error: None,
                is_valid: true,
            }),
            Err(err) => Ok(JsonFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
                is_valid: false,
            }),
        }
    }

    /// 验证 JSON 字符串
    ///
    /// 检查输入的字符串是否为有效的 JSON
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 JSON 字符串
    ///
    /// # 返回
    ///
    /// 返回验证结果
    pub fn validate(input: &str) -> AppResult<JsonValidateResult> {
        // 参数验证
        if input.trim().is_empty() {
            return Ok(JsonValidateResult {
                is_valid: false,
                error_message: Some("输入内容不能为空".to_string()),
                error_line: None,
                error_column: None,
            });
        }

        // 调用工具函数进行验证
        let result = json_formatter::validate_json(input);
        Ok(JsonValidateResult {
            is_valid: result.is_valid,
            error_message: result.error_message,
            error_line: result.error_line,
            error_column: result.error_column,
        })
    }

    /// 压缩 JSON 字符串
    ///
    /// 去除 JSON 中的所有空格和换行
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 JSON 字符串
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    pub fn compact(input: &str) -> AppResult<JsonFormatResult> {
        // 参数验证
        if input.trim().is_empty() {
            return Ok(JsonFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
                is_valid: false,
            });
        }

        // 调用工具函数进行压缩
        match json_formatter::compact_json(input) {
            Ok(compacted) => Ok(JsonFormatResult {
                success: true,
                result: compacted,
                error: None,
                is_valid: true,
            }),
            Err(err) => Ok(JsonFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
                is_valid: false,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_valid_json() {
        let input = r#"{"name":"test","value":123}"#;
        let config = JsonFormatConfig::default();

        let result = JsonFormatService::format(input, &config).unwrap();
        assert!(result.success);
        assert!(result.is_valid);
        assert!(result.error.is_none());
        assert!(result.result.contains('\n'));
    }

    #[test]
    fn test_format_invalid_json() {
        let input = r#"{"invalid": }"#;
        let config = JsonFormatConfig::default();

        let result = JsonFormatService::format(input, &config).unwrap();
        assert!(!result.success);
        assert!(!result.is_valid);
        assert!(result.error.is_some());
    }

    #[test]
    fn test_format_empty_input() {
        let input = "";
        let config = JsonFormatConfig::default();

        let result = JsonFormatService::format(input, &config).unwrap();
        assert!(!result.success);
        assert!(!result.is_valid);
        assert!(result.error.is_some());
    }

    #[test]
    fn test_validate_valid_json() {
        let input = r#"{"valid": true}"#;

        let result = JsonFormatService::validate(input).unwrap();
        assert!(result.is_valid);
        assert!(result.error_message.is_none());
    }

    #[test]
    fn test_validate_invalid_json() {
        let input = r#"{"invalid": }"#;

        let result = JsonFormatService::validate(input).unwrap();
        assert!(!result.is_valid);
        assert!(result.error_message.is_some());
    }

    #[test]
    fn test_compact_json() {
        let input = r#"{  "name"  :  "test"  }"#;

        let result = JsonFormatService::compact(input).unwrap();
        assert!(result.success);
        assert!(result.is_valid);
        assert_eq!(result.result, r#"{"name":"test"}"#);
    }
}
