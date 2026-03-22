//! 窗口命令
//!
//! 定义窗口管理相关的 Tauri 命令

use tauri::{Manager, Window};

use crate::services::window_service::WindowService;

/// 切换窗口显示/隐藏命令
///
/// 根据窗口当前状态切换显示或隐藏
///
/// # 参数
///
/// * `window` - Tauri 窗口对象，自动由框架注入
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// await invoke('toggle_window');
/// ```
#[tauri::command]
pub fn toggle_window(window: Window) -> Result<(), String> {
    WindowService::toggle_main_window(&window.app_handle()).map_err(|e| e.to_string())
}

/// 隐藏窗口命令
///
/// 将窗口隐藏，使其不再可见
///
/// # 参数
///
/// * `window` - Tauri 窗口对象，自动由框架注入
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// await invoke('hide_window');
/// ```
#[tauri::command]
pub fn hide_window(window: Window) -> Result<(), String> {
    WindowService::hide_main_window_to_tray(&window.app_handle()).map_err(|e| e.to_string())
}

/// 显示窗口命令
///
/// 显示窗口并将其设置为焦点窗口
///
/// # 参数
///
/// * `window` - Tauri 窗口对象，自动由框架注入
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// await invoke('show_window');
/// ```
#[tauri::command]
pub fn show_window(window: Window) -> Result<(), String> {
    WindowService::show_main_window(&window.app_handle()).map_err(|e| e.to_string())
}

/// 获取主窗口状态
#[tauri::command]
pub fn get_main_window_state(
    window: Window,
) -> Result<crate::services::window_service::MainWindowState, String> {
    WindowService::get_main_window_state(&window.app_handle()).map_err(|e| e.to_string())
}

/// 切换主窗口最大化状态
#[tauri::command]
pub fn toggle_maximize_main_window(window: Window) -> Result<(), String> {
    WindowService::toggle_maximize_main_window(&window.app_handle()).map_err(|e| e.to_string())
}
