/**
 * 系统信息相关类型定义
 */

/**
 * 系统信息（完整版）
 */
export interface SystemInfo {
  /** 操作系统信息 */
  os: OsInfo;
  /** 硬件信息（主板、BIOS） */
  hardware: HardwareInfo;
  /** CPU 信息 */
  cpu: CpuInfo;
  /** 内存信息 */
  memory: MemoryInfo;
  /** GPU 信息列表 */
  gpu: GpuInfo[];
  /** 磁盘信息列表 */
  disks: DiskInfo[];
  /** 计算机信息 */
  computer: ComputerInfo;
  /** 显示器信息 */
  display: DisplayInfo;
  /** 网络信息 */
  network: NetworkInfo;
}

/**
 * 操作系统信息
 */
export interface OsInfo {
  /** 操作系统名称 */
  name: string;
  /** 操作系统版本 */
  version: string;
  /** 系统架构 */
  arch: string;
  /** 内核版本 */
  kernelVersion: string;
  /** 主机名 */
  hostName: string;
  /** 运行时间（可读格式） */
  uptimeReadable: string;
}

/**
 * 硬件信息（主板、BIOS）
 */
export interface HardwareInfo {
  /** 制造商 */
  manufacturer: string;
  /** 型号 */
  model: string;
  /** BIOS 版本 */
  biosVersion: string;
  /** BIOS 序列号 */
  biosSerial: string;
}

/**
 * CPU 信息
 */
export interface CpuInfo {
  /** CPU 型号 */
  model: string;
  /** 物理核心数 */
  cores: number;
  /** 逻辑处理器数 */
  processors: number;
  /** 最大频率 (MHz) */
  maxFrequency: number;
  /** 当前使用率 (0-100) */
  usagePercent: number;
}

/**
 * 内存信息
 */
export interface MemoryInfo {
  /** 总内存 (GB) */
  totalGb: number;
  /** 可用内存 (GB) */
  availableGb: number;
  /** 已用内存 (GB) */
  usedGb: number;
  /** 使用率 (0-100) */
  usagePercent: number;
}

/**
 * GPU 信息
 */
export interface GpuInfo {
  /** GPU 名称 */
  name: string;
  /** 显存 (GB) */
  vramGb: number;
  /** 驱动版本 */
  driverVersion: string;
}

/**
 * 磁盘信息
 */
export interface DiskInfo {
  /** 盘符 (如 "C:") */
  driveLetter: string;
  /** 卷标 */
  volumeLabel: string;
  /** 文件系统类型 */
  fileSystem: string;
  /** 总容量 (GB) */
  totalGb: number;
  /** 可用空间 (GB) */
  availableGb: number;
  /** 已用空间 (GB) */
  usedGb: number;
  /** 使用率 (0-100) */
  usagePercent: number;
}

/**
 * 计算机信息
 */
export interface ComputerInfo {
  /** 计算机名称 */
  name: string;
  /** 用户名 */
  username: string;
  /** 域名/工作组 */
  domain: string;
  /** 制造商 */
  manufacturer: string;
  /** 型号 */
  model: string;
  /** 序列号 */
  serialNumber: string;
}

/**
 * 显示器信息
 */
export interface DisplayInfo {
  /** 屏幕数量 */
  monitorCount: number;
  /** 主显示器分辨率 */
  primaryResolution: string;
  /** 所有显示器分辨率列表 */
  allResolutions: string[];
}

/**
 * 网络信息
 */
export interface NetworkInfo {
  /** 网络接口列表 */
  interfaces: InterfaceInfo[];
  /** 总下载 (MB) */
  totalDownloadedMb: number;
  /** 总上传 (MB) */
  totalUploadedMb: number;
}

/**
 * 网络接口信息
 */
export interface InterfaceInfo {
  /** 接口名称 */
  name: string;
  /** MAC 地址 */
  macAddress: string;
  /** IP 地址列表 */
  ipNetworks: string[];
  /** 上传速度 (KB/s) */
  uploadSpeedKb: number;
  /** 下载速度 (KB/s) */
  downloadSpeedKb: number;
}
