//! Tauri 应用入口
//!
//! 提供应用初始化和模块组装功能

use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WindowEvent,
};

// 模块声明
mod commands;
mod error;
mod models;
mod platforms;
mod services;
mod utils;

// 重新导出常用类型
pub use error::{AppError, AppResult};

const SHOW_MENU_ID: &str = "show";
const HIDE_MENU_ID: &str = "hide";
const TOGGLE_MENU_ID: &str = "toggle";
const QUIT_MENU_ID: &str = "quit";

struct TrayMenuState<R: Runtime> {
    show_item: MenuItem<R>,
    hide_item: MenuItem<R>,
}

fn sync_tray_menu_state<R: Runtime>(app: &AppHandle<R>) {
    let Some(state) = app.try_state::<TrayMenuState<R>>() else {
        return;
    };

    let is_visible = app
        .get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false);

    let _ = state.show_item.set_enabled(!is_visible);
    let _ = state.hide_item.set_enabled(is_visible);
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }

    sync_tray_menu_state(app);
}

fn hide_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    sync_tray_menu_state(app);
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.is_visible().and_then(|is_visible| {
            if is_visible {
                window.hide()
            } else {
                window.unminimize()?;
                window.show()?;
                window.set_focus()
            }
        });
    }

    sync_tray_menu_state(app);
}

/// 运行 Tauri 应用
///
/// 初始化应用、注册插件、设置全局快捷键并启动应用
///
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                    sync_tray_menu_state(&window.app_handle());
                }
            }
        })
        .setup(|app| {
            let show_item = MenuItemBuilder::with_id(SHOW_MENU_ID, "显示主窗口").build(app)?;
            let hide_item = MenuItemBuilder::with_id(HIDE_MENU_ID, "隐藏窗口").build(app)?;
            let toggle_item = MenuItemBuilder::with_id(TOGGLE_MENU_ID, "切换显示/隐藏").build(app)?;
            let quit_item = MenuItemBuilder::with_id(QUIT_MENU_ID, "退出应用").build(app)?;
            app.manage(TrayMenuState {
                show_item: show_item.clone(),
                hide_item: hide_item.clone(),
            });
            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&hide_item)
                .item(&toggle_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .menu(&tray_menu)
                .tooltip("DeskForge\n左键单击可切换主窗口")
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        SHOW_MENU_ID => show_main_window(app),
                        HIDE_MENU_ID => hide_main_window(app),
                        TOGGLE_MENU_ID => toggle_main_window(app),
                        QUIT_MENU_ID => app.exit(0),
                        _ => {}
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            tray_builder.build(app)?;
            sync_tray_menu_state(app.handle());

            // 预热取色器窗口：避免第一次取色出现“白屏闪一下”
            // 窗口会以 hidden 状态创建，不会影响用户体验
            let _ = commands::picker_color_commands::prewarm_picker_window(app.handle());

            if let Err(error) = utils::shortcut::register_global_shortcuts(app) {
                eprintln!("全局快捷键注册失败，将继续启动应用: {}", error);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::api_debugger_commands::execute_api_request,
            // window 窗口操作
            commands::window_commands::toggle_window,
            commands::window_commands::hide_window,
            commands::window_commands::show_window,
            // 取色器命令
            commands::picker_color_commands::rgb_to_hsl,
            commands::picker_color_commands::start_color_picker,
            commands::picker_color_commands::close_picker_window,
            commands::picker_color_commands::pick_color_at_point,
            commands::picker_color_commands::pick_color_at_point_topmost,
            commands::picker_color_commands::capture_screen_region_rgba,
            // JSON 格式化命令
            commands::json_format_commands::format_json,
            commands::json_format_commands::validate_json,
            commands::json_format_commands::compact_json,
            // HTML 格式化命令
            commands::html_format_commands::format_html,
            commands::html_format_commands::validate_html,
            commands::html_format_commands::compact_html,
            // XML 格式化命令
            commands::xml_format_commands::format_xml,
            commands::xml_format_commands::validate_xml,
            commands::xml_format_commands::compact_xml,
            // 代码格式化命令
            commands::code_format_commands::format_code,
            commands::code_format_commands::validate_code,
            // 操作系统信息命令
            commands::system_info_commands::get_system_info,
            // 二维码生成命令
            commands::qrcode_commands::generate_qr_preview,
            commands::qrcode_commands::generate_qr_file,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
