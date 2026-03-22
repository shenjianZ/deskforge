//! 错误处理模块
//!
//! 提供统一的错误类型定义和错误处理机制

use std::fmt;

/// 应用统一错误类型
///
/// 定义了应用中可能出现的所有错误类型，每个错误都携带详细的错误信息
#[derive(Debug)]
pub enum AppError {
    /// 平台不支持
    ///
    /// 表示当前平台不支持某项功能
    PlatformNotSupported(String),

    /// 屏幕访问失败
    ///
    /// 表示无法获取或访问屏幕设备
    ScreenAccessFailed(String),

    /// 窗口操作失败
    ///
    /// 表示窗口显示、隐藏或聚焦等操作失败
    WindowOperationFailed(String),

    /// 光标操作失败
    ///
    /// 表示光标设置或恢复操作失败
    CursorOperationFailed(String),

    /// 无效的颜色数据
    ///
    /// 表示提供的颜色数据格式不正确或超出范围
    InvalidColorData(String),

    /// 颜色转换失败
    ///
    /// 表示颜色空间转换（如 RGB 到 HSL）失败
    ColorConversionFailed(String),

    /// 系统信息获取失败
    ///
    /// 表示获取系统信息时失败
    SystemInfoFailed(String),

    /// 无效数据
    ///
    /// 表示提供的数据无效或不符合要求
    InvalidData(String),

    /// IO 错误
    ///
    /// 表示文件或网络 IO 操作失败
    IoError(String),

    /// 二维码生成失败
    ///
    /// 表示二维码生成过程失败
    QrCodeGenerationFailed(String),

    /// 网络请求失败
    ///
    /// 表示 API 调试工具在发送请求时失败
    NetworkRequestFailed(String),

    /// 数据库错误
    ///
    /// 表示 SQLite 读写或初始化失败
    DatabaseError(String),

    /// 调度任务失败
    ///
    /// 表示定时任务计算、执行或恢复失败
    SchedulerError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::PlatformNotSupported(msg) => write!(f, "平台不支持: {}", msg),
            AppError::ScreenAccessFailed(msg) => write!(f, "屏幕访问失败: {}", msg),
            AppError::WindowOperationFailed(msg) => write!(f, "窗口操作失败: {}", msg),
            AppError::CursorOperationFailed(msg) => write!(f, "光标操作失败: {}", msg),
            AppError::InvalidColorData(msg) => write!(f, "颜色数据无效: {}", msg),
            AppError::ColorConversionFailed(msg) => write!(f, "颜色转换失败: {}", msg),
            AppError::SystemInfoFailed(msg) => write!(f, "系统信息获取失败: {}", msg),
            AppError::InvalidData(msg) => write!(f, "数据无效: {}", msg),
            AppError::IoError(msg) => write!(f, "IO 错误: {}", msg),
            AppError::QrCodeGenerationFailed(msg) => write!(f, "二维码生成失败: {}", msg),
            AppError::NetworkRequestFailed(msg) => write!(f, "网络请求失败: {}", msg),
            AppError::DatabaseError(msg) => write!(f, "数据库错误: {}", msg),
            AppError::SchedulerError(msg) => write!(f, "调度错误: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

/// 应用统一返回类型
///
/// 用于所有可能返回错误的函数，简化错误处理代码
pub type AppResult<T> = Result<T, AppError>;

/// 为 Tauri 实现自动转换
///
/// 允许 `AppError` 自动转换为 `String`，以满足 Tauri 命令的要求
impl From<AppError> for String {
    fn from(error: AppError) -> String {
        error.to_string()
    }
}
