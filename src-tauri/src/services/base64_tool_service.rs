//! Base64 工具服务
//!
//! 提供 Base64 编解码功能的核心业务逻辑

use std::{fs, path::Path};

use base64::{engine::general_purpose, Engine as _};
use image::GenericImageView;

use crate::error::AppResult;
use crate::models::base64_tool::{
    Base64ImageResult, Base64ProcessConfig, Base64ProcessResult, Base64ValidateResult,
};
use crate::utils::base64_tool;
use crate::AppError;

/// Base64 工具服务
pub struct Base64ToolService;

impl Base64ToolService {
    /// 编码文本为 Base64
    pub fn encode(input: &str, config: &Base64ProcessConfig) -> AppResult<Base64ProcessResult> {
        if input.is_empty() {
            return Ok(Base64ProcessResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        Ok(Base64ProcessResult {
            success: true,
            result: base64_tool::encode_base64(input, config),
            error: None,
        })
    }

    /// 解码 Base64 为文本
    pub fn decode(input: &str, config: &Base64ProcessConfig) -> AppResult<Base64ProcessResult> {
        if input.trim().is_empty() {
            return Ok(Base64ProcessResult {
                success: false,
                result: String::new(),
                error: Some("输入内容不能为空".to_string()),
            });
        }

        match base64_tool::decode_base64(input, config) {
            Ok(result) => Ok(Base64ProcessResult {
                success: true,
                result,
                error: None,
            }),
            Err(error) => Ok(Base64ProcessResult {
                success: false,
                result: String::new(),
                error: Some(error),
            }),
        }
    }

    /// 校验输入是否为有效的 Base64
    pub fn validate(input: &str, config: &Base64ProcessConfig) -> AppResult<Base64ValidateResult> {
        if input.trim().is_empty() {
            return Ok(Base64ValidateResult {
                is_valid: false,
                error_message: Some("输入内容不能为空".to_string()),
            });
        }

        match base64_tool::validate_base64(input, config) {
            Ok(_) => Ok(Base64ValidateResult {
                is_valid: true,
                error_message: None,
            }),
            Err(error) => Ok(Base64ValidateResult {
                is_valid: false,
                error_message: Some(error),
            }),
        }
    }

    /// 将图片文件编码为 Base64 与 Data URL
    pub fn encode_image(input_path: &str) -> AppResult<Base64ImageResult> {
        let path = Path::new(input_path);
        if !path.exists() {
            return Err(AppError::IoError("输入文件不存在".to_string()));
        }

        let bytes = fs::read(path)
            .map_err(|error| AppError::IoError(format!("读取图片文件失败: {}", error)))?;
        build_image_result_from_bytes(&bytes, None)
    }

    /// 将 Base64 或 Data URL 解码为图片结果
    pub fn decode_image(input: &str) -> AppResult<Base64ImageResult> {
        let parsed = parse_base64_image_input(input)?;
        build_image_result_from_bytes(&parsed.bytes, parsed.mime.as_deref())
    }

    /// 将 Base64 或 Data URL 解码并保存为图片文件
    pub fn save_image(output_path: &str, input: &str) -> AppResult<()> {
        let parsed = parse_base64_image_input(input)?;
        fs::write(output_path, parsed.bytes)
            .map_err(|error| AppError::IoError(format!("保存图片文件失败: {}", error)))?;
        Ok(())
    }
}

struct ParsedBase64ImageInput {
    bytes: Vec<u8>,
    mime: Option<String>,
}

fn parse_base64_image_input(input: &str) -> AppResult<ParsedBase64ImageInput> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidData("输入内容不能为空".to_string()));
    }

    if let Some(content) = trimmed.strip_prefix("data:") {
        let (header, payload) = content
            .split_once(',')
            .ok_or_else(|| AppError::InvalidData("Data URL 格式无效".to_string()))?;

        if !header.contains(";base64") {
            return Err(AppError::InvalidData(
                "仅支持 base64 编码的 Data URL".to_string(),
            ));
        }

        let mime = header
            .split(';')
            .next()
            .filter(|value| !value.is_empty())
            .map(ToString::to_string);

        let bytes = decode_image_base64(payload)?;
        return Ok(ParsedBase64ImageInput { bytes, mime });
    }

    let bytes = decode_image_base64(trimmed)?;
    Ok(ParsedBase64ImageInput { bytes, mime: None })
}

fn decode_image_base64(input: &str) -> AppResult<Vec<u8>> {
    general_purpose::STANDARD
        .decode(input)
        .or_else(|_| general_purpose::URL_SAFE.decode(input))
        .map_err(|error| AppError::InvalidData(format!("Base64 解码失败: {}", error)))
}

fn build_image_result_from_bytes(
    bytes: &[u8],
    mime_hint: Option<&str>,
) -> AppResult<Base64ImageResult> {
    let format = image::guess_format(bytes)
        .map_err(|error| AppError::InvalidData(format!("无法识别图片格式: {}", error)))?;
    let decoded = image::load_from_memory(bytes)
        .map_err(|error| AppError::InvalidData(format!("读取图片失败: {}", error)))?;
    let (width, height) = decoded.dimensions();

    let (mime, format_name, extension) = format_meta(format, mime_hint);
    let base64 = general_purpose::STANDARD.encode(bytes);

    Ok(Base64ImageResult {
        data_url: format!("data:{};base64,{}", mime, base64),
        base64,
        mime,
        format: format_name,
        suggested_extension: extension,
        width,
        height,
        byte_size: bytes.len(),
    })
}

fn format_meta(format: image::ImageFormat, mime_hint: Option<&str>) -> (String, String, String) {
    match format {
        image::ImageFormat::Png => (
            "image/png".to_string(),
            "png".to_string(),
            "png".to_string(),
        ),
        image::ImageFormat::Jpeg => (
            "image/jpeg".to_string(),
            "jpeg".to_string(),
            "jpg".to_string(),
        ),
        image::ImageFormat::WebP => (
            "image/webp".to_string(),
            "webp".to_string(),
            "webp".to_string(),
        ),
        image::ImageFormat::Bmp => (
            "image/bmp".to_string(),
            "bmp".to_string(),
            "bmp".to_string(),
        ),
        image::ImageFormat::Tiff => (
            "image/tiff".to_string(),
            "tiff".to_string(),
            "tiff".to_string(),
        ),
        image::ImageFormat::Ico => (
            "image/x-icon".to_string(),
            "ico".to_string(),
            "ico".to_string(),
        ),
        image::ImageFormat::Gif => (
            "image/gif".to_string(),
            "gif".to_string(),
            "gif".to_string(),
        ),
        other => (
            mime_hint.unwrap_or("application/octet-stream").to_string(),
            format!("{:?}", other).to_lowercase(),
            "bin".to_string(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
    use std::{env, io::Cursor};

    #[test]
    fn test_encode_text() {
        let result =
            Base64ToolService::encode("DeskForge", &Base64ProcessConfig::default()).unwrap();
        assert!(result.success);
        assert_eq!(result.result, "RGVza0Zvcmdl");
    }

    #[test]
    fn test_decode_text() {
        let result =
            Base64ToolService::decode("RGVza0Zvcmdl", &Base64ProcessConfig::default()).unwrap();
        assert!(result.success);
        assert_eq!(result.result, "DeskForge");
    }

    #[test]
    fn test_validate_invalid_input() {
        let result =
            Base64ToolService::validate("bad@@@", &Base64ProcessConfig::default()).unwrap();
        assert!(!result.is_valid);
        assert!(result.error_message.is_some());
    }

    fn sample_png_bytes() -> Vec<u8> {
        let image = DynamicImage::ImageRgba8(RgbaImage::from_pixel(2, 1, Rgba([255, 0, 0, 255])));
        let mut cursor = Cursor::new(Vec::new());
        image.write_to(&mut cursor, ImageFormat::Png).unwrap();
        cursor.into_inner()
    }

    #[test]
    fn test_encode_image() {
        let bytes = sample_png_bytes();
        let path = env::temp_dir().join("deskforge-base64-image-encode.png");
        fs::write(&path, &bytes).unwrap();

        let result = Base64ToolService::encode_image(path.to_str().unwrap()).unwrap();
        assert_eq!(result.mime, "image/png");
        assert_eq!(result.format, "png");
        assert_eq!(result.width, 2);
        assert_eq!(result.height, 1);
        assert!(result.data_url.starts_with("data:image/png;base64,"));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn test_decode_image_from_data_url() {
        let bytes = sample_png_bytes();
        let input = format!(
            "data:image/png;base64,{}",
            general_purpose::STANDARD.encode(bytes)
        );

        let result = Base64ToolService::decode_image(&input).unwrap();
        assert_eq!(result.mime, "image/png");
        assert_eq!(result.suggested_extension, "png");
        assert_eq!(result.width, 2);
        assert_eq!(result.height, 1);
    }

    #[test]
    fn test_decode_image_rejects_non_image() {
        let input = general_purpose::STANDARD.encode("not an image");
        let error = Base64ToolService::decode_image(&input).unwrap_err();
        assert!(error.to_string().contains("无法识别图片格式"));
    }

    #[test]
    fn test_save_image() {
        let bytes = sample_png_bytes();
        let input = general_purpose::STANDARD.encode(&bytes);
        let path = env::temp_dir().join("deskforge-base64-image-save.png");

        Base64ToolService::save_image(path.to_str().unwrap(), &input).unwrap();

        let saved = image::open(&path).unwrap();
        assert_eq!(saved.dimensions(), (2, 1));

        let _ = fs::remove_file(path);
    }
}
