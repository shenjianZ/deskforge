//! 系统信息命令
//!
//! 定义系统信息相关的 Tauri 命令

use crate::models::system_info::SystemInfo;
use crate::services::system_info_service::SystemInfoService;

/// 获取系统信息命令
///
/// Tauri 命令，用于从前端调用系统信息查询功能
///
/// # 返回
///
/// 返回包含所有系统信息的结构体
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// const info = await invoke('get_system_info');
/// console.log(info.os.name);        // "Windows"
/// console.log(info.cpu.model);      // "Intel Core i7..."
/// console.log(info.memory.total_gb); // 16.0
/// ```
#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    SystemInfoService::get_system_info().map_err(|e| e.to_string())
}
