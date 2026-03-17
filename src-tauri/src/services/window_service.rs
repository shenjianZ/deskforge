//! 窗口服务
//!
//! 提供窗口管理相关的业务逻辑

use tauri::Window;
use crate::error::{AppError, AppResult};

/// 窗口服务
///
/// 提供窗口显示、隐藏和切换等管理功能
pub struct WindowService;

impl WindowService {
    /// 切换窗口显示/隐藏
    ///
    /// 根据窗口当前状态切换显示或隐藏
    ///
    /// # 参数
    ///
    /// * `window` - Tauri 窗口引用
    ///
    /// # 行为
    ///
    /// - 如果窗口当前可见，则隐藏窗口
    /// - 如果窗口当前隐藏，则显示窗口并聚焦
    ///
    /// # 错误
    ///
    /// 窗口操作失败时返回 `AppError::WindowOperationFailed`
    pub fn toggle_window(window: &Window) -> AppResult<()> {
        let is_visible = window.is_visible()
            .map_err(|e| AppError::WindowOperationFailed(e.to_string()))?;

        if is_visible {
            Self::hide_window(window)?;
        } else {
            Self::show_window(window)?;
        }

        Ok(())
    }

    /// 隐藏窗口
    ///
    /// 将窗口隐藏，使其不再可见
    ///
    /// # 参数
    ///
    /// * `window` - Tauri 窗口引用
    ///
    /// # 错误
    ///
    /// 窗口操作失败时返回 `AppError::WindowOperationFailed`
    pub fn hide_window(window: &Window) -> AppResult<()> {
        window.hide()
            .map_err(|e| AppError::WindowOperationFailed(e.to_string()))
    }

    /// 显示窗口并聚焦
    ///
    /// 显示窗口并将其设置为焦点窗口
    ///
    /// # 参数
    ///
    /// * `window` - Tauri 窗口引用
    ///
    /// # 行为
    ///
    /// - 显示窗口
    /// - 将窗口设置为焦点窗口，用户可以直接与之交互
    ///
    /// # 错误
    ///
    /// 窗口操作失败时返回 `AppError::WindowOperationFailed`
    pub fn show_window(window: &Window) -> AppResult<()> {
        window.show()
            .and_then(|_| window.set_focus())
            .map_err(|e| AppError::WindowOperationFailed(e.to_string()))
    }
}

