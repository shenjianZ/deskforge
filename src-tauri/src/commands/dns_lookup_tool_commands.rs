//! DNS 查询工具命令
//!
//! 定义 DNS 查询相关的 Tauri 命令

use crate::models::dns_lookup_tool::{DnsLookupConfig, DnsLookupResult};
use crate::services::dns_lookup_tool_service::DnsLookupToolService;

/// 查询 DNS 记录
#[tauri::command]
pub async fn lookup_dns_records(config: DnsLookupConfig) -> DnsLookupResult {
    DnsLookupToolService::lookup(&config)
        .await
        .unwrap_or_else(|error| DnsLookupResult {
            success: false,
            domain: config.domain.clone(),
            record_type: config.record_type.as_str().to_string(),
            status: 0,
            authoritative: false,
            answers: Vec::new(),
            raw_response: String::new(),
            error: Some(error.to_string()),
        })
}
