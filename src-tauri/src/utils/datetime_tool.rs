//! 日期时间工具函数
//!
//! 提供时间戳与日期时间双向转换算法

use chrono::{
    DateTime, FixedOffset, Local, LocalResult, NaiveDate, NaiveDateTime, TimeZone, Utc,
};

use crate::models::datetime_tool::{
    DateTimeOutputFormat, DateTimeToolConfig, TimestampUnit,
};

fn format_date_time(
    utc_time: DateTime<Utc>,
    local_time: DateTime<Local>,
    config: &DateTimeToolConfig,
) -> String {
    let target_text = if config.use_utc {
        match config.output_format {
            DateTimeOutputFormat::Iso8601 => utc_time.to_rfc3339(),
            DateTimeOutputFormat::LocalDateTime => utc_time.format("%Y-%m-%d %H:%M:%S UTC").to_string(),
            DateTimeOutputFormat::Rfc2822 => utc_time.to_rfc2822(),
        }
    } else {
        match config.output_format {
            DateTimeOutputFormat::Iso8601 => local_time.to_rfc3339(),
            DateTimeOutputFormat::LocalDateTime => local_time.format("%Y-%m-%d %H:%M:%S %:z").to_string(),
            DateTimeOutputFormat::Rfc2822 => local_time.to_rfc2822(),
        }
    };

    format!(
        "{}\n\nUTC: {}\nLocal: {}\nUnix Seconds: {}\nUnix Milliseconds: {}",
        target_text,
        utc_time.to_rfc3339(),
        local_time.to_rfc3339(),
        utc_time.timestamp(),
        utc_time.timestamp_millis()
    )
}

fn parse_fixed_offset_datetime(input: &str) -> Option<DateTime<FixedOffset>> {
    let trimmed = input.trim();
    DateTime::parse_from_rfc3339(trimmed)
        .ok()
        .or_else(|| DateTime::parse_from_rfc2822(trimmed).ok())
}

fn parse_naive_datetime(input: &str) -> Option<NaiveDateTime> {
    let trimmed = input.trim();
    const DATETIME_FORMATS: [&str; 4] = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ];

    DATETIME_FORMATS
        .iter()
        .find_map(|format| NaiveDateTime::parse_from_str(trimmed, format).ok())
        .or_else(|| {
            NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
                .ok()
                .and_then(|date| date.and_hms_opt(0, 0, 0))
        })
        .or_else(|| {
            NaiveDate::parse_from_str(trimmed, "%Y/%m/%d")
                .ok()
                .and_then(|date| date.and_hms_opt(0, 0, 0))
        })
}

fn to_utc_datetime(input: &str, config: &DateTimeToolConfig) -> Result<DateTime<Utc>, String> {
    if let Some(value) = parse_fixed_offset_datetime(input) {
        return Ok(value.with_timezone(&Utc));
    }

    let naive = parse_naive_datetime(input)
        .ok_or_else(|| "无法识别日期时间格式，支持 YYYY-MM-DD、YYYY-MM-DD HH:mm:ss、ISO 8601 等格式".to_string())?;

    if config.use_utc {
        return Ok(Utc.from_utc_datetime(&naive));
    }

    match Local.from_local_datetime(&naive) {
        LocalResult::Single(value) => Ok(value.with_timezone(&Utc)),
        LocalResult::Ambiguous(early, _) => Ok(early.with_timezone(&Utc)),
        LocalResult::None => Err("当前本地时区下该日期时间无效".to_string()),
    }
}

/// 将时间戳转换为日期时间
pub fn timestamp_to_datetime(input: &str, config: &DateTimeToolConfig) -> Result<String, String> {
    let raw = input.trim();
    let timestamp = raw
        .parse::<i64>()
        .map_err(|_| "请输入有效的整数时间戳".to_string())?;

    let utc_time = match config.timestamp_unit {
        TimestampUnit::Seconds => Utc
            .timestamp_opt(timestamp, 0)
            .single()
            .ok_or_else(|| "时间戳超出可处理范围".to_string())?,
        TimestampUnit::Milliseconds => DateTime::<Utc>::from_timestamp_millis(timestamp)
            .ok_or_else(|| "时间戳超出可处理范围".to_string())?,
    };

    Ok(format_date_time(utc_time, utc_time.with_timezone(&Local), config))
}

/// 将日期时间转换为时间戳
pub fn datetime_to_timestamp(input: &str, config: &DateTimeToolConfig) -> Result<String, String> {
    let utc_time = to_utc_datetime(input, config)?;
    let local_time = utc_time.with_timezone(&Local);

    Ok(format!(
        "{}\n\nUTC: {}\nLocal: {}",
        match config.timestamp_unit {
            TimestampUnit::Seconds => utc_time.timestamp().to_string(),
            TimestampUnit::Milliseconds => utc_time.timestamp_millis().to_string(),
        },
        utc_time.to_rfc3339(),
        local_time.to_rfc3339()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::datetime_tool::{DateTimeToolConfig, TimestampUnit};

    #[test]
    fn test_timestamp_to_datetime_seconds() {
        let result = timestamp_to_datetime(
            "0",
            &DateTimeToolConfig {
                timestamp_unit: TimestampUnit::Seconds,
                use_utc: true,
                ..DateTimeToolConfig::default()
            },
        )
        .unwrap();
        assert!(result.contains("1970-01-01"));
    }

    #[test]
    fn test_datetime_to_timestamp_milliseconds() {
        let result = datetime_to_timestamp(
            "1970-01-01 00:00:01",
            &DateTimeToolConfig {
                timestamp_unit: TimestampUnit::Milliseconds,
                use_utc: true,
                ..DateTimeToolConfig::default()
            },
        )
        .unwrap();
        assert!(result.starts_with("1000"));
    }
}
