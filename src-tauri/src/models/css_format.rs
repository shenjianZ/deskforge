//! CSS 格式化相关数据模型
//!
//! 定义 CSS 格式化工具使用的数据结构

use super::code_format::FormatMode;
use serde::{Deserialize, Serialize};

/// CSS 格式化配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CssFormatConfig {
    /// 缩进空格数（默认 2）
    #[serde(default = "default_indent")]
    pub indent: u32,

    /// 格式化模式
    pub mode: FormatMode,
}

/// 默认缩进空格数
fn default_indent() -> u32 {
    2
}

/// CSS 验证结果
#[cfg(test)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CssValidateResult {
    /// 是否有效的代码
    pub is_valid: bool,

    /// 错误信息（如果无效）
    pub error_message: Option<String>,

    /// 错误位置（行号，从 1 开始）
    pub error_line: Option<usize>,
}
