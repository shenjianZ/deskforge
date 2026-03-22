use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread::{self, JoinHandle},
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

use crate::error::{AppError, AppResult};

const KEYCAST_LABEL: &str = "keycast_overlay";
const KEYCAST_CONFIG_FILE: &str = "keycast-overlay.json";
const DEFAULT_COMBO_WINDOW_MS: i64 = 500;

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;

#[derive(Clone)]
pub struct KeycastRuntime {
    is_listening: Arc<AtomicBool>,
    stop_flag: Arc<Mutex<Option<Arc<AtomicBool>>>>,
    worker: Arc<Mutex<Option<JoinHandle<()>>>>,
    overlay_config: Arc<Mutex<KeycastOverlayConfig>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct KeycastState {
    pub is_listening: bool,
    pub is_overlay_visible: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct KeycastDisplayPayload {
    pub text: String,
    pub keys: Vec<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycastOverlayConfig {
    pub x: f64,
    pub y: f64,
    #[serde(default = "default_combo_window_ms")]
    pub combo_window_ms: i64,
    #[serde(default = "default_text_color")]
    pub text_color: String,
    #[serde(default = "default_keycast_theme")]
    pub theme: String,
}

impl Default for KeycastRuntime {
    fn default() -> Self {
        Self {
            is_listening: Arc::new(AtomicBool::new(false)),
            stop_flag: Arc::new(Mutex::new(None)),
            worker: Arc::new(Mutex::new(None)),
            overlay_config: Arc::new(Mutex::new(KeycastOverlayConfig::default())),
        }
    }
}

impl Default for KeycastOverlayConfig {
    fn default() -> Self {
        Self {
            x: 24.0,
            y: 24.0,
            combo_window_ms: default_combo_window_ms(),
            text_color: default_text_color(),
            theme: "keycaps-dark".to_string(),
        }
    }
}

fn default_combo_window_ms() -> i64 {
    DEFAULT_COMBO_WINDOW_MS
}

fn default_keycast_theme() -> String {
    "keycaps-dark".to_string()
}

fn default_text_color() -> String {
    "".to_string()
}

pub struct KeycastService;

#[derive(Default)]
struct KeySequenceTracker {
    pending_modifiers: Vec<String>,
    pending_started_at: Option<i64>,
}

impl KeySequenceTracker {
    fn handle(
        &mut self,
        virtual_key: u16,
        is_down: bool,
        combo_window_ms: i64,
    ) -> Option<KeycastDisplayPayload> {
        let now = Utc::now().timestamp_millis();
        let key = key_name(virtual_key)?;
        if is_modifier_key(&key) {
            return if is_down {
                self.handle_modifier_down(key, now, combo_window_ms)
            } else {
                self.handle_modifier_up()
            };
        }

        if !is_down {
            return None;
        }

        if self.is_pending_stale(now, combo_window_ms) {
            self.pending_modifiers.clear();
            self.pending_started_at = None;
        }
        let mut keys = take_modifiers(&mut self.pending_modifiers);
        self.pending_started_at = None;
        keys.push(key);
        Some(build_payload(keys))
    }

    fn handle_modifier_down(
        &mut self,
        key: String,
        now: i64,
        combo_window_ms: i64,
    ) -> Option<KeycastDisplayPayload> {
        if self.is_pending_stale(now, combo_window_ms) {
            self.pending_modifiers.clear();
            self.pending_started_at = None;
        }
        if self.pending_modifiers.contains(&key) {
            return None;
        }
        self.pending_modifiers.push(key);
        self.pending_modifiers
            .sort_by_key(|item| modifier_rank(item));
        self.pending_started_at.get_or_insert(now);
        None
    }

    fn handle_modifier_up(&mut self) -> Option<KeycastDisplayPayload> {
        if self.pending_modifiers.is_empty() {
            return None;
        }
        self.pending_started_at = None;
        Some(build_payload(take_modifiers(&mut self.pending_modifiers)))
    }

    fn is_pending_stale(&self, now: i64, combo_window_ms: i64) -> bool {
        self.pending_started_at
            .map(|started_at| now - started_at > combo_window_ms)
            .unwrap_or(false)
    }
}

fn build_payload(keys: Vec<String>) -> KeycastDisplayPayload {
    KeycastDisplayPayload {
        text: keys.join(" + "),
        keys,
        timestamp: Utc::now().timestamp_millis(),
    }
}

fn take_modifiers(keys: &mut Vec<String>) -> Vec<String> {
    let mut taken = Vec::new();
    std::mem::swap(keys, &mut taken);
    taken
}

fn is_modifier_key(key: &str) -> bool {
    matches!(key, "Ctrl" | "Shift" | "Alt" | "Win")
}

fn modifier_rank(key: &str) -> usize {
    match key {
        "Ctrl" => 0,
        "Shift" => 1,
        "Alt" => 2,
        "Win" => 3,
        _ => 10,
    }
}

#[cfg(target_os = "windows")]
fn is_virtual_key_down(virtual_key: u16) -> bool {
    unsafe { GetAsyncKeyState(i32::from(virtual_key)) as u16 & 0x8000 != 0 }
}

#[cfg(not(target_os = "windows"))]
fn is_virtual_key_down(_virtual_key: u16) -> bool {
    false
}

fn key_name(virtual_key: u16) -> Option<String> {
    match virtual_key {
        0x08 => Some("Backspace".to_string()),
        0x09 => Some("Tab".to_string()),
        0x0D => Some("Enter".to_string()),
        0x1B => Some("Esc".to_string()),
        0x20 => Some("Space".to_string()),
        0x21 => Some("PageUp".to_string()),
        0x22 => Some("PageDown".to_string()),
        0x23 => Some("End".to_string()),
        0x24 => Some("Home".to_string()),
        0x25 => Some("Left".to_string()),
        0x26 => Some("Up".to_string()),
        0x27 => Some("Right".to_string()),
        0x28 => Some("Down".to_string()),
        0x2D => Some("Insert".to_string()),
        0x2E => Some("Delete".to_string()),
        0x5B | 0x5C => Some("Win".to_string()),
        0xA0 | 0xA1 => Some("Shift".to_string()),
        0xA2 | 0xA3 => Some("Ctrl".to_string()),
        0xA4 | 0xA5 => Some("Alt".to_string()),
        0x70..=0x87 => Some(format!("F{}", virtual_key - 0x6F)),
        0x60..=0x69 => Some(format!("Num{}", virtual_key - 0x60)),
        0x30..=0x39 | 0x41..=0x5A => {
            char::from_u32(u32::from(virtual_key)).map(|ch| ch.to_string())
        }
        _ => None,
    }
}

impl KeycastService {
    pub fn initialize(app: &AppHandle, runtime: &KeycastRuntime) -> AppResult<()> {
        let config =
            Self::normalize_overlay_config(Self::load_overlay_config(app).unwrap_or_default());
        let mut current = runtime
            .overlay_config
            .lock()
            .map_err(|_| AppError::WindowOperationFailed("初始化按键屏显配置失败".to_string()))?;
        *current = config;
        Ok(())
    }

    pub fn get_overlay_config(
        app: &AppHandle,
        runtime: &KeycastRuntime,
    ) -> AppResult<KeycastOverlayConfig> {
        Self::default_overlay_config(app, runtime)
    }

    pub fn prewarm_overlay_async(app: &AppHandle, runtime: &KeycastRuntime) -> AppResult<()> {
        if app.get_webview_window(KEYCAST_LABEL).is_some() {
            eprintln!("[keycast] prewarm: reuse existing");
            return Ok(());
        }
        let app_handle = app.clone();
        let runtime = runtime.clone();
        app.run_on_main_thread(move || {
            if let Err(error) = Self::ensure_overlay_window(&app_handle, &runtime) {
                eprintln!("[keycast] prewarm: failed: {}", error);
                return;
            }
            eprintln!("[keycast] prewarm: ready");
        })
        .map_err(|error| {
            AppError::WindowOperationFailed(format!("投递按键屏显预热任务失败: {}", error))
        })
    }

    pub fn update_overlay_config(
        app: &AppHandle,
        runtime: &KeycastRuntime,
        next: KeycastOverlayConfig,
    ) -> AppResult<KeycastOverlayConfig> {
        let next = Self::normalize_overlay_config(next);
        {
            let mut config = runtime
                .overlay_config
                .lock()
                .map_err(|_| AppError::WindowOperationFailed("更新按键屏显配置失败".to_string()))?;
            *config = next.clone();
        }
        Self::save_overlay_config(app, &next)?;
        let _ = app.emit("keycast:config-updated", &next);
        Self::ensure_overlay_window(app, runtime)?;
        Self::apply_overlay_config(app, &next)?;
        Ok(next)
    }

    pub fn start(app: &AppHandle, runtime: &KeycastRuntime) -> AppResult<()> {
        eprintln!("[keycast] start: enter");
        Self::ensure_overlay_window(app, runtime)?;
        eprintln!("[keycast] start: overlay ready");
        if runtime.is_listening.swap(true, Ordering::SeqCst) {
            eprintln!("[keycast] start: already listening");
            return Ok(());
        }
        let stop_flag = Arc::new(AtomicBool::new(false));
        if let Ok(mut guard) = runtime.stop_flag.lock() {
            *guard = Some(stop_flag.clone());
        }
        let app_handle = app.clone();
        let runtime_handle = runtime.clone();
        let worker = thread::spawn(move || {
            eprintln!("[keycast] worker: spawned");
            Self::run_worker(app_handle, runtime_handle, stop_flag);
        });
        if let Ok(mut guard) = runtime.worker.lock() {
            *guard = Some(worker);
        }
        runtime.is_listening.store(true, Ordering::SeqCst);
        eprintln!("[keycast] start: worker registered");
        Ok(())
    }

    pub fn stop(app: &AppHandle, runtime: &KeycastRuntime) -> AppResult<()> {
        if let Ok(mut guard) = runtime.stop_flag.lock() {
            if let Some(flag) = guard.take() {
                flag.store(true, Ordering::SeqCst);
            }
        }
        if let Ok(mut guard) = runtime.worker.lock() {
            if let Some(handle) = guard.take() {
                let _ = handle.join();
            }
        }
        runtime.is_listening.store(false, Ordering::SeqCst);
        Self::hide_overlay(app)?;
        Ok(())
    }

    pub fn get_state(app: &AppHandle, runtime: &KeycastRuntime) -> AppResult<KeycastState> {
        let is_overlay_visible = app
            .get_webview_window(KEYCAST_LABEL)
            .map(|window| window.is_visible().unwrap_or(false))
            .unwrap_or(false);

        Ok(KeycastState {
            is_listening: runtime.is_listening.load(Ordering::SeqCst),
            is_overlay_visible,
        })
    }

    fn run_worker(app: AppHandle, runtime: KeycastRuntime, stop_flag: Arc<AtomicBool>) {
        #[cfg(target_os = "windows")]
        {
            let mut tracker = KeySequenceTracker::default();
            let mut pressed = [false; 256];
            while !stop_flag.load(Ordering::SeqCst) {
                let combo_window_ms = runtime
                    .overlay_config
                    .lock()
                    .map(|config| config.combo_window_ms)
                    .unwrap_or(DEFAULT_COMBO_WINDOW_MS);
                for vk in 1_u16..=254_u16 {
                    let is_down = is_virtual_key_down(vk);
                    let slot = &mut pressed[vk as usize];
                    if is_down == *slot {
                        continue;
                    }
                    *slot = is_down;
                    if let Some(payload) = tracker.handle(vk, is_down, combo_window_ms) {
                        let _ = app.emit("keycast:display", payload);
                    }
                }
                thread::sleep(Duration::from_millis(16));
            }
            return;
        }

        #[cfg(not(target_os = "windows"))]
        {
            let payload = KeycastDisplayPayload {
                text: "当前平台暂不支持按键屏显".to_string(),
                keys: vec!["Unsupported".to_string()],
                timestamp: Utc::now().timestamp_millis(),
            };
            let _ = app.emit("keycast:display", payload);
        }
    }

    fn ensure_overlay_window(app: &AppHandle, runtime: &KeycastRuntime) -> AppResult<()> {
        use tauri::{WebviewUrl, WebviewWindowBuilder};

        if app.get_webview_window(KEYCAST_LABEL).is_some() {
            eprintln!("[keycast] ensure_overlay_window: reuse existing");
            return Ok(());
        }

        eprintln!("[keycast] ensure_overlay_window: building");
        let window =
            WebviewWindowBuilder::new(app, KEYCAST_LABEL, WebviewUrl::App("keycast.html".into()))
                .title("按键屏显")
                .on_page_load(|window, payload| {
                    eprintln!(
                        "[keycast] page_load: label={}, event={:?}, url={}",
                        window.label(),
                        payload.event(),
                        payload.url()
                    );
                })
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .focused(false)
                .visible(false)
                .inner_size(560.0, 140.0)
                .initialization_script(
                    r#"
                try {
                  document.documentElement.style.background = 'transparent';
                  document.body && (document.body.style.background = 'transparent');
                } catch (_) {}
                "#,
                )
                .build()
                .map_err(|error| {
                    AppError::WindowOperationFailed(format!("创建按键屏显窗口失败: {}", error))
                })?;
        #[cfg(target_os = "windows")]
        window.set_shadow(false).map_err(|error| {
            AppError::WindowOperationFailed(format!("关闭按键屏显窗口阴影失败: {}", error))
        })?;
        eprintln!("[keycast] ensure_overlay_window: build ok");

        let config = Self::default_overlay_config(app, runtime)?;
        eprintln!(
            "[keycast] ensure_overlay_window: apply config x={}, y={}",
            config.x, config.y
        );
        Self::apply_overlay_config(app, &config)?;
        eprintln!("[keycast] ensure_overlay_window: apply config ok");

        Ok(())
    }

    fn hide_overlay(app: &AppHandle) -> AppResult<()> {
        if let Some(window) = app.get_webview_window(KEYCAST_LABEL) {
            window.hide().map_err(|error| {
                AppError::WindowOperationFailed(format!("隐藏按键屏显窗口失败: {}", error))
            })?;
        }
        Ok(())
    }

    fn apply_overlay_config(app: &AppHandle, config: &KeycastOverlayConfig) -> AppResult<()> {
        use tauri::LogicalPosition;

        let window = app
            .get_webview_window(KEYCAST_LABEL)
            .ok_or_else(|| AppError::WindowOperationFailed("按键屏显窗口不存在".to_string()))?;
        window
            .set_position(LogicalPosition::new(config.x, config.y))
            .map_err(|error| {
                AppError::WindowOperationFailed(format!("设置按键屏显位置失败: {}", error))
            })?;
        Ok(())
    }

    fn default_overlay_config(
        _app: &AppHandle,
        runtime: &KeycastRuntime,
    ) -> AppResult<KeycastOverlayConfig> {
        let config = runtime
            .overlay_config
            .lock()
            .map(|current| current.clone())
            .map_err(|_| AppError::WindowOperationFailed("读取按键屏显配置失败".to_string()))?;
        if let Ok(mut current) = runtime.overlay_config.lock() {
            *current = config.clone();
        }
        Ok(config)
    }

    fn overlay_config_path(app: &AppHandle) -> AppResult<std::path::PathBuf> {
        let data_dir = app
            .path()
            .home_dir()
            .map_err(|error| AppError::IoError(format!("获取用户目录失败: {}", error)))?
            .join(".deskforge");
        fs::create_dir_all(&data_dir)
            .map_err(|error| AppError::IoError(format!("创建数据目录失败: {}", error)))?;
        Ok(data_dir.join(KEYCAST_CONFIG_FILE))
    }

    fn load_overlay_config(app: &AppHandle) -> AppResult<KeycastOverlayConfig> {
        let path = Self::overlay_config_path(app)?;
        if !path.exists() {
            return Ok(KeycastOverlayConfig::default());
        }
        let content = fs::read_to_string(&path)
            .map_err(|error| AppError::IoError(format!("读取按键屏显配置失败: {}", error)))?;
        serde_json::from_str(&content)
            .map_err(|error| AppError::InvalidData(format!("解析按键屏显配置失败: {}", error)))
    }

    fn save_overlay_config(app: &AppHandle, config: &KeycastOverlayConfig) -> AppResult<()> {
        let path = Self::overlay_config_path(app)?;
        let content = serde_json::to_string_pretty(config)
            .map_err(|error| AppError::InvalidData(format!("序列化按键屏显配置失败: {}", error)))?;
        fs::write(path, content)
            .map_err(|error| AppError::IoError(format!("保存按键屏显配置失败: {}", error)))
    }

    fn normalize_overlay_config(mut config: KeycastOverlayConfig) -> KeycastOverlayConfig {
        config.combo_window_ms = config.combo_window_ms.clamp(100, 2000);
        config.text_color = config.text_color.trim().to_string();
        if !matches!(
            config.theme.as_str(),
            "keycaps-dark"
                | "keycaps-light"
                | "broadcast-orange"
                | "broadcast-green"
                | "minimal-dark"
                | "minimal-light"
                | "glass-soft"
                | "fresh-mint"
                | "sky-card"
                | "terminal"
                | "neon-cyan"
                | "paper-card"
        ) {
            config.theme = "keycaps-dark".to_string();
        }
        config
    }
}
