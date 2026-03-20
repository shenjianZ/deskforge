//! 图片转换服务
//!
//! 提供图片加载、SVG 光栅化、格式转换和预览生成能力

use std::{fs, io::Cursor, path::Path};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{
    codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, ImageFormat, Rgba, RgbaImage,
};
use resvg::{tiny_skia::Pixmap, usvg};
use webp::Encoder as WebpEncoder;

use crate::{
    error::{AppError, AppResult},
    models::image_converter::{ImageConversionOptions, ImageConversionPreviewResult, ImageOutputFormat},
};

struct LoadedImage {
    image: RgbaImage,
    source_format: String,
    source_width: u32,
    source_height: u32,
    has_alpha: bool,
}

struct EncodedImage {
    bytes: Vec<u8>,
    width: u32,
    height: u32,
}

pub struct ImageConverterService;

impl ImageConverterService {
    pub fn generate_preview(
        input_path: &str,
        options: &ImageConversionOptions,
    ) -> AppResult<ImageConversionPreviewResult> {
        let loaded = load_image(input_path)?;
        validate_options(options)?;

        let encoded = encode_image(&loaded, options)?;
        let preview_format = get_preview_format(options.target_format);
        let preview_options = ImageConversionOptions {
            target_format: preview_format,
            ..options.clone()
        };
        let preview_encoded = encode_image(&loaded, &preview_options)?;
        let mime = match preview_format {
            ImageOutputFormat::Png => "image/png",
            ImageOutputFormat::Jpeg => "image/jpeg",
            ImageOutputFormat::Webp => "image/webp",
            ImageOutputFormat::Bmp => "image/bmp",
            ImageOutputFormat::Tiff => "image/tiff",
            ImageOutputFormat::Ico => "image/x-icon",
        };

        Ok(ImageConversionPreviewResult {
            data_url: format!("data:{};base64,{}", mime, STANDARD.encode(&preview_encoded.bytes)),
            preview_format: preview_format.as_str().to_string(),
            output_format: options.target_format.as_str().to_string(),
            source_format: loaded.source_format,
            source_width: loaded.source_width,
            source_height: loaded.source_height,
            output_width: encoded.width,
            output_height: encoded.height,
            has_alpha: loaded.has_alpha,
            estimated_bytes: encoded.bytes.len(),
        })
    }

    pub fn save_converted_image(input_path: &str, output_path: &str, options: &ImageConversionOptions) -> AppResult<()> {
        let loaded = load_image(input_path)?;
        validate_options(options)?;
        let encoded = encode_image(&loaded, options)?;

        fs::write(output_path, encoded.bytes)
            .map_err(|error| AppError::IoError(format!("保存文件失败: {}", error)))?;

        Ok(())
    }
}

fn get_preview_format(target_format: ImageOutputFormat) -> ImageOutputFormat {
    match target_format {
        ImageOutputFormat::Tiff | ImageOutputFormat::Ico => ImageOutputFormat::Png,
        other => other,
    }
}

fn validate_options(options: &ImageConversionOptions) -> AppResult<()> {
    if options.quality == 0 || options.quality > 100 {
        return Err(AppError::InvalidData("质量必须在 1 到 100 之间".to_string()));
    }

    if !matches!(options.ico_size, 16 | 32 | 48 | 64 | 128 | 256) {
        return Err(AppError::InvalidData(
            "ICO 尺寸必须为 16、32、48、64、128 或 256".to_string(),
        ));
    }

    parse_hex_color(&options.background_color)?;
    Ok(())
}

fn load_image(input_path: &str) -> AppResult<LoadedImage> {
    let path = Path::new(input_path);
    if !path.exists() {
        return Err(AppError::IoError("输入文件不存在".to_string()));
    }

    let source_format = detect_input_format(path)?;
    let rgba = if source_format == "svg" {
        render_svg_to_rgba(input_path)?
    } else {
        image::open(path)
            .map_err(|error| AppError::InvalidData(format!("读取图片失败: {}", error)))?
            .to_rgba8()
    };

    let (width, height) = rgba.dimensions();
    Ok(LoadedImage {
        has_alpha: rgba.pixels().any(|pixel| pixel.0[3] < 255),
        image: rgba,
        source_format,
        source_width: width,
        source_height: height,
    })
}

fn detect_input_format(path: &Path) -> AppResult<String> {
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| AppError::InvalidData("无法识别输入文件扩展名".to_string()))?;

    let normalized = match extension.as_str() {
        "jpg" | "jpeg" => "jpeg",
        "png" => "png",
        "webp" => "webp",
        "bmp" => "bmp",
        "tif" | "tiff" => "tiff",
        "ico" => "ico",
        "svg" => "svg",
        _ => {
            return Err(AppError::InvalidData(format!(
                "不支持的输入格式: .{}",
                extension
            )))
        }
    };

    Ok(normalized.to_string())
}

fn render_svg_to_rgba(input_path: &str) -> AppResult<RgbaImage> {
    let bytes = fs::read(input_path)
        .map_err(|error| AppError::IoError(format!("读取 SVG 文件失败: {}", error)))?;

    let options = usvg::Options::default();
    let tree = usvg::Tree::from_data(&bytes, &options)
        .map_err(|error| AppError::InvalidData(format!("解析 SVG 失败: {}", error)))?;
    let size = tree.size().to_int_size();

    let mut pixmap = Pixmap::new(size.width(), size.height())
        .ok_or_else(|| AppError::InvalidData("SVG 尺寸无效，无法创建位图".to_string()))?;

    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());

    RgbaImage::from_raw(size.width(), size.height(), pixmap.take())
        .ok_or_else(|| AppError::InvalidData("SVG 渲染结果无效".to_string()))
}

fn encode_image(loaded: &LoadedImage, options: &ImageConversionOptions) -> AppResult<EncodedImage> {
    let mut output_image = loaded.image.clone();
    if options.target_format == ImageOutputFormat::Ico {
        output_image = image::imageops::resize(
            &output_image,
            options.ico_size,
            options.ico_size,
            FilterType::Lanczos3,
        );
    }

    if loaded.has_alpha && !options.target_format.supports_alpha() {
        let background = parse_hex_color(&options.background_color)?;
        flatten_alpha(&mut output_image, background);
    }

    let width = output_image.width();
    let height = output_image.height();
    let bytes = encode_to_bytes(output_image, options)?;

    Ok(EncodedImage { bytes, width, height })
}

fn encode_to_bytes(image: RgbaImage, options: &ImageConversionOptions) -> AppResult<Vec<u8>> {
    let dynamic = DynamicImage::ImageRgba8(image.clone());
    let mut bytes = Vec::new();

    match options.target_format {
        ImageOutputFormat::Png => dynamic
            .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
            .map_err(|error| AppError::IoError(format!("编码 PNG 失败: {}", error)))?,
        ImageOutputFormat::Bmp => dynamic
            .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Bmp)
            .map_err(|error| AppError::IoError(format!("编码 BMP 失败: {}", error)))?,
        ImageOutputFormat::Tiff => dynamic
            .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Tiff)
            .map_err(|error| AppError::IoError(format!("编码 TIFF 失败: {}", error)))?,
        ImageOutputFormat::Ico => dynamic
            .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Ico)
            .map_err(|error| AppError::IoError(format!("编码 ICO 失败: {}", error)))?,
        ImageOutputFormat::Jpeg => {
            let rgb = DynamicImage::ImageRgba8(image).to_rgb8();
            let (width, height) = rgb.dimensions();
            let mut encoder = JpegEncoder::new_with_quality(&mut bytes, options.quality);
            encoder
                .encode(&rgb, width, height, image::ColorType::Rgb8.into())
                .map_err(|error| AppError::IoError(format!("编码 JPEG 失败: {}", error)))?;
        }
        ImageOutputFormat::Webp => {
            if options.webp_lossless {
                let encoded = WebpEncoder::from_rgba(image.as_raw(), image.width(), image.height()).encode_lossless();
                bytes = encoded.to_vec();
            } else {
                let encoded =
                    WebpEncoder::from_rgba(image.as_raw(), image.width(), image.height()).encode(options.quality as f32);
                bytes = encoded.to_vec();
            }
        }
    }

    Ok(bytes)
}

fn parse_hex_color(input: &str) -> AppResult<Rgba<u8>> {
    let value = input.trim();
    let raw = value.strip_prefix('#').unwrap_or(value);
    if raw.len() != 6 {
        return Err(AppError::InvalidData(
            "背景色必须是 #RRGGBB 格式".to_string(),
        ));
    }

    let red = u8::from_str_radix(&raw[0..2], 16)
        .map_err(|_| AppError::InvalidData("背景色格式无效".to_string()))?;
    let green = u8::from_str_radix(&raw[2..4], 16)
        .map_err(|_| AppError::InvalidData("背景色格式无效".to_string()))?;
    let blue = u8::from_str_radix(&raw[4..6], 16)
        .map_err(|_| AppError::InvalidData("背景色格式无效".to_string()))?;

    Ok(Rgba([red, green, blue, 255]))
}

fn flatten_alpha(image: &mut RgbaImage, background: Rgba<u8>) {
    for pixel in image.pixels_mut() {
        let alpha = pixel.0[3] as f32 / 255.0;
        let inv_alpha = 1.0 - alpha;

        pixel.0[0] = blend_channel(pixel.0[0], background.0[0], alpha, inv_alpha);
        pixel.0[1] = blend_channel(pixel.0[1], background.0[1], alpha, inv_alpha);
        pixel.0[2] = blend_channel(pixel.0[2], background.0[2], alpha, inv_alpha);
        pixel.0[3] = 255;
    }
}

fn blend_channel(foreground: u8, background: u8, alpha: f32, inv_alpha: f32) -> u8 {
    ((foreground as f32 * alpha) + (background as f32 * inv_alpha)).round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_ico_size_rejects_invalid_value() {
        let options = ImageConversionOptions {
            ico_size: 24,
            ..ImageConversionOptions::default()
        };

        let result = validate_options(&options);
        assert!(result.is_err());
    }

    #[test]
    fn flatten_alpha_blends_with_background() {
        let mut image = RgbaImage::from_pixel(1, 1, Rgba([255, 0, 0, 128]));
        flatten_alpha(&mut image, Rgba([255, 255, 255, 255]));
        let pixel = image.get_pixel(0, 0);

        assert_eq!(pixel.0[3], 255);
        assert!(pixel.0[1] > 120);
        assert!(pixel.0[2] > 120);
    }

    #[test]
    fn render_svg_input_succeeds() {
        let svg = br##"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#ff0000"/></svg>"##;
        let options = usvg::Options::default();
        let tree = usvg::Tree::from_data(svg, &options).expect("svg should parse");
        let size = tree.size().to_int_size();
        let mut pixmap = Pixmap::new(size.width(), size.height()).expect("pixmap should build");

        resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
        let image = RgbaImage::from_raw(size.width(), size.height(), pixmap.take());

        assert!(image.is_some());
    }

    #[test]
    fn tiff_preview_falls_back_to_png() {
        assert_eq!(get_preview_format(ImageOutputFormat::Tiff), ImageOutputFormat::Png);
        assert_eq!(get_preview_format(ImageOutputFormat::Ico), ImageOutputFormat::Png);
        assert_eq!(get_preview_format(ImageOutputFormat::Jpeg), ImageOutputFormat::Jpeg);
    }
}
