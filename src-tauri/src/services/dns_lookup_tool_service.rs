//! DNS 查询工具服务
//!
//! 提供 DNS 查询功能的核心业务逻辑

use std::time::Duration;

use reqwest::{Client, Url};

use crate::{
    error::{AppError, AppResult},
    models::dns_lookup_tool::{DnsLookupConfig, DnsLookupResult},
    utils::dns_lookup_tool,
};

/// DNS 查询工具服务
pub struct DnsLookupToolService;

impl DnsLookupToolService {
    fn normalize_domain(input: &str) -> Result<String, String> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err("请输入域名".to_string());
        }

        if trimmed.contains("://") {
            let url = Url::parse(trimmed)
                .map_err(|error| format!("URL 解析失败: {}", error))?;
            let host = url
                .host_str()
                .ok_or_else(|| "URL 中缺少有效主机名".to_string())?;
            return Ok(host.trim_end_matches('.').to_string());
        }

        let without_path = trimmed
            .split(['/', '?', '#'])
            .next()
            .unwrap_or(trimmed)
            .trim();

        if without_path.is_empty() {
            return Err("请输入有效的域名".to_string());
        }

        Ok(without_path.trim_end_matches('.').to_string())
    }

    /// 查询 DNS 记录
    pub async fn lookup(config: &DnsLookupConfig) -> AppResult<DnsLookupResult> {
        let domain = match Self::normalize_domain(&config.domain) {
            Ok(domain) => domain,
            Err(error) => {
                return Ok(DnsLookupResult {
                    success: false,
                    domain: config.domain.trim().to_string(),
                    record_type: config.record_type.as_str().to_string(),
                    status: 0,
                    authoritative: false,
                    answers: Vec::new(),
                    raw_response: String::new(),
                    error: Some(error),
                });
            }
        };

        if domain.is_empty() {
            return Ok(DnsLookupResult {
                success: false,
                domain: String::new(),
                record_type: config.record_type.as_str().to_string(),
                status: 0,
                authoritative: false,
                answers: Vec::new(),
                raw_response: String::new(),
                error: Some("请输入域名".to_string()),
            });
        }

        let client = Client::builder()
            .timeout(Duration::from_secs(8))
            .build()
            .map_err(|error| AppError::NetworkRequestFailed(format!("HTTP 客户端创建失败: {}", error)))?;

        let response = client
            .get("https://dns.google/resolve")
            .query(&[
                ("name", domain.clone()),
                ("type", config.record_type.as_str().to_string()),
            ])
            .send()
            .await
            .map_err(|error| AppError::NetworkRequestFailed(format!("DNS 查询失败: {}", error)))?;

        let body = response
            .text()
            .await
            .map_err(|error| AppError::NetworkRequestFailed(format!("读取 DNS 响应失败: {}", error)))?;

        dns_lookup_tool::parse_dns_lookup_response(&domain, config.record_type.as_str(), &body)
    }
}
