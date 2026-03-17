//! Rust 格式化相关数据模型
//!
//! 定义 Rust 格式化工具使用的数据结构

use serde::{Deserialize, Serialize};
use super::code_format::FormatMode;

/// Rust 格式化配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RustFormatConfig {
    /// 缩进空格数（默认 4，Rust 标准）
    #[serde(default = "default_indent")]
    pub indent: u32,

    /// 格式化模式
    pub mode: FormatMode,
}

/// 默认缩进空格数
fn default_indent() -> u32 {
    4
}

/// Rust 验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RustValidateResult {
    /// 是否有效的代码
    pub is_valid: bool,

    /// 错误信息（如果无效）
    pub error_message: Option<String>,

    /// 错误位置（行号，从 1 开始）
    pub error_line: Option<usize>,
}
