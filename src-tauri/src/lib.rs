//! Tauri 应用入口
//!
//! 提供应用初始化和模块组装功能

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WindowEvent,
};

// 模块声明
mod commands;
mod error;
mod infra;
mod models;
mod platforms;
mod repository;
mod services;
mod utils;

// 重新导出常用类型
pub use error::{AppError, AppResult};
use services::window_service::{TrayMenuState, WindowService};

const SHOW_MENU_ID: &str = "show";
const HIDE_MENU_ID: &str = "hide";
const TOGGLE_MENU_ID: &str = "toggle";
const QUIT_MENU_ID: &str = "quit";

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    let _ = WindowService::show_main_window(app);
}

fn hide_main_window<R: Runtime>(app: &AppHandle<R>) {
    let _ = WindowService::hide_main_window_to_tray(app);
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    let _ = WindowService::toggle_main_window(app);
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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = WindowService::hide_main_window_to_tray(&window.app_handle());
                }
            }
        })
        .setup(|app| {
            let show_item = MenuItemBuilder::with_id(SHOW_MENU_ID, "显示主窗口").build(app)?;
            let hide_item = MenuItemBuilder::with_id(HIDE_MENU_ID, "隐藏窗口").build(app)?;
            let toggle_item =
                MenuItemBuilder::with_id(TOGGLE_MENU_ID, "切换显示/隐藏").build(app)?;
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
                .on_menu_event(|app, event| match event.id().as_ref() {
                    SHOW_MENU_ID => show_main_window(app),
                    HIDE_MENU_ID => hide_main_window(app),
                    TOGGLE_MENU_ID => toggle_main_window(app),
                    QUIT_MENU_ID => app.exit(0),
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            tray_builder.build(app)?;
            WindowService::sync_tray_menu_state(app.handle());

            // 预热取色器窗口：避免第一次取色出现“白屏闪一下”
            // 窗口会以 hidden 状态创建，不会影响用户体验
            let _ = commands::picker_color_commands::prewarm_picker_window(app.handle());

            if let Err(error) = utils::shortcut::register_global_shortcuts(app) {
                eprintln!("全局快捷键注册失败，将继续启动应用: {}", error);
            }

            let scheduler_state =
                services::scheduler_service::SchedulerService::initialize(app.handle())?;
            app.manage(scheduler_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::api_debugger_commands::execute_api_request,
            commands::base64_tool_commands::encode_base64,
            commands::base64_tool_commands::decode_base64,
            commands::base64_tool_commands::validate_base64,
            commands::base64_tool_commands::encode_image_to_base64,
            commands::base64_tool_commands::decode_base64_to_image,
            commands::base64_tool_commands::save_base64_image,
            commands::datetime_tool_commands::timestamp_to_datetime,
            commands::datetime_tool_commands::datetime_to_timestamp,
            commands::dns_lookup_tool_commands::lookup_dns_records,
            commands::generator_commands::generate_uuid,
            commands::generator_commands::generate_nanoid,
            commands::generator_commands::generate_random_value,
            commands::generator_commands::generate_password,
            commands::generator_commands::generate_api_key,
            commands::generator_commands::generate_hash,
            commands::generator_commands::generate_jwt_mock,
            commands::generator_commands::decode_jwt_mock,
            commands::generator_commands::generate_user_persona,
            commands::generator_commands::generate_user_contact,
            commands::generator_commands::generate_user_address,
            commands::generator_commands::generate_user_company,
            commands::generator_commands::generate_identity_document,
            commands::generator_commands::generate_payment_card,
            commands::generator_commands::generate_user_profile,
            commands::public_ip_tool_commands::get_public_ip_info,
            commands::whois_tool_commands::lookup_whois,
            // window 窗口操作
            commands::window_commands::toggle_window,
            commands::window_commands::hide_window,
            commands::window_commands::show_window,
            commands::window_commands::get_main_window_state,
            commands::window_commands::toggle_maximize_main_window,
            // 定时中心命令
            commands::scheduler_commands::list_scheduler_tasks,
            commands::scheduler_commands::create_scheduler_task,
            commands::scheduler_commands::update_scheduler_task,
            commands::scheduler_commands::delete_scheduler_task,
            commands::scheduler_commands::toggle_scheduler_task,
            commands::scheduler_commands::list_scheduler_logs,
            commands::scheduler_commands::delete_scheduler_log,
            commands::scheduler_commands::clear_scheduler_logs,
            commands::scheduler_commands::run_scheduler_task_now,
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
            // 图片转换命令
            commands::image_converter_commands::get_image_source_info,
            commands::image_converter_commands::generate_image_conversion_preview,
            commands::image_converter_commands::save_converted_image,
            commands::image_converter_commands::generate_image_compression_preview,
            commands::image_converter_commands::save_compressed_image,
            commands::image_converter_commands::generate_image_crop_preview,
            commands::image_converter_commands::save_cropped_image,
            commands::image_converter_commands::generate_image_resize_preview,
            commands::image_converter_commands::save_resized_image,
            commands::markdown_preview_commands::resolve_markdown_asset,
            commands::markdown_preview_commands::resolve_markdown_pdf_font,
            commands::markdown_preview_commands::save_markdown_export,
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
