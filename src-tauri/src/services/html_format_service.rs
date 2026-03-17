//! HTML 格式化服务
//!
//! 提供 HTML 格式化功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::html_format::{HtmlFormatConfig, HtmlFormatResult, HtmlValidateResult};
use crate::utils::html_formatter;

/// HTML 格式化服务
pub struct HtmlFormatService;

impl HtmlFormatService {
    /// 格式化 HTML 字符串
    ///
    /// 根据配置对输入的 HTML 字符串进行格式化
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 HTML 字符串
    /// * `config` - 格式化配置
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    pub fn format(input: &str, config: &HtmlFormatConfig) -> AppResult<HtmlFormatResult> {
        if input.trim().is_empty() {
            return Ok(HtmlFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match html_formatter::format_html(input, config) {
            Ok(formatted) => Ok(HtmlFormatResult {
                success: true,
                result: formatted,
                error: None,
            }),
            Err(err) => Ok(HtmlFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
            }),
        }
    }

    /// 验证 HTML 字符串
    ///
    /// 检查输入的字符串是否为有效的 HTML
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 HTML 字符串
    ///
    /// # 返回
    ///
    /// 返回验证结果
    pub fn validate(input: &str) -> AppResult<HtmlValidateResult> {
        let result = html_formatter::validate_html(input);
        Ok(HtmlValidateResult {
            is_valid: result.is_valid,
            error_message: result.error_message,
            error_line: result.error_line,
        })
    }

    /// 压缩 HTML 字符串
    ///
    /// 去除 HTML 中的所有多余空格和换行
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 HTML 字符串
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    pub fn compact(input: &str) -> AppResult<HtmlFormatResult> {
        if input.trim().is_empty() {
            return Ok(HtmlFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match html_formatter::compact_html(input) {
            Ok(compacted) => Ok(HtmlFormatResult {
                success: true,
                result: compacted,
                error: None,
            }),
            Err(err) => Ok(HtmlFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
            }),
        }
    }
}
