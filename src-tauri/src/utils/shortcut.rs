//! 全局快捷键工具
//!
//! 将快捷键注册逻辑从 `lib.rs` 拆分出来，避免入口文件过于拥挤。

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// 注册全局快捷键
///
/// - `Alt+Space`: 切换主窗口显示/隐藏
pub fn register_global_shortcuts(app: &tauri::App) -> Result<(), String> {
    let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    let app_handle = app.handle().clone();
    let is_processing = Arc::new(AtomicBool::new(false));
    let is_processing_clone = is_processing.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app_handle, _shortcut, event| {
            // 忽略按键释放事件
            if event.state == ShortcutState::Released {
                return;
            }

            // 防止重复触发
            if is_processing_clone.load(Ordering::SeqCst) {
                return;
            }
            is_processing_clone.store(true, Ordering::SeqCst);

            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.is_visible().and_then(|is_visible| {
                    if is_visible {
                        window.hide()
                    } else {
                        window.show().and_then(|_| window.set_focus())
                    }
                });
            }

            // 延迟重置处理标志，防止快速重复触发
            let is_processing_reset = is_processing_clone.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                is_processing_reset.store(false, Ordering::SeqCst);
            });
        })
        .map_err(|e| format!("注册全局快捷键失败: {}", e))?;

    println!("全局快捷键 Alt+Space 注册成功");
    Ok(())
}

