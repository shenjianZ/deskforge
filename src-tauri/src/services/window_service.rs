//! 窗口服务
//!
//! 提供主窗口显示状态编排，统一快捷键、托盘和标题栏按钮行为。

use serde::Serialize;
use tauri::{menu::MenuItem, AppHandle, Manager, Runtime, WebviewWindow};

use crate::error::{AppError, AppResult};

/// 主窗口对用户可感知的显示状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MainWindowVisibilityState {
    Visible,
    HiddenToTray,
}

/// 前端可消费的主窗口状态
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MainWindowState {
    pub visible: bool,
    pub minimized: bool,
    pub maximized: bool,
    pub focused: bool,
}

pub struct TrayMenuState<R: Runtime> {
    pub show_item: MenuItem<R>,
    pub hide_item: MenuItem<R>,
}

/// 窗口服务
pub struct WindowService;

impl WindowService {
    fn main_window<R: Runtime>(app: &AppHandle<R>) -> AppResult<WebviewWindow<R>> {
        app.get_webview_window("main")
            .ok_or_else(|| AppError::WindowOperationFailed("未找到主窗口".to_string()))
    }

    fn map_window_error<T>(result: tauri::Result<T>) -> AppResult<T> {
        result.map_err(|e| AppError::WindowOperationFailed(e.to_string()))
    }

    pub fn get_main_window_visibility_state<R: Runtime>(
        app: &AppHandle<R>,
    ) -> AppResult<MainWindowVisibilityState> {
        let window = Self::main_window(app)?;
        let is_visible = Self::map_window_error(window.is_visible())?;
        let is_minimized = Self::map_window_error(window.is_minimized())?;

        if is_visible && !is_minimized {
            Ok(MainWindowVisibilityState::Visible)
        } else {
            Ok(MainWindowVisibilityState::HiddenToTray)
        }
    }

    pub fn get_main_window_state<R: Runtime>(app: &AppHandle<R>) -> AppResult<MainWindowState> {
        let window = Self::main_window(app)?;
        let visible = Self::map_window_error(window.is_visible())?;
        let minimized = Self::map_window_error(window.is_minimized())?;
        let maximized = Self::map_window_error(window.is_maximized())?;
        let focused = Self::map_window_error(window.is_focused())?;

        Ok(MainWindowState {
            visible: visible && !minimized,
            minimized,
            maximized,
            focused,
        })
    }

    pub fn sync_tray_menu_state<R: Runtime>(app: &AppHandle<R>) {
        let Some(state) = app.try_state::<TrayMenuState<R>>() else {
            return;
        };

        let is_visible = matches!(
            Self::get_main_window_visibility_state(app),
            Ok(MainWindowVisibilityState::Visible)
        );

        let _ = state.show_item.set_enabled(!is_visible);
        let _ = state.hide_item.set_enabled(is_visible);
    }

    pub fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
        match Self::get_main_window_visibility_state(app)? {
            MainWindowVisibilityState::Visible => Self::hide_main_window_to_tray(app),
            MainWindowVisibilityState::HiddenToTray => Self::show_main_window(app),
        }
    }

    pub fn hide_main_window_to_tray<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
        let window = Self::main_window(app)?;

        if Self::map_window_error(window.is_minimized())? {
            Self::map_window_error(window.unminimize())?;
        }

        let result = Self::map_window_error(window.hide());
        Self::sync_tray_menu_state(app);
        result
    }

    pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
        let window = Self::main_window(app)?;

        Self::map_window_error(window.show())?;
        Self::map_window_error(window.unminimize())?;
        let result = Self::map_window_error(window.set_focus());
        Self::sync_tray_menu_state(app);
        result
    }

    pub fn toggle_maximize_main_window<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
        let window = Self::main_window(app)?;
        if Self::map_window_error(window.is_maximized())? {
            Self::map_window_error(window.unmaximize())
        } else {
            Self::map_window_error(window.maximize())
        }
    }
}
