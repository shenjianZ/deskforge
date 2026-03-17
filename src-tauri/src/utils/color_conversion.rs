//! 颜色转换工具
//!
//! 提供颜色空间转换算法实现

use crate::models::color::HslInfo;

/// RGB 转 HSL
///
/// 将 RGB 颜色值转换为 HSL 颜色值
///
/// # 参数
///
/// * `r` - 红色分量 (0-255)
/// * `g` - 绿色分量 (0-255)
/// * `b` - 蓝色分量 (0-255)
///
/// # 返回
///
/// 返回 HSL 颜色信息
///
/// # 算法说明
///
/// 该函数使用标准的 RGB 到 HSL 转换算法：
/// 1. 将 RGB 值归一化到 [0, 1] 范围
/// 2. 计算最大值和最小值
/// 3. 根据最大值计算色相（H）
/// 4. 根据最大值和最小值之差计算饱和度（S）
/// 5. 亮度为最大值和最小值的平均值
///
/// # 示例
///
/// ```
/// use crate::utils::color_conversion::rgb_to_hsl;
///
/// let hsl = rgb_to_hsl(255, 0, 0);
/// assert_eq!(hsl.h, 0);   // 红色
/// assert_eq!(hsl.s, 100); // 完全饱和
/// assert_eq!(hsl.l, 50);  // 中等亮度
/// ```
pub fn rgb_to_hsl(r: u8, g: u8, b: u8) -> HslInfo {
    let r = r as f64 / 255.0;
    let g = g as f64 / 255.0;
    let b = b as f64 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let mut h = 0.0;
    let mut s = 0.0;
    let l = (max + min) / 2.0;

    if max != min {
        let d = max - min;
        s = if l > 0.5 {
            d / (2.0 - max - min)
        } else {
            d / (max + min)
        };

        h = match max {
            x if x == r => (g - b) / d + if g < b { 6.0 } else { 0.0 },
            x if x == g => (b - r) / d + 2.0,
            _ => (r - g) / d + 4.0,
        };

        h /= 6.0;
    }

    HslInfo {
        h: (h * 360.0).round() as u16,
        s: (s * 100.0).round() as u8,
        l: (l * 100.0).round() as u8,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_red_color() {
        let hsl = rgb_to_hsl(255, 0, 0);
        assert_eq!(hsl.h, 0);
        assert_eq!(hsl.s, 100);
        assert_eq!(hsl.l, 50);
    }

    #[test]
    fn test_gray_color() {
        let hsl = rgb_to_hsl(128, 128, 128);
        assert_eq!(hsl.s, 0);
        assert_eq!(hsl.l, 50);
    }
}
