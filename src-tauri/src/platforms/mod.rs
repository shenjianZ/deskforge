//! 平台相关模块
//!
//! 定义不同平台的特定实现

pub mod system_info;

// Windows 平台实现
#[cfg(windows)]
pub mod windows;
