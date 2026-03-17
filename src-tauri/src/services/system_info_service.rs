//! 系统信息服务
//!
//! 提供系统信息查询功能的核心业务逻辑

use crate::error::AppResult;
use crate::models::system_info::SystemInfo;
use crate::platforms::system_info::SystemInfoAccessor;

/// 系统信息服务
pub struct SystemInfoService;

impl SystemInfoService {
    /// 获取系统信息
    ///
    /// 查询并返回当前系统的完整信息
    ///
    /// # 返回
    ///
    /// 返回包含所有系统信息的结构体
    ///
    /// # 错误
    ///
    /// 平台不支持或获取信息失败时返回错误
    pub fn get_system_info() -> AppResult<SystemInfo> {
        // 调用平台实现获取系统信息
        #[cfg(windows)]
        {
            let accessor = crate::platforms::windows::system_info_impl::WindowsSystemInfo;
            accessor.get_system_info()
        }

        #[cfg(not(windows))]
        {
            let accessor = crate::platforms::windows::system_info_impl::DummySystemInfo;
            accessor.get_system_info()
        }
    }
}
