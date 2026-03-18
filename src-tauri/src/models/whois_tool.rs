//! WHOIS 查询工具相关数据模型
//!
//! 定义 WHOIS/RDAP 查询工具使用的数据结构

use serde::{Deserialize, Serialize};

/// WHOIS 查询配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhoisLookupConfig {
    /// 域名
    pub domain: String,
}

/// 域名事件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhoisEventInfo {
    /// 事件类型
    pub event_action: String,

    /// 事件时间
    pub event_date: String,
}

/// WHOIS 查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhoisLookupResult {
    /// 是否成功
    pub success: bool,

    /// 域名
    pub domain: String,

    /// 注册商
    pub registrar: Option<String>,

    /// 注册局域名 ID
    pub handle: Option<String>,

    /// 状态列表
    pub statuses: Vec<String>,

    /// 名称服务器列表
    pub nameservers: Vec<String>,

    /// 关键事件列表
    pub events: Vec<WhoisEventInfo>,

    /// 原始响应 JSON
    pub raw_response: String,

    /// 错误信息
    pub error: Option<String>,
}
