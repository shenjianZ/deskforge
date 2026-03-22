//! Markdown 预览服务
//!
//! 提供本地资源解析与导出文件保存能力

use std::{
    fs,
    path::{Path, PathBuf},
};

use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::{
    error::{AppError, AppResult},
    models::markdown_preview::{ResolvedMarkdownAsset, ResolvedMarkdownPdfFont},
};

pub struct MarkdownPreviewService;

impl MarkdownPreviewService {
    pub fn resolve_asset(
        asset_path: &str,
        base_dir: Option<&str>,
    ) -> AppResult<ResolvedMarkdownAsset> {
        let normalized_input = normalize_asset_path(asset_path);
        if normalized_input.is_empty() {
            return Err(AppError::InvalidData("图片路径不能为空".to_string()));
        }

        let resolved = resolve_to_local_path(&normalized_input, base_dir)?;
        let bytes = fs::read(&resolved)
            .map_err(|error| AppError::IoError(format!("读取 Markdown 资源失败: {}", error)))?;
        let mime = detect_mime_type(&resolved, &bytes);

        Ok(ResolvedMarkdownAsset {
            original_path: asset_path.to_string(),
            resolved_path: normalize_display_path(&resolved),
            data_url: format!("data:{};base64,{}", mime, STANDARD.encode(bytes)),
        })
    }

    pub fn save_export(output_path: &str, content_base64: &str) -> AppResult<()> {
        let bytes = STANDARD
            .decode(content_base64)
            .map_err(|error| AppError::InvalidData(format!("导出内容无效: {}", error)))?;
        fs::write(output_path, bytes)
            .map_err(|error| AppError::IoError(format!("保存导出文件失败: {}", error)))?;
        Ok(())
    }

    pub fn resolve_pdf_font() -> AppResult<ResolvedMarkdownPdfFont> {
        let candidate = find_pdf_font_candidate().ok_or_else(|| {
            AppError::InvalidData(
                "未找到可用于 PDF 导出的中文字体，请安装黑体、等线或宋体增强字体".to_string(),
            )
        })?;

        let bytes = fs::read(&candidate)
            .map_err(|error| AppError::IoError(format!("读取 PDF 字体失败: {}", error)))?;

        Ok(ResolvedMarkdownPdfFont {
            family: "deskforge-cjk".to_string(),
            source_path: normalize_display_path(&candidate),
            data_base64: STANDARD.encode(bytes),
        })
    }
}

fn normalize_asset_path(input: &str) -> String {
    input
        .trim()
        .trim_start_matches("file://")
        .trim()
        .trim_matches('<')
        .trim_matches('>')
        .to_string()
}

fn resolve_to_local_path(input: &str, base_dir: Option<&str>) -> AppResult<PathBuf> {
    let path = Path::new(input);
    let candidate = if path.is_absolute() {
        path.to_path_buf()
    } else if let Some(base_dir) = base_dir {
        Path::new(base_dir).join(path)
    } else {
        return Err(AppError::InvalidData(
            "相对路径图片需要先选择资源根目录".to_string(),
        ));
    };

    let canonical = candidate.canonicalize().map_err(|error| {
        AppError::IoError(format!(
            "无法定位图片资源 {}: {}",
            candidate.to_string_lossy(),
            error
        ))
    })?;

    if !canonical.exists() {
        return Err(AppError::IoError("图片资源不存在".to_string()));
    }

    Ok(canonical)
}

fn normalize_display_path(path: &Path) -> String {
    #[cfg(windows)]
    {
        let value = path.to_string_lossy();

        if let Some(stripped) = value.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{}", stripped);
        }

        if let Some(stripped) = value.strip_prefix(r"\\?\") {
            return stripped.to_string();
        }

        return value.into_owned();
    }

    #[cfg(not(windows))]
    {
        path.to_string_lossy().into_owned()
    }
}

fn detect_mime_type(path: &Path, bytes: &[u8]) -> &'static str {
    if matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("svg")),
        Some(true)
    ) {
        return "image/svg+xml";
    }

    match image::guess_format(bytes) {
        Ok(image::ImageFormat::Png) => "image/png",
        Ok(image::ImageFormat::Jpeg) => "image/jpeg",
        Ok(image::ImageFormat::WebP) => "image/webp",
        Ok(image::ImageFormat::Gif) => "image/gif",
        Ok(image::ImageFormat::Bmp) => "image/bmp",
        Ok(image::ImageFormat::Tiff) => "image/tiff",
        Ok(image::ImageFormat::Ico) => "image/x-icon",
        _ => "application/octet-stream",
    }
}

fn find_pdf_font_candidate() -> Option<PathBuf> {
    candidate_pdf_font_paths()
        .into_iter()
        .find(|path| path.exists() && path.is_file())
}

fn candidate_pdf_font_paths() -> Vec<PathBuf> {
    #[cfg(windows)]
    {
        let windows_dir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string());
        let fonts_dir = Path::new(&windows_dir).join("Fonts");
        return vec![
            fonts_dir.join("simhei.ttf"),
            fonts_dir.join("Deng.ttf"),
            fonts_dir.join("Dengb.ttf"),
            fonts_dir.join("simsunb.ttf"),
            fonts_dir.join("HYZhongHeiTi-197.ttf"),
        ];
    }

    #[cfg(target_os = "macos")]
    {
        return vec![
            PathBuf::from("/System/Library/Fonts/Supplemental/Songti.ttc"),
            PathBuf::from("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
            PathBuf::from("/System/Library/Fonts/PingFang.ttc"),
        ];
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return vec![
            PathBuf::from("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
            PathBuf::from("/usr/share/fonts/opentype/noto/NotoSansCJKSC-Regular.otf"),
            PathBuf::from("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
            PathBuf::from("/usr/share/fonts/truetype/arphic/uming.ttc"),
        ];
    }

    #[allow(unreachable_code)]
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn normalize_windows_extended_drive_path() {
        let path = Path::new(r"\\?\C:\Users\demo\image.png");
        assert_eq!(normalize_display_path(path), r"C:\Users\demo\image.png");
    }

    #[test]
    #[cfg(windows)]
    fn normalize_windows_extended_unc_path() {
        let path = Path::new(r"\\?\UNC\server\share\image.png");
        assert_eq!(normalize_display_path(path), r"\\server\share\image.png");
    }
}
