//! Markdown 预览相关数据模型
//!
//! 定义资源解析与导出能力使用的数据结构

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedMarkdownAsset {
    pub original_path: String,
    pub resolved_path: String,
    pub data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedMarkdownPdfFont {
    pub family: String,
    pub source_path: String,
    pub data_base64: String,
}
