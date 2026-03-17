//! 系统信息平台抽象
//!
//! 定义获取系统信息的平台相关接口

use crate::error::AppResult;
use crate::models::system_info::SystemInfo;

/// 系统信息获取 trait
///
/// 定义获取系统信息的接口，不同平台需要实现此 trait
pub trait SystemInfoAccessor {
    /// 获取完整的系统信息
    ///
    /// # 返回
    ///
    /// 返回包含所有系统信息的结构体
    ///
    /// # 错误
    ///
    /// 平台不支持或获取信息失败时返回错误
    fn get_system_info(&self) -> AppResult<SystemInfo>;
}
