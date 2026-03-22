//! 代码格式化服务
//!
//! 提供代码格式化功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::code_format::{CodeFormatConfig, CodeFormatResult, CodeValidateResult};
use crate::utils::code_formatter;

/// 代码格式化服务
pub struct CodeFormatService;

impl CodeFormatService {
    /// 格式化代码字符串
    ///
    /// 根据配置对输入的代码字符串进行格式化
    ///
    /// # 参数
    ///
    /// * `input` - 输入的代码字符串
    /// * `config` - 格式化配置
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    pub fn format(input: &str, config: &CodeFormatConfig) -> AppResult<CodeFormatResult> {
        if input.trim().is_empty() {
            return Ok(CodeFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match code_formatter::format_code(input, config) {
            Ok(formatted) => Ok(CodeFormatResult {
                success: true,
                result: formatted,
                error: None,
            }),
            Err(err) => Ok(CodeFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
            }),
        }
    }

    /// 验证代码字符串
    ///
    /// 检查输入的字符串是否为有效的代码
    ///
    /// # 参数
    ///
    /// * `input` - 输入的代码字符串
    /// * `language` - 编程语言
    ///
    /// # 返回
    ///
    /// 返回验证结果
    pub fn validate(
        input: &str,
        language: crate::models::code_format::CodeLanguage,
    ) -> AppResult<CodeValidateResult> {
        let result = code_formatter::validate_code(input, language);
        Ok(CodeValidateResult {
            is_valid: result.is_valid,
            error_message: result.error_message,
            error_line: result.error_line,
        })
    }
}
