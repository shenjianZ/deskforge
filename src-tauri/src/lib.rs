//! Tauri 应用入口
//!
//! 提供应用初始化和模块组装功能

// 模块声明
mod commands;
mod error;
mod models;
mod platforms;
mod services;
mod utils;

// 重新导出常用类型
pub use error::{AppError, AppResult};

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
        .setup(|app| {
            // 预热取色器窗口：避免第一次取色出现“白屏闪一下”
            // 窗口会以 hidden 状态创建，不会影响用户体验
            let _ = commands::picker_color_commands::prewarm_picker_window(app.handle());

            utils::shortcut::register_global_shortcuts(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
