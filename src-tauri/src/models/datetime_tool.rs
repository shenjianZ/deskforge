//! 日期时间工具相关数据模型
//!
//! 定义日期时间转换工具使用的数据结构

use serde::{Deserialize, Serialize};

/// 时间戳单位
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TimestampUnit {
    /// 秒级时间戳
    #[serde(rename = "seconds")]
    Seconds,
    /// 毫秒级时间戳
    #[serde(rename = "milliseconds")]
    Milliseconds,
}

impl Default for TimestampUnit {
    fn default() -> Self {
        Self::Milliseconds
    }
}

/// 日期时间输出格式
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DateTimeOutputFormat {
    /// ISO 8601
    #[serde(rename = "iso8601")]
    Iso8601,
    /// 常见本地格式
    #[serde(rename = "localDateTime")]
    LocalDateTime,
    /// RFC 2822
    #[serde(rename = "rfc2822")]
    Rfc2822,
}

impl Default for DateTimeOutputFormat {
    fn default() -> Self {
        Self::LocalDateTime
    }
}

/// 日期时间工具配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateTimeToolConfig {
    /// 时间戳单位
    #[serde(default)]
    pub timestamp_unit: TimestampUnit,

    /// 是否按 UTC 处理无时区日期
    #[serde(default)]
    pub use_utc: bool,

    /// 输出格式
    #[serde(default)]
    pub output_format: DateTimeOutputFormat,
}

impl Default for DateTimeToolConfig {
    fn default() -> Self {
        Self {
            timestamp_unit: TimestampUnit::default(),
            use_utc: false,
            output_format: DateTimeOutputFormat::default(),
        }
    }
}

/// 日期时间处理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateTimeToolResult {
    /// 是否成功
    pub success: bool,

    /// 处理结果
    pub result: String,

    /// 错误信息
    pub error: Option<String>,
}
