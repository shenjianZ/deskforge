//! Windows 屏幕访问模块
//!
//! 提供屏幕像素颜色获取功能

use crate::error::{AppError, AppResult};
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    GetPixel, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    HBITMAP, HGDIOBJ, SRCCOPY,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
};

/// Windows 屏幕访问器
pub struct WindowsScreen;

impl WindowsScreen {
    /// 获取屏幕指定像素的 RGB 颜色
    ///
    /// # 参数
    ///
    /// * `x` - 屏幕横坐标（像素）
    /// * `y` - 屏幕纵坐标（像素）
    ///
    /// # 返回
    ///
    /// 返回 RGB 三个分量的值，每个分量范围是 0-255
    ///
    /// # 错误
    ///
    /// 如果无法访问屏幕或坐标无效，返回错误
    pub fn get_pixel_color(x: i32, y: i32) -> AppResult<(u8, u8, u8)> {
        unsafe {
            let screen_dc = GetDC(HWND::default());
            if screen_dc.is_invalid() {
                return Err(AppError::ScreenAccessFailed("无法获取屏幕设备上下文".to_string()));
            }

            let color = GetPixel(screen_dc, x, y);
            ReleaseDC(HWND::default(), screen_dc);

            // COLORREF 是一个 newtype，包含 u32 值
            // 格式: 0x00BBGGRR (蓝、绿、红)
            let color_value = color.0;

            if color_value == 0xFFFFFFFF {
                // GetPixel 在失败时返回 CLR_INVALID (0xFFFFFFFF)
                return Err(AppError::ScreenAccessFailed("无法获取像素颜色".to_string()));
            }

            let r = (color_value & 0xFF) as u8;
            let g = ((color_value >> 8) & 0xFF) as u8;
            let b = ((color_value >> 16) & 0xFF) as u8;

            Ok((r, g, b))
        }
    }

    /// 捕获屏幕指定区域像素（RGBA，行优先，左上角开始）
    ///
    /// 该函数用于前端放大镜实时预览。
    pub fn capture_region_rgba(
        x: i32,
        y: i32,
        width: i32,
        height: i32,
    ) -> AppResult<Vec<u8>> {
        if width <= 0 || height <= 0 {
            return Err(AppError::ScreenAccessFailed("无效的捕获区域尺寸".to_string()));
        }

        // 将捕获区域 clamp 到“虚拟屏幕”范围，避免在屏幕边缘 BitBlt 失败
        let v_left = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
        let v_top = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
        let v_w = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
        let v_h = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };

        // 如果请求区域比虚拟屏幕还大，直接报错（避免溢出/异常）
        if width > v_w || height > v_h {
            return Err(AppError::ScreenAccessFailed("捕获区域超出屏幕范围".to_string()));
        }

        let max_x = v_left + v_w - width;
        let max_y = v_top + v_h - height;
        let x = x.clamp(v_left, max_x);
        let y = y.clamp(v_top, max_y);

        unsafe {
            // 屏幕 DC
            let screen_dc = GetDC(HWND::default());
            if screen_dc.is_invalid() {
                return Err(AppError::ScreenAccessFailed("无法获取屏幕设备上下文".to_string()));
            }

            // 内存 DC + 位图
            let mem_dc = CreateCompatibleDC(screen_dc);
            if mem_dc.is_invalid() {
                ReleaseDC(HWND::default(), screen_dc);
                return Err(AppError::ScreenAccessFailed("无法创建兼容设备上下文".to_string()));
            }

            let bitmap: HBITMAP = CreateCompatibleBitmap(screen_dc, width, height);
            if bitmap.is_invalid() {
                let _ = DeleteDC(mem_dc);
                ReleaseDC(HWND::default(), screen_dc);
                return Err(AppError::ScreenAccessFailed("无法创建兼容位图".to_string()));
            }

            let old_obj: HGDIOBJ = SelectObject(mem_dc, bitmap);

            // 拷贝屏幕到位图
            let ok = BitBlt(mem_dc, 0, 0, width, height, screen_dc, x, y, SRCCOPY);

            // 释放 screen dc（尽早）
            ReleaseDC(HWND::default(), screen_dc);

            if ok.is_err() {
                // 恢复/清理
                let _ = SelectObject(mem_dc, old_obj);
                let _ = DeleteObject(bitmap);
                let _ = DeleteDC(mem_dc);
                return Err(AppError::ScreenAccessFailed("BitBlt 捕获失败".to_string()));
            }

            // 准备 BITMAPINFO（32-bit BGRA），并用负高度得到“自顶向下”顺序
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width,
                    biHeight: -height, // top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0 as u32,
                    biSizeImage: 0,
                    biXPelsPerMeter: 0,
                    biYPelsPerMeter: 0,
                    biClrUsed: 0,
                    biClrImportant: 0,
                },
                bmiColors: [Default::default(); 1],
            };

            let mut bgra = vec![0u8; (width as usize) * (height as usize) * 4];
            let lines = GetDIBits(
                mem_dc,
                bitmap,
                0,
                height as u32,
                Some(bgra.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );

            // 恢复/清理 GDI 对象
            let _ = SelectObject(mem_dc, old_obj);
            let _ = DeleteObject(bitmap);
            let _ = DeleteDC(mem_dc);

            if lines == 0 {
                return Err(AppError::ScreenAccessFailed("GetDIBits 读取失败".to_string()));
            }

            // BGRA -> RGBA（给前端 canvas 更直接）
            for px in bgra.chunks_exact_mut(4) {
                let b = px[0];
                let r = px[2];
                px[0] = r;
                px[2] = b;
                // px[1] = g, px[3] = a 保持
            }

            Ok(bgra)
        }
    }
}
