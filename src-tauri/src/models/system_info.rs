//! 系统信息相关数据模型
//!
//! 定义系统信息工具使用的数据结构

use serde::{Deserialize, Serialize};

/// 系统信息（完整版）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    /// 操作系统信息
    pub os: OsInfo,
    /// 硬件信息（主板、BIOS）
    pub hardware: HardwareInfo,
    /// CPU 信息
    pub cpu: CpuInfo,
    /// 内存信息
    pub memory: MemoryInfo,
    /// GPU 信息列表
    pub gpu: Vec<GpuInfo>,
    /// 磁盘信息列表
    pub disks: Vec<DiskInfo>,
    /// 计算机信息
    pub computer: ComputerInfo,
    /// 显示器信息
    pub display: DisplayInfo,
    /// 网络信息
    pub network: NetworkInfo,
}

/// 操作系统信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    /// 操作系统名称
    pub name: String,
    /// 操作系统版本
    pub version: String,
    /// 系统架构
    pub arch: String,
    /// 内核版本
    pub kernel_version: String,
    /// 主机名
    pub host_name: String,
    /// 运行时间（可读格式）
    pub uptime_readable: String,
}

/// 硬件信息（主板、BIOS）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInfo {
    /// 制造商
    pub manufacturer: String,
    /// 型号
    pub model: String,
    /// BIOS 版本
    pub bios_version: String,
    /// BIOS 序列号
    pub bios_serial: String,
}

/// CPU 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    /// CPU 型号
    pub model: String,
    /// 物理核心数
    pub cores: usize,
    /// 逻辑处理器数
    pub processors: usize,
    /// 最大频率 (MHz)
    pub max_frequency: u32,
    /// 当前使用率 (0-100)
    pub usage_percent: f32,
}

/// 内存信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    /// 总内存 (GB)
    pub total_gb: f64,
    /// 可用内存 (GB)
    pub available_gb: f64,
    /// 已用内存 (GB)
    pub used_gb: f64,
    /// 使用率 (0-100)
    pub usage_percent: f64,
}

/// GPU 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    /// GPU 名称
    pub name: String,
    /// 显存 (GB)
    pub vram_gb: f64,
    /// 驱动版本
    pub driver_version: String,
}

/// 磁盘信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    /// 盘符 (如 "C:")
    pub drive_letter: String,
    /// 卷标
    pub volume_label: String,
    /// 文件系统类型
    pub file_system: String,
    /// 总容量 (GB)
    pub total_gb: f64,
    /// 可用空间 (GB)
    pub available_gb: f64,
    /// 已用空间 (GB)
    pub used_gb: f64,
    /// 使用率 (0-100)
    pub usage_percent: f64,
}

/// 计算机信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputerInfo {
    /// 计算机名称
    pub name: String,
    /// 用户名
    pub username: String,
    /// 域名/工作组
    pub domain: String,
    /// 制造商
    pub manufacturer: String,
    /// 型号
    pub model: String,
    /// 序列号
    pub serial_number: String,
}

/// 显示器信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    /// 屏幕数量
    pub monitor_count: u32,
    /// 主显示器分辨率
    pub primary_resolution: String,
    /// 所有显示器分辨率列表
    pub all_resolutions: Vec<String>,
}

/// 网络信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    /// 网络接口列表
    pub interfaces: Vec<InterfaceInfo>,
    /// 总下载 (MB)
    pub total_downloaded_mb: f64,
    /// 总上传 (MB)
    pub total_uploaded_mb: f64,
}

/// 网络接口信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterfaceInfo {
    /// 接口名称
    pub name: String,
    /// MAC 地址
    pub mac_address: String,
    /// IP 地址列表
    pub ip_networks: Vec<String>,
    /// 上传速度 (KB/s)
    pub upload_speed_kb: f64,
    /// 下载速度 (KB/s)
    pub download_speed_kb: f64,
}
