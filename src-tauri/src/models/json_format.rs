//! JSON 格式化相关数据模型
//!
//! 定义 JSON 格式化工具使用的数据结构

use serde::{Deserialize, Serialize};

/// JSON 格式化配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonFormatConfig {
    /// 缩进空格数（默认 2）
    #[serde(default = "default_indent")]
    pub indent: u32,

    /// 是否对 key 进行排序
    #[serde(default)]
    pub sort_keys: bool,

    /// 格式化模式
    #[serde(default)]
    pub mode: FormatMode,
}

/// 默认缩进空格数
fn default_indent() -> u32 {
    2
}

/// JSON 格式化模式
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum FormatMode {
    /// 标准格式化（美化）
    #[serde(rename = "pretty")]
    Pretty,
    /// 压缩格式（去除空格和换行）
    #[serde(rename = "compact")]
    Compact,
}

impl Default for FormatMode {
    fn default() -> Self {
        Self::Pretty
    }
}

impl Default for JsonFormatConfig {
    fn default() -> Self {
        Self {
            indent: default_indent(),
            sort_keys: false,
            mode: FormatMode::default(),
        }
    }
}

/// JSON 格式化结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonFormatResult {
    /// 是否成功
    pub success: bool,

    /// 格式化后的 JSON 字符串
    pub result: String,

    /// 错误信息（如果失败）
    pub error: Option<String>,

    /// 原始 JSON 是否有效
    pub is_valid: bool,
}

/// JSON 验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonValidateResult {
    /// 是否有效的 JSON
    pub is_valid: bool,

    /// 错误信息（如果无效）
    pub error_message: Option<String>,

    /// 错误位置（行号，从 1 开始）
    pub error_line: Option<usize>,

    /// 错误位置（列号，从 1 开始）
    pub error_column: Option<usize>,
}
