//! 颜色数据模型
//!
//! 定义颜色相关的数据结构，包括 RGB、HSL 和完整的颜色信息

use serde::{Deserialize, Serialize};
use crate::utils::color_conversion;

/// 颜色信息
///
/// 包含颜色的完整信息，支持多种颜色格式和屏幕坐标
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorInfo {
    /// 十六进制颜色值（格式：#RRGGBB）
    pub hex: String,
    /// RGB 颜色值
    pub rgb: RgbInfo,
    /// HSL 颜色值
    pub hsl: HslInfo,
    /// 屏幕坐标 X（像素）
    pub x: i32,
    /// 屏幕坐标 Y（像素）
    pub y: i32,
}

impl ColorInfo {
    /// 从 RGB 值创建颜色信息
    ///
    /// # 参数
    ///
    /// * `r` - 红色分量 (0-255)
    /// * `g` - 绿色分量 (0-255)
    /// * `b` - 蓝色分量 (0-255)
    /// * `x` - 屏幕坐标 X（像素）
    /// * `y` - 屏幕坐标 Y（像素）
    ///
    /// # 返回
    ///
    /// 返回包含完整颜色信息的 `ColorInfo` 实例
    ///
    /// # 示例
    ///
    /// ```no_run
    /// use crate::models::color::ColorInfo;
    ///
    /// let color = ColorInfo::new(255, 0, 0, 100, 200);
    /// assert_eq!(color.hex, "#FF0000");
    /// ```
    pub fn new(r: u8, g: u8, b: u8, x: i32, y: i32) -> Self {
        let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);

        Self {
            hex,
            rgb: RgbInfo { r, g, b },
            hsl: color_conversion::rgb_to_hsl(r, g, b),
            x,
            y,
        }
    }
}

/// RGB 颜色
///
/// 表示 RGB 颜色模式的颜色值
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbInfo {
    /// 红色分量 (0-255)
    pub r: u8,
    /// 绿色分量 (0-255)
    pub g: u8,
    /// 蓝色分量 (0-255)
    pub b: u8,
}

/// HSL 颜色
///
/// 表示 HSL 颜色模式的颜色值
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HslInfo {
    /// 色相 (0-360)
    ///
    /// 表示颜色在色轮上的角度，0° 为红色，120° 为绿色，240° 为蓝色
    pub h: u16,
    /// 饱和度 (0-100)
    ///
    /// 表示颜色的鲜艳程度，0% 为灰色，100% 为完全饱和
    pub s: u8,
    /// 亮度 (0-100)
    ///
    /// 表示颜色的明暗程度，0% 为黑色，100% 为白色
    pub l: u8,
}
