//! WHOIS 查询工具服务
//!
//! 提供基于 RDAP 的域名注册信息查询

use std::time::Duration;
use std::{
    io::{Read, Write},
    net::TcpStream,
};

use reqwest::{Client, Url};

use crate::{
    error::{AppError, AppResult},
    models::whois_tool::{WhoisLookupConfig, WhoisLookupResult},
    utils::whois_tool,
};

/// WHOIS 查询工具服务
pub struct WhoisToolService;

impl WhoisToolService {
    fn get_whois_server(domain: &str) -> Option<&'static str> {
        let tld = domain.rsplit('.').next()?.to_ascii_lowercase();
        match tld.as_str() {
            "cn" => Some("whois.cnnic.cn"),
            "com" | "net" => Some("whois.verisign-grs.com"),
            "org" => Some("whois.pir.org"),
            "info" => Some("whois.afilias.net"),
            _ => None,
        }
    }

    fn build_domain_candidates(domain: &str) -> Vec<String> {
        let labels = domain.split('.').collect::<Vec<_>>();
        if labels.len() <= 2 {
            return vec![domain.to_string()];
        }

        (0..labels.len().saturating_sub(1))
            .map(|index| labels[index..].join("."))
            .filter(|candidate| candidate.split('.').count() >= 2)
            .collect::<Vec<_>>()
    }

    fn normalize_domain(input: &str) -> Result<String, String> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err("请输入域名".to_string());
        }

        if trimmed.contains("://") {
            let url = Url::parse(trimmed).map_err(|error| format!("URL 解析失败: {}", error))?;
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

    fn lookup_via_raw_whois(domain: &str) -> AppResult<Option<WhoisLookupResult>> {
        let Some(server) = Self::get_whois_server(domain) else {
            return Ok(None);
        };

        let mut stream = TcpStream::connect((server, 43)).map_err(|error| {
            AppError::NetworkRequestFailed(format!("WHOIS TCP 连接失败: {}", error))
        })?;
        let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(10)));

        stream
            .write_all(format!("{}\r\n", domain).as_bytes())
            .map_err(|error| {
                AppError::NetworkRequestFailed(format!("WHOIS 查询发送失败: {}", error))
            })?;

        let mut body = String::new();
        stream.read_to_string(&mut body).map_err(|error| {
            AppError::NetworkRequestFailed(format!("WHOIS 响应读取失败: {}", error))
        })?;

        if body.trim().is_empty() {
            return Ok(None);
        }

        let lowered = body.to_ascii_lowercase();
        let is_negative = [
            "invalid parameter",
            "no match",
            "not found",
            "no entries found",
            "domain not found",
        ]
        .iter()
        .any(|pattern| lowered.contains(pattern));

        if is_negative {
            return Ok(None);
        }

        Ok(Some(whois_tool::parse_raw_whois_response(domain, &body)))
    }

    /// 查询域名注册信息
    pub async fn lookup(config: &WhoisLookupConfig) -> AppResult<WhoisLookupResult> {
        let domain = match Self::normalize_domain(&config.domain) {
            Ok(domain) => domain,
            Err(error) => {
                return Ok(WhoisLookupResult {
                    success: false,
                    domain: config.domain.trim().to_string(),
                    registrar: None,
                    handle: None,
                    statuses: Vec::new(),
                    nameservers: Vec::new(),
                    events: Vec::new(),
                    raw_response: String::new(),
                    error: Some(error),
                });
            }
        };

        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|error| {
                AppError::NetworkRequestFailed(format!("HTTP 客户端创建失败: {}", error))
            })?;

        let candidates = Self::build_domain_candidates(&domain);
        let mut last_error: Option<String> = None;

        for candidate in candidates {
            let response = client
                .get(format!("https://rdap.org/domain/{}", candidate))
                .header("accept", "application/rdap+json, application/json")
                .send()
                .await
                .map_err(|error| {
                    AppError::NetworkRequestFailed(format!("WHOIS 查询失败: {}", error))
                })?;

            let body = response.text().await.map_err(|error| {
                AppError::NetworkRequestFailed(format!("读取 WHOIS 响应失败: {}", error))
            })?;

            let trimmed = body.trim_start();
            if !(trimmed.starts_with('{') || trimmed.starts_with('[')) {
                last_error = Some("RDAP 服务返回了非 JSON 内容".to_string());
                continue;
            }

            match whois_tool::parse_whois_response(&candidate, &body) {
                Ok(result) if result.success => return Ok(result),
                Ok(result) => {
                    last_error = result.error;
                }
                Err(error) => {
                    last_error = Some(error.to_string());
                }
            }
        }

        for candidate in Self::build_domain_candidates(&domain) {
            if let Some(result) = Self::lookup_via_raw_whois(&candidate)? {
                return Ok(result);
            }
        }

        Ok(WhoisLookupResult {
            success: false,
            domain,
            registrar: None,
            handle: None,
            statuses: Vec::new(),
            nameservers: Vec::new(),
            events: Vec::new(),
            raw_response: String::new(),
            error: Some(last_error.unwrap_or_else(|| "未查询到可用的 WHOIS 信息".to_string())),
        })
    }
}
