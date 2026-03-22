//! 二维码渲染工具函数
//!
//! 提供二维码矩阵到图像的渲染功能，支持颜色、形状和 Logo

use crate::error::{AppError, AppResult};
use crate::models::qrcode::{QrConfig, QrStyle};
use base64::Engine;
use image::imageops::overlay;
use image::{ImageReader, Luma, Rgba, RgbaImage};
use qrcode::{EcLevel, QrCode};
use std::io::Cursor;
use std::path::Path;

/// 渲染二维码
///
/// 根据配置生成二维码图片，支持颜色、形状和 Logo
///
/// # 参数
///
/// * `config` - 二维码配置
///
/// # 返回
///
/// 返回生成的图片数据
///
/// # 错误
///
/// - 二维码内容为空时返回 `InvalidData`
/// - 二维码生成失败时返回相应错误
pub fn render_qr(config: &QrConfig) -> AppResult<RgbaImage> {
    // 验证内容
    if config.content.trim().is_empty() {
        return Err(AppError::InvalidData("二维码内容不能为空".to_string()));
    }

    // 解析容错级别
    let ec_level = match config.error_correction.as_str() {
        "L" => EcLevel::L,
        "M" => EcLevel::M,
        "Q" => EcLevel::Q,
        "H" => EcLevel::H,
        _ => EcLevel::M,
    };

    // 生成二维码
    let qr_code = QrCode::with_error_correction_level(config.content.as_bytes(), ec_level)
        .map_err(|e| AppError::InvalidData(format!("二维码生成失败: {}", e)))?;

    // 获取样式配置
    let style = config.style.as_ref().cloned().unwrap_or_default();

    // 生成基础图像
    let mut img = if style.is_gradient {
        render_gradient_qr(&qr_code, config, &style)?
    } else {
        render_solid_color_qr(&qr_code, config, &style)?
    };

    // 叠加 Logo
    if let Some(logo_config) = &config.logo {
        overlay_logo(&mut img, logo_config)?;
    }

    Ok(img)
}

/// 渲染纯色二维码
fn render_solid_color_qr(
    qr_code: &QrCode,
    config: &QrConfig,
    style: &QrStyle,
) -> AppResult<RgbaImage> {
    let qr_size = qr_code.width() as u32;
    let total_size = qr_size + 2 * config.margin;

    // 创建基础图像
    let qr_image = qr_code
        .render::<Luma<u8>>()
        .quiet_zone(false)
        .min_dimensions(total_size, total_size)
        .max_dimensions(total_size, total_size)
        .build();

    let (width, height) = qr_image.dimensions();
    let scale = (config.size as f32 / width as f32).max(1.0) as u32;
    let scaled_width = width * scale;
    let scaled_height = height * scale;

    // 解析颜色
    let bg_color = parse_hex_color(&style.background_color);
    let fg_color = parse_hex_color(&style.foreground_color);

    // 创建 RGBA 图像
    let mut img = RgbaImage::new(scaled_width, scaled_height);

    // 渲染每个模块
    for y in 0..height {
        for x in 0..width {
            let pixel = qr_image.get_pixel(x, y);
            let is_dark = pixel[0] == 0;
            let color = if is_dark { fg_color } else { bg_color };

            // 计算缩放后的区域
            let start_x = x * scale;
            let start_y = y * scale;
            let end_x = start_x + scale;
            let end_y = start_y + scale;

            // 绘制模块
            draw_shape(
                &mut img,
                start_x,
                start_y,
                end_x,
                end_y,
                color,
                &style.dot_shape,
            );
        }
    }

    Ok(img)
}

/// 渲染渐变二维码
fn render_gradient_qr(
    qr_code: &QrCode,
    config: &QrConfig,
    style: &QrStyle,
) -> AppResult<RgbaImage> {
    let qr_size = qr_code.width() as u32;
    let total_size = qr_size + 2 * config.margin;

    // 创建基础图像
    let qr_image = qr_code
        .render::<Luma<u8>>()
        .quiet_zone(false)
        .min_dimensions(total_size, total_size)
        .max_dimensions(total_size, total_size)
        .build();

    let (width, height) = qr_image.dimensions();
    let scale = (config.size as f32 / width as f32).max(1.0) as u32;
    let scaled_width = width * scale;
    let scaled_height = height * scale;

    // 解析背景色
    let bg_color = parse_hex_color(&style.background_color);

    // 获取渐变颜色
    let gradient_colors = style.gradient_colors.as_ref();
    let start_color = gradient_colors
        .and_then(|colors| colors.first())
        .map(|c| parse_hex_color(c))
        .unwrap_or(parse_hex_color(&style.foreground_color));
    let end_color = gradient_colors
        .and_then(|colors| colors.get(1))
        .map(|c| parse_hex_color(c))
        .unwrap_or(start_color);

    // 创建 RGBA 图像
    let mut img = RgbaImage::new(scaled_width, scaled_height);

    // 渲染每个模块
    for y in 0..height {
        for x in 0..width {
            let pixel = qr_image.get_pixel(x, y);
            let is_dark = pixel[0] == 0;

            // 计算渐变颜色
            let progress = (x as f32 / width as f32).max(0.0).min(1.0);
            let color = if is_dark {
                interpolate_color(start_color, end_color, progress)
            } else {
                bg_color
            };

            // 计算缩放后的区域
            let start_x = x * scale;
            let start_y = y * scale;
            let end_x = start_x + scale;
            let end_y = start_y + scale;

            // 绘制模块
            draw_shape(
                &mut img,
                start_x,
                start_y,
                end_x,
                end_y,
                color,
                &style.dot_shape,
            );
        }
    }

    Ok(img)
}

/// 绘制形状模块
fn draw_shape(
    img: &mut RgbaImage,
    start_x: u32,
    start_y: u32,
    end_x: u32,
    end_y: u32,
    color: [u8; 4],
    shape: &str,
) {
    let (width, height) = img.dimensions();
    let end_x = end_x.min(width);
    let end_y = end_y.min(height);

    match shape {
        "circle" => {
            // 绘制圆形
            let center_x = (start_x + end_x) as f32 / 2.0;
            let center_y = (start_y + end_y) as f32 / 2.0;
            let radius = ((end_x - start_x) as f32 / 2.0).min((end_y - start_y) as f32 / 2.0);

            for py in start_y..end_y {
                for px in start_x..end_x {
                    let dx = px as f32 - center_x;
                    let dy = py as f32 - center_y;
                    if dx * dx + dy * dy <= radius * radius {
                        img.put_pixel(px, py, Rgba(color));
                    }
                }
            }
        }
        "rounded" => {
            // 绘制圆角矩形
            let radius = ((end_x - start_x) as f32 * 0.3) as u32;

            for py in start_y..end_y {
                for px in start_x..end_x {
                    let mut should_draw = true;

                    // 检查四个角
                    if px < start_x + radius && py < start_y + radius {
                        // 左上角
                        let dx = (start_x + radius - px) as f32;
                        let dy = (start_y + radius - py) as f32;
                        should_draw = dx * dx + dy * dy >= (radius as f32).powi(2) - 1.0;
                    } else if px >= end_x - radius && py < start_y + radius {
                        // 右上角
                        let dx = (px - (end_x - radius)) as f32;
                        let dy = (start_y + radius - py) as f32;
                        should_draw = dx * dx + dy * dy >= (radius as f32).powi(2) - 1.0;
                    } else if px < start_x + radius && py >= end_y - radius {
                        // 左下角
                        let dx = (start_x + radius - px) as f32;
                        let dy = (py - (end_y - radius)) as f32;
                        should_draw = dx * dx + dy * dy >= (radius as f32).powi(2) - 1.0;
                    } else if px >= end_x - radius && py >= end_y - radius {
                        // 右下角
                        let dx = (px - (end_x - radius)) as f32;
                        let dy = (py - (end_y - radius)) as f32;
                        should_draw = dx * dx + dy * dy >= (radius as f32).powi(2) - 1.0;
                    }

                    if should_draw {
                        img.put_pixel(px, py, Rgba(color));
                    }
                }
            }
        }
        _ => {
            // 默认绘制矩形
            for py in start_y..end_y {
                for px in start_x..end_x {
                    img.put_pixel(px, py, Rgba(color));
                }
            }
        }
    }
}

/// 叠加 Logo
fn overlay_logo(
    img: &mut RgbaImage,
    logo_config: &crate::models::qrcode::LogoConfig,
) -> AppResult<()> {
    // 读取 Logo 图片
    let logo_path = Path::new(&logo_config.path);
    let logo_img = ImageReader::open(logo_path)
        .map_err(|e| AppError::IoError(format!("无法读取 Logo 文件: {}", e)))?
        .decode()
        .map_err(|e| AppError::IoError(format!("Logo 解码失败: {}", e)))?;

    // 计算 Logo 尺寸
    let (img_width, img_height) = img.dimensions();
    let logo_max_size = (img_width.min(img_height) as f32 * logo_config.scale) as u32;

    // 调整 Logo 尺寸
    let logo_resized = logo_img.resize(
        logo_max_size,
        logo_max_size,
        image::imageops::FilterType::Lanczos3,
    );

    // 转换为 RGBA
    let logo_rgba = logo_resized.to_rgba8();

    // 计算居中位置
    let logo_x = ((img_width - logo_max_size) / 2) as i64;
    let logo_y = ((img_height - logo_max_size) / 2) as i64;

    // 添加白色边框
    if logo_config.has_border {
        let border_size = logo_config.border_width;
        let border_color = Rgba([255, 255, 255, 255]);

        // 绘制边框
        let y_start = (logo_y - border_size as i64).max(0) as u32;
        let y_end =
            (logo_y + logo_max_size as i64 + border_size as i64).min(img_height as i64) as u32;
        let x_start = (logo_x - border_size as i64).max(0) as u32;
        let x_end =
            (logo_x + logo_max_size as i64 + border_size as i64).min(img_width as i64) as u32;

        for y in y_start..y_end {
            for x in x_start..x_end {
                let is_border = x < logo_x as u32
                    || x >= (logo_x + logo_max_size as i64) as u32
                    || y < logo_y as u32
                    || y >= (logo_y + logo_max_size as i64) as u32;
                if is_border {
                    img.put_pixel(x, y, border_color);
                }
            }
        }
    }

    // 叠加 Logo
    overlay(img, &logo_rgba, logo_x, logo_y);

    Ok(())
}

/// 解析 Hex 颜色
fn parse_hex_color(hex: &str) -> [u8; 4] {
    let hex = hex.trim_start_matches('#');
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
    [r, g, b, 255]
}

/// 插值颜色
fn interpolate_color(start: [u8; 4], end: [u8; 4], progress: f32) -> [u8; 4] {
    [
        (start[0] as f32 + (end[0] as f32 - start[0] as f32) * progress) as u8,
        (start[1] as f32 + (end[1] as f32 - start[1] as f32) * progress) as u8,
        (start[2] as f32 + (end[2] as f32 - start[2] as f32) * progress) as u8,
        255,
    ]
}

/// 将图片转换为 Base64 字符串
///
/// # 参数
///
/// * `img` - 图片数据
///
/// # 返回
///
/// 返回 Base64 编码的 PNG 图片数据（带 data URL 前缀）
pub fn image_to_base64(img: &RgbaImage) -> AppResult<String> {
    let mut bytes = Vec::new();

    // 写入 PNG 格式
    let mut cursor = Cursor::new(&mut bytes);
    img.write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| AppError::IoError(format!("图片编码失败: {}", e)))?;

    // Base64 编码
    let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);

    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::qrcode::{QrConfig, QrStyle};

    #[test]
    fn test_render_basic_qr() {
        let config = QrConfig {
            content: "https://example.com".to_string(),
            size: 512,
            margin: 4,
            error_correction: "M".to_string(),
            style: None,
            logo: None,
        };

        let result = render_qr(&config);
        assert!(result.is_ok());

        let img = result.unwrap();
        assert!(img.dimensions().0 >= 512);
        assert!(img.dimensions().1 >= 512);
    }

    #[test]
    fn test_render_colored_qr() {
        let style = QrStyle {
            dot_shape: "circle".to_string(),
            eye_shape: "square".to_string(),
            foreground_color: "#FF0000".to_string(),
            background_color: "#FFFF00".to_string(),
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

        let result = render_qr(&config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_hex_color() {
        assert_eq!(parse_hex_color("#000000"), [0, 0, 0, 255]);
        assert_eq!(parse_hex_color("#FFFFFF"), [255, 255, 255, 255]);
        assert_eq!(parse_hex_color("#FF0000"), [255, 0, 0, 255]);
    }
}
