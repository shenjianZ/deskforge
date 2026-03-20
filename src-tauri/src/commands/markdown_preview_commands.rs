//! Markdown 预览命令
//!
//! 定义 Markdown 资源解析与导出命令

use crate::{
    models::markdown_preview::ResolvedMarkdownAsset,
    services::markdown_preview_service::MarkdownPreviewService,
};

#[tauri::command]
pub fn resolve_markdown_asset(asset_path: String, base_dir: Option<String>) -> Result<ResolvedMarkdownAsset, String> {
    MarkdownPreviewService::resolve_asset(&asset_path, base_dir.as_deref()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_markdown_export(output_path: String, content_base64: String) -> Result<(), String> {
    MarkdownPreviewService::save_export(&output_path, &content_base64).map_err(|error| error.to_string())
}
