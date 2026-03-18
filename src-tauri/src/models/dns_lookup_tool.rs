//! DNS 查询工具相关数据模型
//!
//! 定义 DNS 查询工具使用的数据结构

use serde::{Deserialize, Serialize};

/// DNS 记录类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DnsRecordType {
    /// A
    #[serde(rename = "A")]
    A,
    /// AAAA
    #[serde(rename = "AAAA")]
    Aaaa,
    /// CNAME
    #[serde(rename = "CNAME")]
    Cname,
    /// MX
    #[serde(rename = "MX")]
    Mx,
    /// TXT
    #[serde(rename = "TXT")]
    Txt,
    /// NS
    #[serde(rename = "NS")]
    Ns,
}

impl DnsRecordType {
    /// 返回记录类型字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::A => "A",
            Self::Aaaa => "AAAA",
            Self::Cname => "CNAME",
            Self::Mx => "MX",
            Self::Txt => "TXT",
            Self::Ns => "NS",
        }
    }
}

/// DNS 查询配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsLookupConfig {
    /// 域名
    pub domain: String,

    /// 记录类型
    pub record_type: DnsRecordType,
}

/// DNS 记录结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsLookupRecord {
    /// 名称
    pub name: String,

    /// 记录类型
    pub record_type: String,

    /// TTL
    pub ttl: u32,

    /// 数据
    pub data: String,
}

/// DNS 查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsLookupResult {
    /// 是否成功
    pub success: bool,

    /// 查询域名
    pub domain: String,

    /// 查询记录类型
    pub record_type: String,

    /// 状态码
    pub status: u32,

    /// 是否携带权威答案
    pub authoritative: bool,

    /// 查询结果列表
    pub answers: Vec<DnsLookupRecord>,

    /// 原始响应 JSON
    pub raw_response: String,

    /// 错误信息
    pub error: Option<String>,
}
