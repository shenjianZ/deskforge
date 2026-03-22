//! 公网 IP 工具服务
//!
//! 提供公网 IP 查询功能的核心业务逻辑

use std::time::Duration;

use reqwest::Client;

use crate::{
    error::{AppError, AppResult},
    models::public_ip_tool::PublicIpInfo,
    utils::public_ip_tool,
};

/// 公网 IP 工具服务
pub struct PublicIpToolService;

impl PublicIpToolService {
    async fn fetch_ip_from_endpoint(client: &Client, url: &str) -> Option<String> {
        let response = client.get(url).send().await.ok()?;
        let body = response.text().await.ok()?;
        public_ip_tool::parse_ipify_response(&body).ok()
    }

    /// 查询公网 IP 与基础归属信息
    pub async fn fetch_public_ip_info() -> AppResult<PublicIpInfo> {
        let client = Client::builder()
            .timeout(Duration::from_secs(8))
            .build()
            .map_err(|error| {
                AppError::NetworkRequestFailed(format!("HTTP 客户端创建失败: {}", error))
            })?;

        let current_ip =
            Self::fetch_ip_from_endpoint(&client, "https://api64.ipify.org?format=json").await;
        let ipv4 = Self::fetch_ip_from_endpoint(&client, "https://api.ipify.org?format=json").await;
        let ipv6 =
            Self::fetch_ip_from_endpoint(&client, "https://api6.ipify.org?format=json").await;

        let geo_target_ip = current_ip
            .clone()
            .or_else(|| ipv4.clone())
            .or_else(|| ipv6.clone())
            .ok_or_else(|| {
                AppError::NetworkRequestFailed("未能获取任何公网 IP 地址".to_string())
            })?;

        let geo_response = client
            .get(format!("https://ipwho.is/{}", geo_target_ip))
            .send()
            .await
            .map_err(|error| {
                AppError::NetworkRequestFailed(format!("获取归属信息失败: {}", error))
            })?;

        let geo_body = geo_response.text().await.map_err(|error| {
            AppError::NetworkRequestFailed(format!("读取归属信息响应失败: {}", error))
        })?;

        let mut info = public_ip_tool::parse_ipwhois_response(geo_target_ip, &geo_body)?;
        info.current_ip = current_ip;
        info.ipv4 = ipv4;
        info.ipv6 = ipv6;
        Ok(info)
    }
}
