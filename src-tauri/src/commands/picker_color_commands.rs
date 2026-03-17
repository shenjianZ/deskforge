//! 取色器命令
//!
//! 提供完整的屏幕取色功能（使用透明遮罩窗口方案）
//!
//! # 架构设计
//!
//! - **后端（Rust）**：负责窗口创建/销毁和屏幕取色
//! - **前端（HTML/CSS/JS）**：负责光标样式和用户交互
//!
//! # 优势
//!
//! 使用透明全屏遮罩 + CSS 光标，完美解决 Windows 系统光标竞争问题，
//! 避免了传统的 SetCursor API 与系统的 race condition。

use std::thread;
use std::time::Duration;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct ScreenRegionRgba {
    pub width: i32,
    pub height: i32,
    /// RGBA 字节数组（长度 = width * height * 4）
    pub data: Vec<u8>,
    /// 中心点颜色（从 data 直接计算），便于前端展示
    pub center: crate::models::color::RgbInfo,
    pub center_hex: String,
}

/// 预热取色器窗口（隐藏创建）
///
/// 目的：避免第一次显示 WebView 时的“白屏闪一下”（WebView 首帧默认白底/初始化抖动）。
pub(crate) fn prewarm_picker_window(app: &AppHandle) -> Result<(), String> {
    use tauri::WebviewWindowBuilder;

    if app.get_webview_window("picker_overlay").is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        "picker_overlay",
        tauri::WebviewUrl::App("picker.html".into()),
    )
    .title("取色器")
    .fullscreen(true)
    .transparent(true)
    .always_on_top(true)
    .decorations(false)
    .skip_taskbar(true)
    .resizable(false)
    // 关键：先不可见创建，等真正开始取色时再 show
    .visible(false)
    // 尽可能早地把背景设为透明，降低首帧白底概率
    .initialization_script(
        r#"
        try {
          document.documentElement.style.background = 'transparent';
          document.body && (document.body.style.background = 'transparent');
        } catch (_) {}
        "#,
    )
    .build()
    .map_err(|e| format!("预热取色器窗口失败: {}", e))?;

    Ok(())
}

/// 启动取色器（推荐使用 ⭐）
///
/// 打开透明全屏遮罩窗口，光标由前端 CSS 控制。
///
/// # 工作流程
///
/// 1. 后端隐藏主窗口
/// 2. 后端创建全屏透明遮罩窗口
/// 3. **前端通过 CSS 设置 `cursor: crosshair` 控制光标**
/// 4. 用户点击任意位置，前端调用 `pick_color_at_point` 取色
/// 5. 取色完成后前端调用 `close_picker_window` 关闭遮罩窗口
///
/// # 参数
///
/// * `app` - Tauri 应用句柄
///
/// # 前端实现示例
///
/// picker.html:
/// ```html
/// <style>
/// body {
///   width: 100vw;
///   height: 100vh;
///   background-color: transparent;
///   cursor: crosshair; /* 关键！前端控制光标 */
/// }
/// </style>
/// <script>
/// async function handleClick(e) {
///   const color = await invoke('pick_color_at_point', {
///     x: e.clientX,
///     y: e.clientY
///   });
///   console.log('HEX:', color.hex);
///   await invoke('close_picker_window');
/// }
/// document.addEventListener('click', handleClick);
/// </script>
/// ```
#[tauri::command]
pub async fn start_color_picker(app: AppHandle) -> Result<(), String> {
    // 先隐藏主窗口
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.hide().map_err(|e| e.to_string())?;
    }

    // 等待窗口完全隐藏
    thread::sleep(Duration::from_millis(150));

    // 打开透明遮罩窗口
    open_picker_window(app).await?;

    Ok(())
}

/// 打开取色器遮罩窗口（内部辅助函数）
///
/// # 参数
///
/// * `app` - Tauri 应用句柄
///
/// # 返回
///
/// 返回成功或错误信息
pub(crate) async fn open_picker_window(app: AppHandle) -> Result<(), String> {
    use tauri::WebviewWindowBuilder;

    // 检查窗口是否已存在
    if let Some(existing) = app.get_webview_window("picker_overlay") {
        // 复用已存在窗口：避免频繁 close/build 引起的白屏闪烁
        existing
            .show()
            .and_then(|_| existing.set_focus())
            .map_err(|e| format!("显示取色器窗口失败: {}", e))?;
        return Ok(());
    }

    // 创建全屏透明遮罩窗口
    let picker_window = WebviewWindowBuilder::new(
        &app,
        "picker_overlay",
        tauri::WebviewUrl::App("picker.html".into()),
    )
    .title("取色器")
    .fullscreen(true)
    .transparent(true)
    .always_on_top(true)
    .decorations(false)
    .skip_taskbar(true)
    .resizable(false)
    // 先不可见创建，再显式 show（降低首帧白底闪烁）
    .visible(false)
    .initialization_script(
        r#"
        try {
          document.documentElement.style.background = 'transparent';
          document.body && (document.body.style.background = 'transparent');
        } catch (_) {}
        "#,
    )
    .build()
    .map_err(|e| format!("创建取色器窗口失败: {}", e))?;

    // 显式 show + focus，确保在某些系统上立即可见
    picker_window
        .show()
        .and_then(|_| picker_window.set_focus())
        .map_err(|e| format!("显示取色器窗口失败: {}", e))?;

    Ok(())
}

/// 关闭取色器遮罩窗口
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// await invoke('close_picker_window');
/// ```
#[tauri::command]
pub async fn close_picker_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("picker_overlay") {
        // 不 close：只 hide，避免窗口销毁/重建导致的白屏闪烁
        // 先隐藏遮罩窗口，再恢复主窗口，过渡更自然
        window
            .hide()
            .map_err(|e| format!("隐藏取色器窗口失败: {}", e))?;

        // 恢复主窗口
        if let Some(main_window) = app.get_webview_window("main") {
            main_window
                .show()
                .and_then(|_| main_window.set_focus())
                .map_err(|e| format!("显示主窗口失败: {}", e))?;
        }
    }
    Ok(())
}

/// 在指定坐标取色
///
/// # 参数
///
/// * `x` - 屏幕 X 坐标
/// * `y` - 屏幕 Y 坐标
///
/// # 返回
///
/// 返回颜色信息
#[tauri::command]
pub async fn pick_color_at_point(
    x: i32,
    y: i32,
) -> Result<crate::models::color::ColorInfo, String> {
    let (r, g, b) = crate::utils::screen::WindowsScreen::get_pixel_color(x, y)
        .map_err(|e| e.to_string())?;

    Ok(crate::models::color::ColorInfo::new(r, g, b, x, y))
}

/// 获取“最上层应用”的颜色（排除取色遮罩自身的影响）
///
/// 在 Windows 上，如果遮罩窗口位于最顶层，`GetPixel` 读到的是**合成后的颜色**，
/// 即可能包含遮罩的透明叠加，从而导致取色偏暗/偏差。
///
/// 这里的策略是：先隐藏遮罩窗口，等待一帧左右让桌面合成刷新，再读取屏幕像素。
#[tauri::command]
pub async fn pick_color_at_point_topmost(
    app: AppHandle,
    x: i32,
    y: i32,
) -> Result<crate::models::color::ColorInfo, String> {
    // 先隐藏遮罩窗口（不 close，避免白屏闪烁）
    if let Some(overlay) = app.get_webview_window("picker_overlay") {
        let _ = overlay.hide();
    }

    // 给桌面合成一点时间刷新（过短可能还会读到遮罩叠加结果）
    thread::sleep(Duration::from_millis(35));

    let (r, g, b) = crate::utils::screen::WindowsScreen::get_pixel_color(x, y)
        .map_err(|e| e.to_string())?;

    Ok(crate::models::color::ColorInfo::new(r, g, b, x, y))
}

/// 捕获屏幕区域像素（用于前端放大镜）
#[tauri::command]
pub async fn capture_screen_region_rgba(
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<ScreenRegionRgba, String> {
    let data = crate::utils::screen::WindowsScreen::capture_region_rgba(x, y, width, height)
        .map_err(|e| e.to_string())?;

    let cx = width / 2;
    let cy = height / 2;
    let idx = ((cy as usize) * (width as usize) + (cx as usize)) * 4;
    let r = data[idx];
    let g = data[idx + 1];
    let b = data[idx + 2];

    Ok(ScreenRegionRgba {
        width,
        height,
        data,
        center: crate::models::color::RgbInfo { r, g, b },
        center_hex: format!("#{:02X}{:02X}{:02X}", r, g, b),
    })
}

/// RGB 转 HSL 命令
///
/// 将 RGB 颜色值转换为 HSL 颜色值
///
/// # 参数
///
/// * `r` - 红色分量 (0-255)
/// * `g` - 绿色分量 (0-255)
/// * `b` - 蓝色分量 (0-255)
///
/// # 返回
///
/// 返回 HSL 颜色值
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// const hsl = await invoke('rgb_to_hsl', { r: 255, g: 0, b: 0 });
/// console.log(hsl); // { h: 0, s: 100, l: 50 }
/// ```
#[tauri::command]
pub fn rgb_to_hsl(r: u8, g: u8, b: u8) -> crate::models::color::HslInfo {
    crate::utils::color_conversion::rgb_to_hsl(r, g, b)
}
