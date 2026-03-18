//! WHOIS 查询工具函数
//!
//! 提供 RDAP 查询结果解析逻辑

use serde_json::Value;
use std::collections::BTreeSet;

use crate::{
    error::AppError,
    models::whois_tool::{WhoisEventInfo, WhoisLookupResult},
};

fn extract_registrar_name(value: &Value) -> Option<String> {
    value
        .get("entities")
        .and_then(Value::as_array)
        .and_then(|entities| {
            entities.iter().find_map(|entity| {
                let roles = entity.get("roles").and_then(Value::as_array)?;
                let is_registrar = roles.iter().any(|role| role.as_str() == Some("registrar"));
                if !is_registrar {
                    return None;
                }

                entity
                    .get("vcardArray")
                    .and_then(Value::as_array)
                    .and_then(|vcard| vcard.get(1))
                    .and_then(Value::as_array)
                    .and_then(|fields| {
                        fields.iter().find_map(|field| {
                            let field = field.as_array()?;
                            let key = field.first()?.as_str()?;
                            if key != "fn" {
                                return None;
                            }
                            field.get(3)?.as_str().map(ToOwned::to_owned)
                        })
                    })
                    .or_else(|| {
                        entity
                            .get("handle")
                            .and_then(Value::as_str)
                            .map(ToOwned::to_owned)
                    })
            })
        })
}

/// 解析 RDAP 响应
pub fn parse_whois_response(domain: &str, body: &str) -> Result<WhoisLookupResult, AppError> {
    let value: Value = serde_json::from_str(body)
        .map_err(|error| AppError::InvalidData(format!("解析 WHOIS 响应失败: {}", error)))?;

    if let Some(error_code) = value.get("errorCode").and_then(Value::as_u64) {
        let title = value
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("WHOIS 查询失败");
        return Ok(WhoisLookupResult {
            success: false,
            domain: domain.to_string(),
            registrar: None,
            handle: None,
            statuses: Vec::new(),
            nameservers: Vec::new(),
            events: Vec::new(),
            raw_response: body.to_string(),
            error: Some(format!("{} ({})", title, error_code)),
        });
    }

    let statuses = value
        .get("status")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let nameservers = value
        .get("nameservers")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.get("ldhName").and_then(Value::as_str))
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let events = value
        .get("events")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|event| {
                    Some(WhoisEventInfo {
                        event_action: event.get("eventAction")?.as_str()?.to_string(),
                        event_date: event.get("eventDate")?.as_str()?.to_string(),
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(WhoisLookupResult {
        success: true,
        domain: domain.to_string(),
        registrar: extract_registrar_name(&value),
        handle: value.get("handle").and_then(Value::as_str).map(ToOwned::to_owned),
        statuses,
        nameservers,
        events,
        raw_response: body.to_string(),
        error: None,
    })
}

fn find_first_field<'a>(body: &'a str, keys: &[&str]) -> Option<String> {
    body.lines().find_map(|line| {
        keys.iter().find_map(|key| {
            line.strip_prefix(key)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
        })
    })
}

fn collect_fields(body: &str, keys: &[&str]) -> Vec<String> {
    let mut values = BTreeSet::new();
    for line in body.lines() {
        for key in keys {
            if let Some(value) = line.strip_prefix(key).map(str::trim).filter(|value| !value.is_empty()) {
                values.insert(value.to_string());
            }
        }
    }
    values.into_iter().collect()
}

/// 解析传统 WHOIS 文本响应
pub fn parse_raw_whois_response(domain: &str, body: &str) -> WhoisLookupResult {
    let registrar = find_first_field(
        body,
        &[
            "Registrar:",
            "Sponsoring Registrar:",
            "registrar:",
            "Registrar Name:",
        ],
    );
    let handle = find_first_field(
        body,
        &[
            "Registry Domain ID:",
            "Domain Name:",
            "Domain:",
            "Domain ID:",
        ],
    );
    let statuses = collect_fields(body, &["Status:", "Domain Status:", "status:"]);
    let nameservers = collect_fields(body, &["Name Server:", "nserver:", "DNS:"]);

    let mut events = Vec::new();
    for (action, keys) in [
        ("registration", vec!["Registration Time:", "Creation Date:", "Created On:"]),
        ("expiration", vec!["Expiration Time:", "Registry Expiry Date:", "Expiry Date:"]),
        ("last changed", vec!["Updated Date:", "Updated Time:", "Last Updated On:"]),
    ] {
        if let Some(date) = find_first_field(body, &keys) {
            events.push(WhoisEventInfo {
                event_action: action.to_string(),
                event_date: date,
            });
        }
    }

    WhoisLookupResult {
        success: true,
        domain: domain.to_string(),
        registrar,
        handle,
        statuses,
        nameservers,
        events,
        raw_response: body.to_string(),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_whois_response() {
        let result = parse_whois_response(
            "example.com",
            r#"{
              "handle": "2336799_DOMAIN_COM-VRSN",
              "status": ["client delete prohibited", "client transfer prohibited"],
              "nameservers": [
                { "ldhName": "a.iana-servers.net" },
                { "ldhName": "b.iana-servers.net" }
              ],
              "events": [
                { "eventAction": "registration", "eventDate": "1995-08-14T04:00:00Z" },
                { "eventAction": "expiration", "eventDate": "2026-08-13T04:00:00Z" }
              ],
              "entities": [
                {
                  "roles": ["registrar"],
                  "vcardArray": ["vcard", [["fn", {}, "text", "Example Registrar, Inc."]]]
                }
              ]
            }"#,
        )
        .unwrap();

        assert!(result.success);
        assert_eq!(result.registrar.as_deref(), Some("Example Registrar, Inc."));
        assert_eq!(result.nameservers.len(), 2);
        assert_eq!(result.events.len(), 2);
    }

    #[test]
    fn test_parse_raw_whois_response() {
        let result = parse_raw_whois_response(
            "example.cn",
            "Domain Name: example.cn\nSponsoring Registrar: Example Registrar\nStatus: ok\nName Server: ns1.example.cn\nName Server: ns2.example.cn\nRegistration Time: 2020-01-01 00:00:00\nExpiration Time: 2030-01-01 00:00:00\n",
        );

        assert!(result.success);
        assert_eq!(result.registrar.as_deref(), Some("Example Registrar"));
        assert_eq!(result.nameservers.len(), 2);
        assert_eq!(result.events.len(), 2);
    }
}
