//! 二维码生成命令
//!
//! 定义二维码生成相关的 Tauri 命令

use crate::models::qrcode::{QrConfig, QrResult};
use crate::services::qrcode_service::QrCodeService;

/// 生成二维码预览
///
/// Tauri 命令，用于从前端调用生成二维码预览
///
/// # 参数
///
/// * `config` - 二维码配置
///
/// # 返回
///
/// 返回二维码生成结果，包含 Base64 编码的图片数据
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/core';
///
/// const result = await invoke('generate_qr_preview', {
///   config: {
///     content: 'https://example.com',
///     size: 512,
///     margin: 4,
///     errorCorrection: 'M'
///   }
/// });
/// console.log(result.data); // "data:image/png;base64,..."
/// ```
#[tauri::command]
pub async fn generate_qr_preview(config: QrConfig) -> Result<QrResult, String> {
    QrCodeService::generate_preview(&config).map_err(|e| e.to_string())
}

/// 生成二维码并保存到文件
///
/// Tauri 命令，用于将生成的二维码保存为文件
///
/// # 参数
///
/// * `config` - 二维码配置
/// * `output_path` - 输出文件路径
///
/// # 返回
///
/// 成功时返回 Ok(())，失败时返回错误字符串
///
/// # 前端调用示例
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/core';
///
/// await invoke('generate_qr_file', {
///   config: {
///     content: 'https://example.com',
///     size: 1024,
///     margin: 4,
///     errorCorrection: 'H'
///   },
///   outputPath: '/path/to/output.png'
/// });
/// ```
#[tauri::command]
pub async fn generate_qr_file(config: QrConfig, output_path: String) -> Result<(), String> {
    QrCodeService::generate_to_file(&config, &output_path).map_err(|e| e.to_string())
}
