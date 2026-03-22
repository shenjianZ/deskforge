//! 图片转换命令
//!
//! 定义图片转换工具的 Tauri 命令

use crate::{
    models::image_converter::{
        ImageCompressionOptions, ImageConversionOptions, ImageConversionPreviewResult,
        ImageCropOptions, ImageResizeOptions, ImageSourceInfo,
    },
    services::image_converter_service::ImageConverterService,
};

#[tauri::command]
pub fn get_image_source_info(input_path: String) -> Result<ImageSourceInfo, String> {
    ImageConverterService::get_image_info(&input_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_image_conversion_preview(
    input_path: String,
    options: ImageConversionOptions,
) -> Result<ImageConversionPreviewResult, String> {
    ImageConverterService::generate_preview(&input_path, &options)
        .map_err(|error| error.to_string())
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

#[tauri::command]
pub fn generate_image_compression_preview(
    input_path: String,
    options: ImageCompressionOptions,
) -> Result<ImageConversionPreviewResult, String> {
    ImageConverterService::generate_compression_preview(&input_path, &options)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_compressed_image(
    input_path: String,
    output_path: String,
    options: ImageCompressionOptions,
) -> Result<(), String> {
    ImageConverterService::save_compressed_image(&input_path, &output_path, &options)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_image_crop_preview(
    input_path: String,
    options: ImageCropOptions,
) -> Result<ImageConversionPreviewResult, String> {
    ImageConverterService::generate_crop_preview(&input_path, &options)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_cropped_image(
    input_path: String,
    output_path: String,
    options: ImageCropOptions,
) -> Result<(), String> {
    ImageConverterService::save_cropped_image(&input_path, &output_path, &options)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_image_resize_preview(
    input_path: String,
    options: ImageResizeOptions,
) -> Result<ImageConversionPreviewResult, String> {
    ImageConverterService::generate_resize_preview(&input_path, &options)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_resized_image(
    input_path: String,
    output_path: String,
    options: ImageResizeOptions,
) -> Result<(), String> {
    ImageConverterService::save_resized_image(&input_path, &output_path, &options)
        .map_err(|error| error.to_string())
}
