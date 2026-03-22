//! 系统信息平台抽象
//!
//! 定义获取系统信息的平台相关接口

use crate::error::AppResult;
use crate::models::system_info::SystemInfo;

#[cfg(not(windows))]
use crate::models::system_info::{
    ComputerInfo, CpuInfo, DiskInfo, DisplayInfo, GpuInfo, HardwareInfo, MemoryInfo, NetworkInfo,
    OsInfo,
};

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

/// 非 Windows 平台占位实现
#[cfg(not(windows))]
pub struct DummySystemInfo;

#[cfg(not(windows))]
impl SystemInfoAccessor for DummySystemInfo {
    fn get_system_info(&self) -> AppResult<SystemInfo> {
        use sysinfo::{Disks, System};

        let mut sys = System::new_all();
        sys.refresh_all();

        let disks = Disks::new_with_refreshed_list();

        Ok(SystemInfo {
            os: OsInfo {
                name: System::name().unwrap_or_else(|| "Unknown".to_string()),
                version: System::os_version().unwrap_or_default(),
                arch: std::env::consts::ARCH.to_string(),
                kernel_version: System::kernel_version().unwrap_or_default(),
                host_name: System::host_name().unwrap_or_default(),
                uptime_readable: format!("{} seconds", System::uptime()),
            },
            hardware: HardwareInfo {
                manufacturer: "Unknown".to_string(),
                model: "Unknown".to_string(),
                bios_version: "Unknown".to_string(),
                bios_serial: "Unknown".to_string(),
            },
            cpu: {
                let cpus = sys.cpus();
                let cpu = cpus.first().ok_or_else(|| {
                    crate::error::AppError::SystemInfoFailed("无法获取 CPU 信息".to_string())
                })?;

                CpuInfo {
                    model: cpu.brand().to_string(),
                    cores: sys.physical_core_count().unwrap_or(1),
                    processors: cpus.len(),
                    max_frequency: cpu.frequency(),
                    usage_percent: sys.global_cpu_info().cpu_usage(),
                }
            },
            memory: {
                let total = sys.total_memory() as f64;
                let available = sys.available_memory() as f64;
                let used = total - available;
                MemoryInfo {
                    total_gb: total / 1024.0 / 1024.0 / 1024.0,
                    available_gb: available / 1024.0 / 1024.0 / 1024.0,
                    used_gb: used / 1024.0 / 1024.0 / 1024.0,
                    usage_percent: if total > 0.0 {
                        (used / total) * 100.0
                    } else {
                        0.0
                    },
                }
            },
            gpu: Vec::<GpuInfo>::new(),
            disks: disks
                .list()
                .iter()
                .map(|disk| {
                    let total = disk.total_space() as f64;
                    let available = disk.available_space() as f64;
                    let used = total - available;
                    DiskInfo {
                        drive_letter: disk.name().to_string_lossy().into_owned(),
                        volume_label: "Local Disk".to_string(),
                        file_system: disk.file_system().to_string_lossy().into_owned(),
                        total_gb: total / 1024.0 / 1024.0 / 1024.0,
                        available_gb: available / 1024.0 / 1024.0 / 1024.0,
                        used_gb: used / 1024.0 / 1024.0 / 1024.0,
                        usage_percent: if total > 0.0 {
                            (used / total) * 100.0
                        } else {
                            0.0
                        },
                    }
                })
                .collect(),
            computer: ComputerInfo {
                name: System::host_name().unwrap_or_default(),
                username: std::env::var("USER")
                    .or_else(|_| std::env::var("USERNAME"))
                    .unwrap_or_default(),
                domain: "WORKGROUP".to_string(),
                manufacturer: "Unknown".to_string(),
                model: "Unknown".to_string(),
                serial_number: "Unknown".to_string(),
            },
            display: DisplayInfo {
                monitor_count: 1,
                primary_resolution: "Unknown".to_string(),
                all_resolutions: vec![],
            },
            network: NetworkInfo {
                interfaces: vec![],
                total_downloaded_mb: 0.0,
                total_uploaded_mb: 0.0,
            },
        })
    }
}
