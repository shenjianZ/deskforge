//! XML 格式化服务
//!
//! 提供 XML 格式化功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::xml_format::{XmlFormatConfig, XmlFormatResult, XmlValidateResult};
use crate::utils::xml_formatter;

/// XML 格式化服务
pub struct XmlFormatService;

impl XmlFormatService {
    /// 格式化 XML 字符串
    ///
    /// 根据配置对输入的 XML 字符串进行格式化
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 XML 字符串
    /// * `config` - 格式化配置
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    pub fn format(input: &str, config: &XmlFormatConfig) -> AppResult<XmlFormatResult> {
        if input.trim().is_empty() {
            return Ok(XmlFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match xml_formatter::format_xml(input, config) {
            Ok(formatted) => Ok(XmlFormatResult {
                success: true,
                result: formatted,
                error: None,
            }),
            Err(err) => Ok(XmlFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
            }),
        }
    }

    /// 验证 XML 字符串
    ///
    /// 检查输入的字符串是否为有效的 XML
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 XML 字符串
    ///
    /// # 返回
    ///
    /// 返回验证结果
    pub fn validate(input: &str) -> AppResult<XmlValidateResult> {
        let result = xml_formatter::validate_xml(input);
        Ok(XmlValidateResult {
            is_valid: result.is_valid,
            error_message: result.error_message,
            error_line: result.error_line,
        })
    }

    /// 压缩 XML 字符串
    ///
    /// 去除 XML 中的所有多余空格和换行
    ///
    /// # 参数
    ///
    /// * `input` - 输入的 XML 字符串
    ///
    /// # 返回
    ///
    /// 返回格式化结果
    pub fn compact(input: &str) -> AppResult<XmlFormatResult> {
        if input.trim().is_empty() {
            return Ok(XmlFormatResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match xml_formatter::compact_xml(input) {
            Ok(compacted) => Ok(XmlFormatResult {
                success: true,
                result: compacted,
                error: None,
            }),
            Err(err) => Ok(XmlFormatResult {
                success: false,
                result: String::new(),
                error: Some(err),
            }),
        }
    }
}
