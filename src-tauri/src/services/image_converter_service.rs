//! 图片转换服务
//!
//! 提供图片信息读取、压缩、裁剪、缩放和格式转换能力

use std::{fs, io::Cursor, path::Path};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{
    codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, ImageFormat, Rgba, RgbaImage,
};
use resvg::{tiny_skia::Pixmap, usvg};
use webp::Encoder as WebpEncoder;

use crate::{
    error::{AppError, AppResult},
    models::image_converter::{
        ImageCompressionOptions, ImageConversionOptions, ImageConversionPreviewResult,
        ImageCropOptions, ImageOutputFormat, ImageResampleMode, ImageResizeOptions,
        ImageSourceInfo,
    },
};

struct LoadedImage {
    image: RgbaImage,
    source_format: String,
    source_width: u32,
    source_height: u32,
    has_alpha: bool,
    source_bytes: usize,
}

struct EncodedImage {
    bytes: Vec<u8>,
    width: u32,
    height: u32,
    has_alpha: bool,
}

const MAX_IMAGE_DIMENSION: u32 = 8192;
const MAX_IMAGE_PIXELS: u64 = 33_554_432;

pub struct ImageConverterService;

impl ImageConverterService {
    pub fn get_image_info(input_path: &str) -> AppResult<ImageSourceInfo> {
        let loaded = load_image(input_path)?;
        Ok(ImageSourceInfo {
            source_format: loaded.source_format,
            width: loaded.source_width,
            height: loaded.source_height,
            has_alpha: loaded.has_alpha,
            file_size: loaded.source_bytes,
            preview_data_url: build_source_preview_data_url(&loaded.image)?,
        })
    }

    pub fn generate_preview(
        input_path: &str,
        options: &ImageConversionOptions,
    ) -> AppResult<ImageConversionPreviewResult> {
        let loaded = load_image(input_path)?;
        validate_conversion_options(options)?;
        let prepared =
            prepare_conversion_image(&loaded.image, options.target_format, options.ico_size);
        build_preview_result(
            &loaded,
            prepared,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            options.ico_size,
        )
    }

    pub fn save_converted_image(
        input_path: &str,
        output_path: &str,
        options: &ImageConversionOptions,
    ) -> AppResult<()> {
        let loaded = load_image(input_path)?;
        validate_conversion_options(options)?;
        let prepared =
            prepare_conversion_image(&loaded.image, options.target_format, options.ico_size);
        save_processed_image(
            prepared,
            output_path,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            options.ico_size,
        )
    }

    pub fn generate_compression_preview(
        input_path: &str,
        options: &ImageCompressionOptions,
    ) -> AppResult<ImageConversionPreviewResult> {
        let loaded = load_image(input_path)?;
        validate_compression_options(options)?;
        build_preview_result(
            &loaded,
            loaded.image.clone(),
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            256,
        )
    }

    pub fn save_compressed_image(
        input_path: &str,
        output_path: &str,
        options: &ImageCompressionOptions,
    ) -> AppResult<()> {
        let loaded = load_image(input_path)?;
        validate_compression_options(options)?;
        save_processed_image(
            loaded.image,
            output_path,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            256,
        )
    }

    pub fn generate_crop_preview(
        input_path: &str,
        options: &ImageCropOptions,
    ) -> AppResult<ImageConversionPreviewResult> {
        let loaded = load_image(input_path)?;
        validate_crop_options(&loaded, options)?;
        let prepared = prepare_cropped_image(&loaded.image, options)?;
        build_preview_result(
            &loaded,
            prepared,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            options.ico_size,
        )
    }

    pub fn save_cropped_image(
        input_path: &str,
        output_path: &str,
        options: &ImageCropOptions,
    ) -> AppResult<()> {
        let loaded = load_image(input_path)?;
        validate_crop_options(&loaded, options)?;
        let prepared = prepare_cropped_image(&loaded.image, options)?;
        save_processed_image(
            prepared,
            output_path,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            options.ico_size,
        )
    }

    pub fn generate_resize_preview(
        input_path: &str,
        options: &ImageResizeOptions,
    ) -> AppResult<ImageConversionPreviewResult> {
        let loaded = load_image(input_path)?;
        validate_resize_options(options)?;
        let prepared = prepare_resized_image(&loaded.image, options);
        build_preview_result(
            &loaded,
            prepared,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            256,
        )
    }

    pub fn save_resized_image(
        input_path: &str,
        output_path: &str,
        options: &ImageResizeOptions,
    ) -> AppResult<()> {
        let loaded = load_image(input_path)?;
        validate_resize_options(options)?;
        let prepared = prepare_resized_image(&loaded.image, options);
        save_processed_image(
            prepared,
            output_path,
            options.target_format,
            options.quality,
            options.webp_lossless,
            &options.background_color,
            256,
        )
    }
}

fn build_preview_result(
    loaded: &LoadedImage,
    prepared: RgbaImage,
    target_format: ImageOutputFormat,
    quality: u8,
    webp_lossless: bool,
    background_color: &str,
    ico_size: u32,
) -> AppResult<ImageConversionPreviewResult> {
    let encoded = encode_image(
        prepared.clone(),
        target_format,
        quality,
        webp_lossless,
        background_color,
        ico_size,
    )?;
    let preview_format = get_preview_format(target_format);
    let preview_encoded = encode_image(
        prepared,
        preview_format,
        quality,
        webp_lossless,
        background_color,
        ico_size,
    )?;
    let mime = match preview_format {
        ImageOutputFormat::Png => "image/png",
        ImageOutputFormat::Jpeg => "image/jpeg",
        ImageOutputFormat::Webp => "image/webp",
        ImageOutputFormat::Bmp => "image/bmp",
        ImageOutputFormat::Tiff => "image/tiff",
        ImageOutputFormat::Ico => "image/x-icon",
    };

    Ok(ImageConversionPreviewResult {
        data_url: format!(
            "data:{};base64,{}",
            mime,
            STANDARD.encode(&preview_encoded.bytes)
        ),
        preview_format: preview_format.as_str().to_string(),
        output_format: target_format.as_str().to_string(),
        source_format: loaded.source_format.clone(),
        source_width: loaded.source_width,
        source_height: loaded.source_height,
        output_width: encoded.width,
        output_height: encoded.height,
        has_alpha: encoded.has_alpha,
        source_bytes: loaded.source_bytes,
        estimated_bytes: encoded.bytes.len(),
    })
}

fn save_processed_image(
    prepared: RgbaImage,
    output_path: &str,
    target_format: ImageOutputFormat,
    quality: u8,
    webp_lossless: bool,
    background_color: &str,
    ico_size: u32,
) -> AppResult<()> {
    let encoded = encode_image(
        prepared,
        target_format,
        quality,
        webp_lossless,
        background_color,
        ico_size,
    )?;
    fs::write(output_path, encoded.bytes)
        .map_err(|error| AppError::IoError(format!("保存文件失败: {}", error)))?;
    Ok(())
}

fn build_source_preview_data_url(image: &RgbaImage) -> AppResult<String> {
    let encoded = encode_image(
        image.clone(),
        ImageOutputFormat::Png,
        92,
        false,
        "#FFFFFF",
        256,
    )?;
    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(&encoded.bytes)
    ))
}

fn get_preview_format(target_format: ImageOutputFormat) -> ImageOutputFormat {
    match target_format {
        ImageOutputFormat::Tiff | ImageOutputFormat::Ico => ImageOutputFormat::Png,
        other => other,
    }
}

fn validate_conversion_options(options: &ImageConversionOptions) -> AppResult<()> {
    validate_quality(options.quality)?;
    validate_ico_size(options.ico_size)?;
    parse_hex_color(&options.background_color)?;
    Ok(())
}

fn validate_compression_options(options: &ImageCompressionOptions) -> AppResult<()> {
    validate_quality(options.quality)?;
    parse_hex_color(&options.background_color)?;
    if !matches!(
        options.target_format,
        ImageOutputFormat::Png | ImageOutputFormat::Jpeg | ImageOutputFormat::Webp
    ) {
        return Err(AppError::InvalidData(
            "压缩工具仅支持输出 PNG、JPEG 或 WebP".to_string(),
        ));
    }
    Ok(())
}

fn validate_crop_options(loaded: &LoadedImage, options: &ImageCropOptions) -> AppResult<()> {
    validate_quality(options.quality)?;
    validate_ico_size(options.ico_size)?;
    parse_hex_color(&options.background_color)?;

    if options.crop_width == 0 || options.crop_height == 0 {
        return Err(AppError::InvalidData("裁剪区域宽高必须大于 0".to_string()));
    }

    let max_x = options.crop_x.saturating_add(options.crop_width);
    let max_y = options.crop_y.saturating_add(options.crop_height);
    if max_x > loaded.source_width || max_y > loaded.source_height {
        return Err(AppError::InvalidData("裁剪区域超出原图范围".to_string()));
    }

    if let Some(output_size) = options.output_size {
        if output_size == 0 {
            return Err(AppError::InvalidData("输出尺寸必须大于 0".to_string()));
        }
        validate_output_bounds(output_size, output_size)?;
    }

    if options.target_format == ImageOutputFormat::Ico && options.crop_width != options.crop_height
    {
        return Err(AppError::InvalidData(
            "ICO 导出要求裁剪区域为 1:1 方形".to_string(),
        ));
    }

    Ok(())
}

fn validate_resize_options(options: &ImageResizeOptions) -> AppResult<()> {
    validate_quality(options.quality)?;
    parse_hex_color(&options.background_color)?;
    if options.target_width == 0 || options.target_height == 0 {
        return Err(AppError::InvalidData("目标尺寸必须大于 0".to_string()));
    }
    validate_output_bounds(options.target_width, options.target_height)?;

    if matches!(
        options.target_format,
        ImageOutputFormat::Bmp | ImageOutputFormat::Tiff | ImageOutputFormat::Ico
    ) {
        return Err(AppError::InvalidData(
            "缩放工具首版仅支持输出 PNG、JPEG 或 WebP".to_string(),
        ));
    }

    Ok(())
}

fn validate_output_bounds(width: u32, height: u32) -> AppResult<()> {
    if width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION {
        return Err(AppError::InvalidData(format!(
            "输出尺寸不能超过 {} x {}",
            MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION
        )));
    }

    if (width as u64) * (height as u64) > MAX_IMAGE_PIXELS {
        return Err(AppError::InvalidData(
            "输出像素总量过大，请缩小尺寸".to_string(),
        ));
    }

    Ok(())
}

fn validate_quality(quality: u8) -> AppResult<()> {
    if quality == 0 || quality > 100 {
        return Err(AppError::InvalidData(
            "质量必须在 1 到 100 之间".to_string(),
        ));
    }
    Ok(())
}

fn validate_ico_size(size: u32) -> AppResult<()> {
    if !matches!(size, 16 | 32 | 48 | 64 | 128 | 256 | 512) {
        return Err(AppError::InvalidData(
            "ICO 尺寸必须为 16、32、48、64、128、256 或 512".to_string(),
        ));
    }
    Ok(())
}

fn load_image(input_path: &str) -> AppResult<LoadedImage> {
    let path = Path::new(input_path);
    if !path.exists() {
        return Err(AppError::IoError("输入文件不存在".to_string()));
    }

    let bytes = fs::read(path)
        .map_err(|error| AppError::IoError(format!("读取图片文件失败: {}", error)))?;
    let source_bytes = bytes.len();
    let source_format = detect_input_format(path, &bytes)?;
    let rgba = if source_format == "svg" {
        render_svg_to_rgba_bytes(&bytes)?
    } else {
        image::load_from_memory(&bytes)
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
        source_bytes,
    })
}

fn detect_input_format(path: &Path, bytes: &[u8]) -> AppResult<String> {
    if is_svg_input(bytes, path) {
        return Ok("svg".to_string());
    }

    let guessed = image::guess_format(bytes)
        .map_err(|error| AppError::InvalidData(format!("无法识别图片格式: {}", error)))?;

    let normalized = match guessed {
        ImageFormat::Jpeg => "jpeg",
        ImageFormat::Png => "png",
        ImageFormat::WebP => "webp",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Tiff => "tiff",
        ImageFormat::Ico => "ico",
        _ => {
            return Err(AppError::InvalidData(format!(
                "暂不支持的图片格式: {}",
                guessed
                    .extensions_str()
                    .first()
                    .copied()
                    .unwrap_or("unknown")
            )))
        }
    };

    Ok(normalized.to_string())
}

fn render_svg_to_rgba_bytes(bytes: &[u8]) -> AppResult<RgbaImage> {
    let options = usvg::Options::default();
    let tree = usvg::Tree::from_data(bytes, &options)
        .map_err(|error| AppError::InvalidData(format!("解析 SVG 失败: {}", error)))?;
    let size = tree.size().to_int_size();
    let mut pixmap = Pixmap::new(size.width(), size.height())
        .ok_or_else(|| AppError::InvalidData("SVG 尺寸无效，无法创建位图".to_string()))?;

    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    RgbaImage::from_raw(size.width(), size.height(), pixmap.take())
        .ok_or_else(|| AppError::InvalidData("SVG 渲染结果无效".to_string()))
}

fn is_svg_input(bytes: &[u8], path: &Path) -> bool {
    let sniff = String::from_utf8_lossy(&bytes[..bytes.len().min(256)])
        .trim_start()
        .to_ascii_lowercase();
    if sniff.starts_with("<svg") || sniff.starts_with("<?xml") {
        return sniff.contains("<svg");
    }

    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("svg")),
        Some(true)
    )
}

fn prepare_conversion_image(
    image: &RgbaImage,
    target_format: ImageOutputFormat,
    ico_size: u32,
) -> RgbaImage {
    if target_format == ImageOutputFormat::Ico {
        image::imageops::resize(image, ico_size, ico_size, FilterType::Lanczos3)
    } else {
        image.clone()
    }
}

fn prepare_cropped_image(image: &RgbaImage, options: &ImageCropOptions) -> AppResult<RgbaImage> {
    let cropped = image::imageops::crop_imm(
        image,
        options.crop_x,
        options.crop_y,
        options.crop_width,
        options.crop_height,
    )
    .to_image();

    let processed = if let Some(output_size) = options.output_size {
        image::imageops::resize(&cropped, output_size, output_size, FilterType::Lanczos3)
    } else if options.target_format == ImageOutputFormat::Ico {
        image::imageops::resize(
            &cropped,
            options.ico_size,
            options.ico_size,
            FilterType::Lanczos3,
        )
    } else {
        cropped
    };

    Ok(processed)
}

fn prepare_resized_image(image: &RgbaImage, options: &ImageResizeOptions) -> RgbaImage {
    image::imageops::resize(
        image,
        options.target_width,
        options.target_height,
        match options.resample_mode {
            ImageResampleMode::Quality => FilterType::Lanczos3,
            ImageResampleMode::Fast => FilterType::Triangle,
        },
    )
}

fn encode_image(
    mut image: RgbaImage,
    target_format: ImageOutputFormat,
    quality: u8,
    webp_lossless: bool,
    background_color: &str,
    ico_size: u32,
) -> AppResult<EncodedImage> {
    if target_format == ImageOutputFormat::Ico
        && (image.width() != ico_size || image.height() != ico_size)
    {
        image = image::imageops::resize(&image, ico_size, ico_size, FilterType::Lanczos3);
    }

    let has_alpha = image.pixels().any(|pixel| pixel.0[3] < 255);
    let output_has_alpha = has_alpha && target_format.supports_alpha();
    if has_alpha && !target_format.supports_alpha() {
        let background = parse_hex_color(background_color)?;
        flatten_alpha(&mut image, background);
    }

    let width = image.width();
    let height = image.height();
    let bytes = encode_to_bytes(image, target_format, quality, webp_lossless)?;

    Ok(EncodedImage {
        bytes,
        width,
        height,
        has_alpha: output_has_alpha,
    })
}

fn encode_to_bytes(
    image: RgbaImage,
    target_format: ImageOutputFormat,
    quality: u8,
    webp_lossless: bool,
) -> AppResult<Vec<u8>> {
    let dynamic = DynamicImage::ImageRgba8(image.clone());
    let mut bytes = Vec::new();

    match target_format {
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
            let mut encoder = JpegEncoder::new_with_quality(&mut bytes, quality);
            encoder
                .encode(&rgb, width, height, image::ColorType::Rgb8.into())
                .map_err(|error| AppError::IoError(format!("编码 JPEG 失败: {}", error)))?;
        }
        ImageOutputFormat::Webp => {
            if webp_lossless {
                bytes = WebpEncoder::from_rgba(image.as_raw(), image.width(), image.height())
                    .encode_lossless()
                    .to_vec();
            } else {
                bytes = WebpEncoder::from_rgba(image.as_raw(), image.width(), image.height())
                    .encode(quality as f32)
                    .to_vec();
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
        assert!(validate_ico_size(24).is_err());
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
        assert_eq!(
            get_preview_format(ImageOutputFormat::Tiff),
            ImageOutputFormat::Png
        );
        assert_eq!(
            get_preview_format(ImageOutputFormat::Ico),
            ImageOutputFormat::Png
        );
        assert_eq!(
            get_preview_format(ImageOutputFormat::Jpeg),
            ImageOutputFormat::Jpeg
        );
    }

    #[test]
    fn crop_validator_rejects_out_of_bounds() {
        let loaded = LoadedImage {
            image: RgbaImage::new(10, 10),
            source_format: "png".to_string(),
            source_width: 10,
            source_height: 10,
            has_alpha: false,
            source_bytes: 10,
        };
        let options = ImageCropOptions {
            crop_x: 5,
            crop_y: 5,
            crop_width: 10,
            crop_height: 10,
            target_format: ImageOutputFormat::Png,
            quality: 90,
            webp_lossless: false,
            background_color: "#FFFFFF".to_string(),
            ico_size: 256,
            output_size: None,
        };
        assert!(validate_crop_options(&loaded, &options).is_err());
    }

    #[test]
    fn ico_crop_requires_square_selection() {
        let loaded = LoadedImage {
            image: RgbaImage::new(100, 100),
            source_format: "png".to_string(),
            source_width: 100,
            source_height: 100,
            has_alpha: true,
            source_bytes: 10,
        };
        let options = ImageCropOptions {
            crop_x: 0,
            crop_y: 0,
            crop_width: 64,
            crop_height: 32,
            target_format: ImageOutputFormat::Ico,
            quality: 90,
            webp_lossless: false,
            background_color: "#FFFFFF".to_string(),
            ico_size: 256,
            output_size: None,
        };

        assert!(validate_crop_options(&loaded, &options).is_err());
    }

    #[test]
    fn output_bounds_reject_huge_dimensions() {
        assert!(validate_output_bounds(9000, 100).is_err());
        assert!(validate_output_bounds(8192, 8192).is_err());
    }

    #[test]
    fn detect_format_from_jfif_content() {
        let image = DynamicImage::ImageRgba8(RgbaImage::from_pixel(1, 1, Rgba([0, 0, 0, 255])));
        let mut bytes = Vec::new();
        image
            .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Jpeg)
            .expect("jpeg should encode");

        let format = detect_input_format(Path::new("sample.jfif"), &bytes)
            .expect("format should be detected");
        assert_eq!(format, "jpeg");
    }
}
