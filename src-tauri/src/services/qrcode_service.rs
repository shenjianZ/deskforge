//! 二维码生成服务
//!
//! 提供二维码生成的核心业务逻辑

use crate::error::{AppError, AppResult};
use crate::models::qrcode::{QrConfig, QrResult};
use crate::utils::qrcode_renderer::{image_to_base64, render_qr};

/// 二维码生成服务
pub struct QrCodeService;

impl QrCodeService {
    /// 生成二维码预览
    ///
    /// 根据配置生成二维码并返回 Base64 编码的图片数据
    ///
    /// # 参数
    ///
    /// * `config` - 二维码配置
    ///
    /// # 返回
    ///
    /// 返回二维码生成结果，包含 Base64 编码的图片数据
    ///
    /// # 错误
    ///
    /// - 配置无效时返回 `AppError::InvalidData`
    /// - 图片编码失败时返回 `AppError::IoError`
    pub fn generate_preview(config: &QrConfig) -> AppResult<QrResult> {
        // 验证尺寸
        if config.size < 128 || config.size > 4096 {
            return Err(AppError::InvalidData(
                "尺寸必须在 128 到 4096 之间".to_string(),
            ));
        }

        // 验证边距
        if config.margin > 50 {
            return Err(AppError::InvalidData("边距不能超过 50".to_string()));
        }

        // 验证 Logo 缩放比例
        if let Some(logo) = &config.logo {
            if logo.scale < 0.05 || logo.scale > 0.3 {
                return Err(AppError::InvalidData(
                    "Logo 缩放比例必须在 0.05 到 0.3 之间".to_string(),
                ));
            }
        }

        // 渲染二维码
        let img = render_qr(config)?;

        // 转换为 Base64
        let base64_data = image_to_base64(&img)?;

        Ok(QrResult {
            data: base64_data,
            format: "png".to_string(),
        })
    }

    /// 生成二维码并保存到文件
    ///
    /// 根据配置生成二维码并保存为 PNG 文件
    ///
    /// # 参数
    ///
    /// * `config` - 二维码配置
    /// * `output_path` - 输出文件路径
    ///
    /// # 返回
    ///
    /// 成功时返回 Ok(())，失败时返回错误
    ///
    /// # 错误
    ///
    /// - 配置无效时返回 `AppError::InvalidData`
    /// - 文件写入失败时返回 `AppError::IoError`
    pub fn generate_to_file(config: &QrConfig, output_path: &str) -> AppResult<()> {
        // 验证尺寸
        if config.size < 128 || config.size > 4096 {
            return Err(AppError::InvalidData(
                "尺寸必须在 128 到 4096 之间".to_string(),
            ));
        }

        // 验证边距
        if config.margin > 50 {
            return Err(AppError::InvalidData("边距不能超过 50".to_string()));
        }

        // 验证 Logo 缩放比例
        if let Some(logo) = &config.logo {
            if logo.scale < 0.05 || logo.scale > 0.3 {
                return Err(AppError::InvalidData(
                    "Logo 缩放比例必须在 0.05 到 0.3 之间".to_string(),
                ));
            }
        }

        // 渲染二维码
        let img = render_qr(config)?;

        // 保存到文件
        img.save(output_path)
            .map_err(|e| AppError::IoError(format!("保存文件失败: {}", e)))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::qrcode::QrStyle;

    #[test]
    fn test_generate_preview() {
        let config = QrConfig {
            content: "https://example.com".to_string(),
            size: 512,
            margin: 4,
            error_correction: "M".to_string(),
            style: None,
            logo: None,
        };

        let result = QrCodeService::generate_preview(&config);
        assert!(result.is_ok());

        let qr_result = result.unwrap();
        assert!(qr_result.data.starts_with("data:image/png;base64,"));
        assert_eq!(qr_result.format, "png");
    }

    #[test]
    fn test_generate_preview_with_style() {
        let style = QrStyle {
            dot_shape: "circle".to_string(),
            eye_shape: "square".to_string(),
            foreground_color: "#FF0000".to_string(),
            background_color: "#FFFFFF".to_string(),
            is_gradient: false,
            gradient_colors: None,
        };

        let config = QrConfig {
            content: "https://example.com".to_string(),
            size: 512,
            margin: 4,
            error_correction: "M".to_string(),
            style: Some(style),
            logo: None,
        };

        let result = QrCodeService::generate_preview(&config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_generate_preview_invalid_size() {
        let config = QrConfig {
            content: "https://example.com".to_string(),
            size: 50, // 太小
            margin: 4,
            error_correction: "M".to_string(),
            style: None,
            logo: None,
        };

        let result = QrCodeService::generate_preview(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_preview_invalid_margin() {
        let config = QrConfig {
            content: "https://example.com".to_string(),
            size: 512,
            margin: 100, // 太大
            error_correction: "M".to_string(),
            style: None,
            logo: None,
        };

        let result = QrCodeService::generate_preview(&config);
        assert!(result.is_err());
    }
}
