//! 日期时间工具服务
//!
//! 提供日期时间转换功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::datetime_tool::{DateTimeToolConfig, DateTimeToolResult};
use crate::utils::datetime_tool;

/// 日期时间工具服务
pub struct DateTimeToolService;

impl DateTimeToolService {
    /// 将时间戳转换为日期时间
    pub fn timestamp_to_datetime(
        input: &str,
        config: &DateTimeToolConfig,
    ) -> AppResult<DateTimeToolResult> {
        if input.trim().is_empty() {
            return Ok(DateTimeToolResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match datetime_tool::timestamp_to_datetime(input, config) {
            Ok(result) => Ok(DateTimeToolResult {
                success: true,
                result,
                error: None,
            }),
            Err(error) => Ok(DateTimeToolResult {
                success: false,
                result: String::new(),
                error: Some(error),
            }),
        }
    }

    /// 将日期时间转换为时间戳
    pub fn datetime_to_timestamp(
        input: &str,
        config: &DateTimeToolConfig,
    ) -> AppResult<DateTimeToolResult> {
        if input.trim().is_empty() {
            return Ok(DateTimeToolResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match datetime_tool::datetime_to_timestamp(input, config) {
            Ok(result) => Ok(DateTimeToolResult {
                success: true,
                result,
                error: None,
            }),
            Err(error) => Ok(DateTimeToolResult {
                success: false,
                result: String::new(),
                error: Some(error),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::datetime_tool::{DateTimeToolConfig, TimestampUnit};

    #[test]
    fn test_convert_timestamp() {
        let result = DateTimeToolService::timestamp_to_datetime(
            "0",
            &DateTimeToolConfig {
                timestamp_unit: TimestampUnit::Seconds,
                use_utc: true,
                ..DateTimeToolConfig::default()
            },
        )
        .unwrap();
        assert!(result.success);
    }

    #[test]
    fn test_convert_datetime() {
        let result = DateTimeToolService::datetime_to_timestamp(
            "1970-01-01 00:00:01",
            &DateTimeToolConfig {
                timestamp_unit: TimestampUnit::Seconds,
                use_utc: true,
                ..DateTimeToolConfig::default()
            },
        )
        .unwrap();
        assert!(result.success);
        assert!(result.result.starts_with("1"));
    }
}
