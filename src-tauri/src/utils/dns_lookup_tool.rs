//! DNS 查询工具函数
//!
//! 提供 DNS 查询结果解析逻辑

use serde_json::Value;

use crate::{
    error::AppError,
    models::dns_lookup_tool::{DnsLookupRecord, DnsLookupResult},
};

/// 解析 DNS JSON 响应
pub fn parse_dns_lookup_response(
    domain: &str,
    record_type: &str,
    body: &str,
) -> Result<DnsLookupResult, AppError> {
    let value: Value = serde_json::from_str(body)
        .map_err(|error| AppError::InvalidData(format!("解析 DNS 响应失败: {}", error)))?;

    let status = value.get("Status").and_then(Value::as_u64).unwrap_or(0) as u32;
    let authoritative = value.get("AD").and_then(Value::as_bool).unwrap_or(false);
    let answers = value
        .get("Answer")
        .and_then(Value::as_array)
        .map(|records| {
            records
                .iter()
                .map(|record| DnsLookupRecord {
                    name: record
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string(),
                    record_type: record
                        .get("type")
                        .and_then(Value::as_u64)
                        .map(|value| value.to_string())
                        .unwrap_or_default(),
                    ttl: record.get("TTL").and_then(Value::as_u64).unwrap_or(0) as u32,
                    data: record
                        .get("data")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string(),
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(DnsLookupResult {
        success: status == 0,
        domain: domain.to_string(),
        record_type: record_type.to_string(),
        status,
        authoritative,
        answers,
        raw_response: body.to_string(),
        error: if status == 0 {
            None
        } else {
            Some(format!("DNS 查询返回状态码 {}", status))
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_dns_lookup_response() {
        let result = parse_dns_lookup_response(
            "example.com",
            "A",
            r#"{
              "Status": 0,
              "AD": true,
              "Answer": [
                { "name": "example.com.", "type": 1, "TTL": 300, "data": "93.184.216.34" }
              ]
            }"#,
        )
        .unwrap();

        assert!(result.success);
        assert_eq!(result.answers.len(), 1);
        assert_eq!(result.answers[0].data, "93.184.216.34");
    }
}
