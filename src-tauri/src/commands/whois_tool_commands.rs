//! WHOIS 查询工具命令
//!
//! 定义 WHOIS 查询相关的 Tauri 命令

use crate::models::whois_tool::{WhoisLookupConfig, WhoisLookupResult};
use crate::services::whois_tool_service::WhoisToolService;

/// 查询域名注册信息
#[tauri::command]
pub async fn lookup_whois(config: WhoisLookupConfig) -> WhoisLookupResult {
    WhoisToolService::lookup(&config)
        .await
        .unwrap_or_else(|error| WhoisLookupResult {
            success: false,
            domain: config.domain.clone(),
            registrar: None,
            handle: None,
            statuses: Vec::new(),
            nameservers: Vec::new(),
            events: Vec::new(),
            raw_response: String::new(),
            error: Some(error.to_string()),
        })
}
