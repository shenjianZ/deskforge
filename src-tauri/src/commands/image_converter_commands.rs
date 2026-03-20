//! 图片转换命令
//!
//! 定义图片转换工具的 Tauri 命令

use crate::{
    models::image_converter::{ImageConversionOptions, ImageConversionPreviewResult},
    services::image_converter_service::ImageConverterService,
};

#[tauri::command]
pub fn generate_image_conversion_preview(
    input_path: String,
    options: ImageConversionOptions,
) -> Result<ImageConversionPreviewResult, String> {
    ImageConverterService::generate_preview(&input_path, &options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_converted_image(
    input_path: String,
    output_path: String,
    options: ImageConversionOptions,
) -> Result<(), String> {
    ImageConverterService::save_converted_image(&input_path, &output_path, &options)
        .map_err(|error| error.to_string())
}
