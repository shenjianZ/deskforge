//! 公网 IP 工具相关数据模型
//!
//! 定义公网 IP 查询工具使用的数据结构

use serde::{Deserialize, Serialize};

/// 公网 IP 查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicIpInfo {
    /// 当前出口 IP 地址（优先 IPv6，兼容 IPv4）
    pub current_ip: Option<String>,

    /// IPv4 地址
    pub ipv4: Option<String>,

    /// IPv6 地址
    pub ipv6: Option<String>,

    /// 国家
    pub country: Option<String>,

    /// 地区
    pub region: Option<String>,

    /// 城市
    pub city: Option<String>,

    /// 时区
    pub timezone: Option<String>,

    /// ASN
    pub asn: Option<String>,

    /// 组织
    pub organization: Option<String>,

    /// ISP
    pub isp: Option<String>,
}
