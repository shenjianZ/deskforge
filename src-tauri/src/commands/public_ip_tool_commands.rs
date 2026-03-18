//! 公网 IP 工具命令
//!
//! 定义公网 IP 查询相关的 Tauri 命令

use crate::models::public_ip_tool::PublicIpInfo;
use crate::services::public_ip_tool_service::PublicIpToolService;

/// 获取公网 IP 与归属信息
#[tauri::command]
pub async fn get_public_ip_info() -> Result<PublicIpInfo, String> {
    PublicIpToolService::fetch_public_ip_info()
        .await
        .map_err(|error| error.to_string())
}
