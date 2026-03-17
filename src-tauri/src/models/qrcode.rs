//! 二维码生成相关数据模型

use serde::{Deserialize, Serialize};

/// 二维码配置
///
/// 定义生成二维码所需的参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QrConfig {
    /// 二维码内容
    pub content: String,
    /// 输出尺寸（像素）
    pub size: u32,
    /// 边距（模块数）
    pub margin: u32,
    /// 容错级别: "L", "M", "Q", "H"
    pub error_correction: String,
    /// 样式配置
    pub style: Option<QrStyle>,
    /// Logo 配置
    pub logo: Option<LogoConfig>,
}

/// 二维码样式
///
/// 定义二维码的视觉样式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QrStyle {
    /// 点形状: "square", "circle", "rounded"
    pub dot_shape: String,
    /// 码眼形状: "square", "circle", "rounded"
    pub eye_shape: String,
    /// 前景色（Hex 颜色代码）
    pub foreground_color: String,
    /// 背景色（Hex 颜色代码）
    pub background_color: String,
    /// 是否使用渐变
    pub is_gradient: bool,
    /// 渐变颜色列表（如果 is_gradient 为 true）
    pub gradient_colors: Option<Vec<String>>,
}

impl Default for QrStyle {
    fn default() -> Self {
        Self {
            dot_shape: "square".to_string(),
            eye_shape: "square".to_string(),
            foreground_color: "#000000".to_string(),
            background_color: "#FFFFFF".to_string(),
            is_gradient: false,
            gradient_colors: None,
        }
    }
}

/// Logo 配置
///
/// 定义 Logo 的位置和样式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogoConfig {
    /// Logo 文件路径
    pub path: String,
    /// 缩放比例 (0.1 - 0.3)
    pub scale: f32,
    /// 是否添加边框
    pub has_border: bool,
    /// 边框宽度（像素）
    pub border_width: u32,
}

/// 二维码生成结果
///
/// 包含生成的二维码图片数据
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QrResult {
    /// Base64 编码的图片数据
    pub data: String,
    /// 图片格式（如 "png"）
    pub format: String,
}
