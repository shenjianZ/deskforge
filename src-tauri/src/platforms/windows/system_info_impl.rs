//! Windows 平台系统信息实现
//!
//! 使用 WMI 和 sysinfo 获取系统信息

use crate::error::{AppError, AppResult};
use crate::models::system_info::{
    ComputerInfo, CpuInfo, DisplayInfo, DiskInfo, GpuInfo, HardwareInfo, InterfaceInfo,
    MemoryInfo, NetworkInfo, OsInfo, SystemInfo,
};
use crate::platforms::system_info::SystemInfoAccessor;
use serde::Deserialize;
use std::time::Duration;
use sysinfo::System;

/// Windows 平台系统信息实现
#[cfg(windows)]
pub struct WindowsSystemInfo;

#[cfg(windows)]
impl SystemInfoAccessor for WindowsSystemInfo {
    fn get_system_info(&self) -> AppResult<SystemInfo> {
        // 使用 sysinfo 获取基础信息
        let mut sys = System::new_all();

        // 等待一小会儿以收集CPU使用率和网络速率
        std::thread::sleep(Duration::from_millis(200));
        sys.refresh_all();
        sys.refresh_cpu();

        // 使用 WMI 获取详细硬件信息
        let wmi_result = Self::get_wmi_info();

        // 解构 WMI 结果，提供默认值
        let (hw_info, gpu_infos, disk_labels, net_ips) = match wmi_result {
            Ok((hw, gpus, labels, ips)) => (hw, gpus, labels, ips),
            Err(_) => (
                HardwareInfo {
                    manufacturer: "Unknown".to_string(),
                    model: "Unknown".to_string(),
                    bios_version: "Unknown".to_string(),
                    bios_serial: "Unknown".to_string(),
                },
                vec![],
                std::collections::HashMap::new(),
                std::collections::HashMap::new(),
            )
        };

        Ok(SystemInfo {
            os: Self::get_os_info(&sys)?,
            hardware: hw_info,
            cpu: Self::get_cpu_info(&sys)?,
            memory: Self::get_memory_info(&sys)?,
            gpu: gpu_infos,
            disks: Self::get_disk_info(&sys, &disk_labels)?,
            computer: Self::get_computer_info()?,
            display: Self::get_display_info()?,
            network: Self::get_network_info(&sys, &net_ips)?,
        })
    }
}

/// WMI 结构体映射
/// 这些结构体名称必须匹配 Windows WMI 类名（包含下划线）
#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[allow(non_camel_case_types)]
struct Win32_VideoController {
    name: String,
    driver_version: Option<String>,
    adapter_ram: Option<u64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[allow(non_camel_case_types)]
struct Win32_ComputerSystem {
    manufacturer: Option<String>,
    model: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[allow(non_camel_case_types)]
struct Win32_BaseBoard {
    manufacturer: Option<String>,
    product: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[allow(non_camel_case_types)]
struct Win32_Bios {
    #[allow(dead_code)]
    manufacturer: Option<String>,
    version: Option<String>,
    serial_number: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[allow(non_camel_case_types)]
struct Win32_LogicalDisk {
    device_id: String,
    volume_name: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[allow(non_camel_case_types)]
struct Win32_NetworkAdapterConfiguration {
    mac_address: Option<String>,
    ip_address: Option<Vec<String>>,
    ip_enabled: Option<bool>,
}

/// WMI 信息返回类型
type WmiInfoResult = Result<(
    HardwareInfo,
    Vec<GpuInfo>,
    std::collections::HashMap<String, String>,
    std::collections::HashMap<String, Vec<String>>,
), String>;

#[cfg(windows)]
impl WindowsSystemInfo {
    /// 获取 WMI 硬件信息（容错版本，某个查询失败不影响其他查询）
    fn get_wmi_info() -> WmiInfoResult {
        use wmi::{COMLibrary, WMIConnection};
        use std::collections::HashMap;

        let com = COMLibrary::new()
            .map_err(|e| format!("初始化 COM 失败: {:?}", e))?;

        let wmi_con = WMIConnection::new(com)
            .map_err(|e| format!("连接 WMI 失败: {:?}", e))?;

        // 1. 获取硬件信息（结合 ComputerSystem 和 BaseBoard）
        let hw_info = {
            let sys_query: Result<Vec<Win32_ComputerSystem>, _> = wmi_con.query();
            let board_query: Result<Vec<Win32_BaseBoard>, _> = wmi_con.query();
            let bios_query: Result<Vec<Win32_Bios>, _> = wmi_con.query();

            let sys_result = sys_query.ok();
            let board_result = board_query.ok();
            let bios_result = bios_query.ok();

            let sys = sys_result.as_ref().and_then(|v| v.first());
            let board = board_result.as_ref().and_then(|v| v.first());
            let bios = bios_result.as_ref().and_then(|v| v.first());

            // 优先使用主板信息，回退到系统信息
            let manufacturer = board
                .and_then(|b| b.manufacturer.clone())
                .or_else(|| sys.and_then(|s| s.manufacturer.clone()))
                .unwrap_or_else(|| "Unknown".to_string());

            let model = board
                .and_then(|b| b.product.clone())
                .or_else(|| sys.and_then(|s| s.model.clone()))
                .unwrap_or_else(|| "Unknown".to_string());

            HardwareInfo {
                manufacturer,
                model,
                bios_version: bios
                    .and_then(|b| b.version.clone())
                    .unwrap_or_else(|| "Unknown".to_string()),
                bios_serial: bios
                    .and_then(|b| b.serial_number.clone())
                    .unwrap_or_else(|| "Unknown".to_string()),
            }
        };

        // 2. 获取显卡信息（容错）
        let gpu_infos = {
            let gpu_query: Result<Vec<Win32_VideoController>, _> = wmi_con.query();
            gpu_query
                .unwrap_or_default()
                .into_iter()
                .map(|g| GpuInfo {
                    name: g.name,
                    vram_gb: g.adapter_ram.unwrap_or(0) as f64 / (1024.0 * 1024.0 * 1024.0),
                    driver_version: g.driver_version.unwrap_or_else(|| "Unknown".to_string()),
                })
                .collect()
        };

        // 3. 获取磁盘卷标
        let mut disk_labels = HashMap::new();
        if let Ok(disk_query_result) = wmi_con.query::<Win32_LogicalDisk>() {
            for disk in disk_query_result {
                if let Some(vol) = disk.volume_name {
                    if !vol.is_empty() {
                        disk_labels.insert(disk.device_id, vol);
                    }
                }
            }
        }

        // 4. 获取网络 IP（修复 MAC 大小写匹配）
        let mut net_ips = HashMap::new();
        if let Ok(net_query_result) = wmi_con.query::<Win32_NetworkAdapterConfiguration>() {
            for net in net_query_result {
                if let (Some(true), Some(mac), Some(ips)) = (net.ip_enabled, net.mac_address, net.ip_address) {
                    // WMI 返回大写 MAC，sysinfo 返回小写，统一转为小写
                    net_ips.insert(mac.to_lowercase(), ips);
                }
            }
        }

        Ok((hw_info, gpu_infos, disk_labels, net_ips))
    }

    /// 获取操作系统信息
    fn get_os_info(_sys: &System) -> AppResult<OsInfo> {
        use windows::Win32::System::SystemInformation::GetNativeSystemInfo;

        let mut sys_info = unsafe { std::mem::zeroed() };
        unsafe {
            GetNativeSystemInfo(&mut sys_info);
        }

        let arch = unsafe {
            match sys_info.Anonymous.Anonymous.wProcessorArchitecture.0 {
                0 => "x86 (32-bit)".to_string(),
                9 => "x64 (64-bit)".to_string(),
                5 => "ARM".to_string(),
                12 => "ARM64".to_string(),
                _ => "Unknown".to_string(),
            }
        };

        Ok(OsInfo {
            name: "Windows".to_string(),
            version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
            arch,
            kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
            host_name: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
            uptime_readable: Self::format_uptime(System::uptime()),
        })
    }

    /// 获取 CPU 信息
    fn get_cpu_info(sys: &System) -> AppResult<CpuInfo> {
        let cpus = sys.cpus();
        let cpu = cpus.first().ok_or_else(|| {
            AppError::SystemInfoFailed("无法获取 CPU 信息".to_string())
        })?;

        let physical_cores = sys.physical_core_count().unwrap_or(1);
        let usage = sys.global_cpu_info().cpu_usage();

        Ok(CpuInfo {
            model: cpu.brand().to_string(),
            cores: physical_cores,
            processors: cpus.len(),
            max_frequency: cpu.frequency() as u32,
            usage_percent: usage,
        })
    }

    /// 获取内存信息
    fn get_memory_info(sys: &System) -> AppResult<MemoryInfo> {
        let total = sys.total_memory() as f64;
        let available = sys.available_memory() as f64;
        let used = total - available;

        Ok(MemoryInfo {
            total_gb: Self::bytes_to_gb(total),
            available_gb: Self::bytes_to_gb(available),
            used_gb: Self::bytes_to_gb(used),
            usage_percent: if total > 0.0 { (used / total) * 100.0 } else { 0.0 },
        })
    }

    /// 获取磁盘信息
    fn get_disk_info(_sys: &System, disk_labels: &std::collections::HashMap<String, String>) -> AppResult<Vec<DiskInfo>> {
        let mut disk_infos = Vec::new();

        // 在 sysinfo 0.30 中使用新的 API
        use sysinfo::Disks;

        let disks = Disks::new_with_refreshed_list();

        for disk in disks.list() {
            let total = disk.total_space() as f64;
            let available = disk.available_space() as f64;
            let used = total - available;

            // 获取盘符，处理 "C:\" -> "C:" 的情况
            let name = disk.name().to_string_lossy();
            let drive_letter = name.trim_end_matches('\\').to_string();

            // 从 WMI 查询结果中获取真实卷标
            let volume_label = disk_labels
                .get(&drive_letter)
                .cloned()
                .unwrap_or_else(|| "Local Disk".to_string());

            disk_infos.push(DiskInfo {
                drive_letter,
                volume_label,
                file_system: disk.file_system().to_string_lossy().to_string(),
                total_gb: Self::bytes_to_gb(total),
                available_gb: Self::bytes_to_gb(available),
                used_gb: Self::bytes_to_gb(used),
                usage_percent: if total > 0.0 { (used / total) * 100.0 } else { 0.0 },
            });
        }

        Ok(disk_infos)
    }

    /// 获取计算机信息
    fn get_computer_info() -> AppResult<ComputerInfo> {
        use windows::Win32::System::SystemInformation::{
            ComputerNamePhysicalDnsHostname, GetComputerNameExW,
        };
        use windows::core::PWSTR;

        let mut computer_name = [0u16; 256];
        let mut size = computer_name.len() as u32;

        unsafe {
            let _ = GetComputerNameExW(
                ComputerNamePhysicalDnsHostname,
                PWSTR(computer_name.as_mut_ptr()),
                &mut size,
            );
        }

        let name = String::from_utf16_lossy(&computer_name[..size as usize]);

        Ok(ComputerInfo {
            name: name.clone(),
            username: std::env::var("USERNAME").unwrap_or_else(|_| "Unknown".to_string()),
            domain: "WORKGROUP".to_string(),
            manufacturer: name.clone(),
            model: "PC".to_string(),
            serial_number: "Unknown".to_string(),
        })
    }

    /// 获取显示器信息
    fn get_display_info() -> AppResult<DisplayInfo> {
        use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

        let width = unsafe { GetSystemMetrics(SM_CXSCREEN) };
        let height = unsafe { GetSystemMetrics(SM_CYSCREEN) };
        let resolution = format!("{}x{}", width, height);

        Ok(DisplayInfo {
            monitor_count: 1,
            primary_resolution: resolution.clone(),
            all_resolutions: vec![resolution],
        })
    }

    /// 获取网络信息
    fn get_network_info(_sys: &System, net_ips: &std::collections::HashMap<String, Vec<String>>) -> AppResult<NetworkInfo> {
        use sysinfo::Networks;

        let networks = Networks::new_with_refreshed_list();
        let mut interfaces = Vec::new();
        let mut total_down = 0.0;
        let mut total_up = 0.0;

        for (name, data) in networks.list() {
            total_down += data.total_received() as f64;
            total_up += data.total_transmitted() as f64;

            // 过滤掉回环接口
            if name == "LO" {
                continue;
            }

            // 修复 MAC 地址匹配：统一转为小写
            let mac = data.mac_address().to_string().to_lowercase();
            let ip_list = net_ips.get(&mac).cloned().unwrap_or_default();

            // 只显示有 IP 或有流量的接口
            if !ip_list.is_empty() || data.total_received() > 0 {
                interfaces.push(InterfaceInfo {
                    name: name.clone(),
                    mac_address: mac,
                    ip_networks: ip_list,
                    upload_speed_kb: data.transmitted() as f64 / 1024.0,
                    download_speed_kb: data.received() as f64 / 1024.0,
                });
            }
        }

        Ok(NetworkInfo {
            interfaces,
            total_downloaded_mb: total_down / 1024.0 / 1024.0,
            total_uploaded_mb: total_up / 1024.0 / 1024.0,
        })
    }

    /// 字节转换为 GB
    fn bytes_to_gb(bytes: f64) -> f64 {
        bytes / 1024.0 / 1024.0 / 1024.0
    }

    /// 格式化运行时间为人类可读格式
    fn format_uptime(seconds: u64) -> String {
        let days = seconds / 86400;
        let hours = (seconds % 86400) / 3600;
        let minutes = (seconds % 3600) / 60;

        if days > 0 {
            format!("{}天 {}小时 {}分钟", days, hours, minutes)
        } else if hours > 0 {
            format!("{}小时 {}分钟", hours, minutes)
        } else {
            format!("{}分钟", minutes)
        }
    }
}

/// 其他平台占位实现
#[cfg(not(windows))]
pub struct DummySystemInfo;

#[cfg(not(windows))]
impl SystemInfoAccessor for DummySystemInfo {
    fn get_system_info(&self) -> AppResult<SystemInfo> {
        use sysinfo::System;
        let mut sys = System::new_all();
        sys.refresh_all();

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
                let cpu = cpus.first().unwrap();
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
                    usage_percent: if total > 0.0 { (used / total) * 100.0 } else { 0.0 },
                }
            },
            gpu: vec![],
            disks: sys
                .disks()
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
                        usage_percent: if total > 0.0 { (used / total) * 100.0 } else { 0.0 },
                    }
                })
                .collect(),
            computer: ComputerInfo {
                name: System::host_name().unwrap_or_default(),
                username: std::env::var("USERNAME").unwrap_or_default(),
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
