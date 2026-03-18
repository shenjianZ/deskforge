//! 公网 IP 工具函数
//!
//! 提供公网 IP 查询结果解析逻辑

use serde_json::Value;

use crate::{error::AppError, models::public_ip_tool::PublicIpInfo};

/// 解析 ipify 返回结果
pub fn parse_ipify_response(body: &str) -> Result<String, AppError> {
    let value: Value = serde_json::from_str(body)
        .map_err(|error| AppError::InvalidData(format!("解析 IP 响应失败: {}", error)))?;

    value
        .get("ip")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .ok_or_else(|| AppError::InvalidData("IP 响应缺少 ip 字段".to_string()))
}

/// 解析 ipwho.is 返回结果
pub fn parse_ipwhois_response(ip: String, body: &str) -> Result<PublicIpInfo, AppError> {
    let value: Value = serde_json::from_str(body)
        .map_err(|error| AppError::InvalidData(format!("解析归属地响应失败: {}", error)))?;

    if value.get("success").and_then(Value::as_bool) == Some(false) {
        let message = value
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("归属地接口返回失败");
        return Err(AppError::NetworkRequestFailed(message.to_string()));
    }

    Ok(PublicIpInfo {
        current_ip: Some(ip),
        ipv4: None,
        ipv6: None,
        country: value.get("country").and_then(Value::as_str).map(ToOwned::to_owned),
        region: value
            .get("region")
            .or_else(|| value.get("region_name"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        city: value.get("city").and_then(Value::as_str).map(ToOwned::to_owned),
        timezone: value
            .get("timezone")
            .and_then(|timezone| {
                timezone
                    .get("id")
                    .or_else(|| timezone.get("name"))
                    .and_then(Value::as_str)
            })
            .map(ToOwned::to_owned)
            .or_else(|| value.get("timezone").and_then(Value::as_str).map(ToOwned::to_owned)),
        asn: value
            .get("connection")
            .and_then(|connection| connection.get("asn"))
            .and_then(Value::as_i64)
            .map(|value| format!("AS{}", value)),
        organization: value
            .get("connection")
            .and_then(|connection| connection.get("org"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        isp: value
            .get("connection")
            .and_then(|connection| connection.get("isp"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ipify_response() {
        let ip = parse_ipify_response(r#"{"ip":"1.2.3.4"}"#).unwrap();
        assert_eq!(ip, "1.2.3.4");
    }

    #[test]
    fn test_parse_ipwhois_response() {
        let result = parse_ipwhois_response(
            "1.2.3.4".to_string(),
            r#"{
                "success": true,
                "country": "Test Country",
                "region": "Test Region",
                "city": "Test City",
                "timezone": { "id": "Asia/Shanghai" },
                "connection": { "asn": 12345, "org": "Example Org", "isp": "Example ISP" }
            }"#,
        )
        .unwrap();

        assert_eq!(result.current_ip.as_deref(), Some("1.2.3.4"));
        assert_eq!(result.country.as_deref(), Some("Test Country"));
        assert_eq!(result.asn.as_deref(), Some("AS12345"));
    }
}
