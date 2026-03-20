//! 图片转换相关数据模型
//!
//! 定义图片转换工具使用的数据结构

use serde::{Deserialize, Serialize};

/// 目标输出格式
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ImageOutputFormat {
    #[serde(rename = "png")]
    Png,
    #[serde(rename = "jpeg")]
    Jpeg,
    #[serde(rename = "webp")]
    Webp,
    #[serde(rename = "bmp")]
    Bmp,
    #[serde(rename = "tiff")]
    Tiff,
    #[serde(rename = "ico")]
    Ico,
}

impl ImageOutputFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpeg",
            Self::Webp => "webp",
            Self::Bmp => "bmp",
            Self::Tiff => "tiff",
            Self::Ico => "ico",
        }
    }

    pub fn supports_alpha(&self) -> bool {
        matches!(self, Self::Png | Self::Webp | Self::Tiff | Self::Ico)
    }
}

/// 图片转换配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionOptions {
    /// 目标格式
    pub target_format: ImageOutputFormat,

    /// JPEG/WebP 质量，范围 1-100
    #[serde(default = "default_quality")]
    pub quality: u8,

    /// WebP 是否使用无损编码
    #[serde(default)]
    pub webp_lossless: bool,

    /// 透明转不透明时的背景色
    #[serde(default = "default_background_color")]
    pub background_color: String,

    /// ICO 输出尺寸
    #[serde(default = "default_ico_size")]
    pub ico_size: u32,
}

fn default_quality() -> u8 {
    92
}

fn default_background_color() -> String {
    "#FFFFFF".to_string()
}

fn default_ico_size() -> u32 {
    256
}

impl Default for ImageConversionOptions {
    fn default() -> Self {
        Self {
            target_format: ImageOutputFormat::Png,
            quality: default_quality(),
            webp_lossless: false,
            background_color: default_background_color(),
            ico_size: default_ico_size(),
        }
    }
}

/// 图片转换预览结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionPreviewResult {
    pub data_url: String,
    pub preview_format: String,
    pub output_format: String,
    pub source_format: String,
    pub source_width: u32,
    pub source_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    pub has_alpha: bool,
    pub estimated_bytes: usize,
}
