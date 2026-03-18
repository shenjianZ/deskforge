//! API 调试工具相关数据模型

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ApiRequestMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyValueRow {
    pub id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ApiAuthConfig {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "bearer")]
    Bearer { token: String },
    #[serde(rename = "basic")]
    Basic { username: String, password: String },
    #[serde(rename = "apiKey")]
    ApiKey {
        key: String,
        value: String,
        placement: ApiKeyPlacement,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiKeyPlacement {
    Header,
    Query,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiBodyMode {
    None,
    Raw,
    Form,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiRawBodyType {
    Json,
    Text,
    Xml,
    Html,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRequestDraft {
    pub name: String,
    pub method: ApiRequestMethod,
    pub url: String,
    pub query_params: Vec<ApiKeyValueRow>,
    pub headers: Vec<ApiKeyValueRow>,
    pub auth: ApiAuthConfig,
    pub body_mode: ApiBodyMode,
    pub raw_body: String,
    pub raw_body_type: ApiRawBodyType,
    pub form_body: Vec<ApiKeyValueRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiEnvironment {
    pub id: String,
    pub name: String,
    pub variables: Vec<ApiKeyValueRow>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponseSnapshot {
    pub ok: bool,
    pub status: u16,
    pub status_text: String,
    pub duration_ms: u128,
    pub size_bytes: usize,
    pub request_method: ApiRequestMethod,
    pub request_headers: Vec<ApiKeyValueRow>,
    pub request_body: String,
    pub headers: Vec<ApiKeyValueRow>,
    pub body: String,
    pub content_type: String,
    pub resolved_url: String,
    pub curl: String,
    pub sent_at: String,
}
