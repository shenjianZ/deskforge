//! Base64 工具相关数据模型
//!
//! 定义 Base64 编解码工具使用的数据结构

use serde::{Deserialize, Serialize};

/// Base64 变体
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Base64Variant {
    /// 标准 Base64
    #[serde(rename = "standard")]
    Standard,
    /// URL Safe Base64
    #[serde(rename = "urlSafe")]
    UrlSafe,
}

impl Default for Base64Variant {
    fn default() -> Self {
        Self::Standard
    }
}

/// Base64 处理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Base64ProcessConfig {
    /// 编解码使用的变体
    #[serde(default)]
    pub variant: Base64Variant,

    /// 编码时是否保留填充符
    #[serde(default = "default_padding")]
    pub padding: bool,
}

fn default_padding() -> bool {
    true
}

impl Default for Base64ProcessConfig {
    fn default() -> Self {
        Self {
            variant: Base64Variant::default(),
            padding: default_padding(),
        }
    }
}

/// Base64 处理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Base64ProcessResult {
    /// 是否成功
    pub success: bool,

    /// 处理结果
    pub result: String,

    /// 错误信息
    pub error: Option<String>,
}

/// Base64 验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Base64ValidateResult {
    /// 是否为有效的 Base64 输入
    pub is_valid: bool,

    /// 错误信息
    pub error_message: Option<String>,
}

/// 图片 Base64 处理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Base64ImageResult {
    /// 纯 Base64 内容
    pub base64: String,

    /// 带 data URL 前缀的内容
    pub data_url: String,

    /// MIME 类型
    pub mime: String,

    /// 图片格式
    pub format: String,

    /// 建议扩展名
    pub suggested_extension: String,

    /// 图片宽度
    pub width: u32,

    /// 图片高度
    pub height: u32,

    /// 原始字节大小
    pub byte_size: usize,
}
