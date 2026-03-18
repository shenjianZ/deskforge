//! API 调试服务

use std::time::{Duration, Instant};

use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::{
    header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE},
    Client, Method, Url,
};

use crate::{
    error::{AppError, AppResult},
    models::api_debugger::{
        ApiAuthConfig, ApiBodyMode, ApiEnvironment, ApiKeyPlacement, ApiKeyValueRow, ApiRawBodyType,
        ApiRequestDraft, ApiRequestMethod, ApiResponseSnapshot,
    },
};

pub struct ApiDebuggerService;

impl ApiDebuggerService {
    pub async fn execute(
        request: &ApiRequestDraft,
        environment: Option<&ApiEnvironment>,
        timeout_ms: u64,
    ) -> AppResult<ApiResponseSnapshot> {
        let variables = Self::collect_variables(environment);
        let mut url = Self::build_url(request, &variables)?;
        let mut headers = Self::build_headers(request, &variables)?;

        Self::apply_auth(request, &variables, &mut url, &mut headers)?;

        let request_body = Self::build_body(request, &variables, &mut headers)?;
        let curl = Self::build_curl(request, &url, &headers, request_body.as_deref());
        let request_headers = headers
            .iter()
            .map(|(key, value)| ApiKeyValueRow {
                id: format!("request-header-{}", key.as_str()),
                key: key.as_str().to_string(),
                value: value.to_str().unwrap_or_default().to_string(),
                enabled: true,
            })
            .collect::<Vec<_>>();

        let client = Client::builder()
            .timeout(Duration::from_millis(timeout_ms))
            .build()
            .map_err(|error| AppError::NetworkRequestFailed(format!("HTTP 客户端创建失败: {}", error)))?;

        let started_at = Instant::now();
        let response = client
            .request(Self::map_method(&request.method), url.clone())
            .headers(headers.clone())
            .body(request_body.clone().unwrap_or_default())
            .send()
            .await
            .map_err(|error| AppError::NetworkRequestFailed(Self::normalize_reqwest_error(error)))?;

        let status = response.status();
        let status_text = status
            .canonical_reason()
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| status.to_string());
        let resolved_url = response.url().to_string();
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or_default()
            .to_string();

        let response_headers = response
            .headers()
            .iter()
            .map(|(key, value)| ApiKeyValueRow {
                id: format!("header-{}", key.as_str()),
                key: key.as_str().to_string(),
                value: value.to_str().unwrap_or_default().to_string(),
                enabled: true,
            })
            .collect::<Vec<_>>();

        let response_body = response
            .text()
            .await
            .map_err(|error| AppError::NetworkRequestFailed(format!("读取响应失败: {}", error)))?;

        Ok(ApiResponseSnapshot {
            ok: status.is_success(),
            status: status.as_u16(),
            status_text,
            duration_ms: started_at.elapsed().as_millis(),
            size_bytes: response_body.as_bytes().len(),
            request_method: request.method.clone(),
            request_headers,
            request_body: request_body.unwrap_or_default(),
            headers: response_headers,
            body: response_body,
            content_type,
            resolved_url,
            curl,
            sent_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    fn map_method(method: &ApiRequestMethod) -> Method {
        match method {
            ApiRequestMethod::Get => Method::GET,
            ApiRequestMethod::Post => Method::POST,
            ApiRequestMethod::Put => Method::PUT,
            ApiRequestMethod::Patch => Method::PATCH,
            ApiRequestMethod::Delete => Method::DELETE,
            ApiRequestMethod::Head => Method::HEAD,
            ApiRequestMethod::Options => Method::OPTIONS,
        }
    }

    fn collect_variables(environment: Option<&ApiEnvironment>) -> Vec<(String, String)> {
        environment
            .map(|env| {
                env.variables
                    .iter()
                    .filter(|row| row.enabled && !row.key.trim().is_empty())
                    .map(|row| (row.key.trim().to_string(), row.value.clone()))
                    .collect()
            })
            .unwrap_or_default()
    }

    fn resolve_template(input: &str, variables: &[(String, String)]) -> String {
        let mut resolved = input.to_string();
        for (key, value) in variables {
            resolved = resolved.replace(&format!("{{{{{}}}}}", key), value);
            resolved = resolved.replace(&format!("{{{{ {} }}}}", key), value);
        }
        resolved
    }

    fn build_url(request: &ApiRequestDraft, variables: &[(String, String)]) -> AppResult<Url> {
        let resolved_url = Self::resolve_template(request.url.trim(), variables);
        if resolved_url.is_empty() {
            return Err(AppError::InvalidData("请输入请求 URL".to_string()));
        }

        let mut url = Url::parse(&resolved_url)
            .map_err(|error| AppError::InvalidData(format!("请求 URL 无效: {}", error)))?;

        for row in &request.query_params {
            if row.enabled && !row.key.trim().is_empty() {
                url.query_pairs_mut().append_pair(
                    &Self::resolve_template(row.key.trim(), variables),
                    &Self::resolve_template(&row.value, variables),
                );
            }
        }

        Ok(url)
    }

    fn build_headers(request: &ApiRequestDraft, variables: &[(String, String)]) -> AppResult<HeaderMap> {
        let mut headers = HeaderMap::new();

        for row in &request.headers {
            if row.enabled && !row.key.trim().is_empty() {
                let key = HeaderName::from_bytes(Self::resolve_template(row.key.trim(), variables).as_bytes())
                    .map_err(|error| AppError::InvalidData(format!("Header 名称无效: {}", error)))?;
                let value = HeaderValue::from_str(&Self::resolve_template(&row.value, variables))
                    .map_err(|error| AppError::InvalidData(format!("Header 值无效: {}", error)))?;
                headers.insert(key, value);
            }
        }

        Ok(headers)
    }

    fn apply_auth(
        request: &ApiRequestDraft,
        variables: &[(String, String)],
        url: &mut Url,
        headers: &mut HeaderMap,
    ) -> AppResult<()> {
        match &request.auth {
            ApiAuthConfig::None => {}
            ApiAuthConfig::Bearer { token } => {
                let value = HeaderValue::from_str(&format!("Bearer {}", Self::resolve_template(token, variables)))
                    .map_err(|error| AppError::InvalidData(format!("Bearer Token 无效: {}", error)))?;
                headers.insert(AUTHORIZATION, value);
            }
            ApiAuthConfig::Basic { username, password } => {
                let encoded = STANDARD.encode(format!(
                    "{}:{}",
                    Self::resolve_template(username, variables),
                    Self::resolve_template(password, variables)
                ));
                let value = HeaderValue::from_str(&format!("Basic {}", encoded))
                    .map_err(|error| AppError::InvalidData(format!("Basic Auth 无效: {}", error)))?;
                headers.insert(AUTHORIZATION, value);
            }
            ApiAuthConfig::ApiKey {
                key,
                value,
                placement,
            } => {
                let key = Self::resolve_template(key, variables);
                let value = Self::resolve_template(value, variables);
                match placement {
                    ApiKeyPlacement::Header => {
                        let header_name = HeaderName::from_bytes(key.as_bytes())
                            .map_err(|error| AppError::InvalidData(format!("API Key 名称无效: {}", error)))?;
                        let header_value = HeaderValue::from_str(&value)
                            .map_err(|error| AppError::InvalidData(format!("API Key 值无效: {}", error)))?;
                        headers.insert(header_name, header_value);
                    }
                    ApiKeyPlacement::Query => {
                        url.query_pairs_mut().append_pair(&key, &value);
                    }
                }
            }
        }

        Ok(())
    }

    fn build_body(
        request: &ApiRequestDraft,
        variables: &[(String, String)],
        headers: &mut HeaderMap,
    ) -> AppResult<Option<String>> {
        match request.body_mode {
            ApiBodyMode::None => Ok(None),
            ApiBodyMode::Raw => {
                if !headers.contains_key(CONTENT_TYPE) {
                    let content_type = match request.raw_body_type {
                        ApiRawBodyType::Json => "application/json",
                        ApiRawBodyType::Text => "text/plain",
                        ApiRawBodyType::Xml => "application/xml",
                        ApiRawBodyType::Html => "text/html",
                    };
                    headers.insert(CONTENT_TYPE, HeaderValue::from_static(content_type));
                }
                Ok(Some(Self::resolve_template(&request.raw_body, variables)))
            }
            ApiBodyMode::Form => {
                if !headers.contains_key(CONTENT_TYPE) {
                    headers.insert(
                        CONTENT_TYPE,
                        HeaderValue::from_static("application/x-www-form-urlencoded;charset=UTF-8"),
                    );
                }

                let body = request
                    .form_body
                    .iter()
                    .filter(|row| row.enabled && !row.key.trim().is_empty())
                    .map(|row| {
                        format!(
                            "{}={}",
                            urlencoding::encode(&Self::resolve_template(row.key.trim(), variables)),
                            urlencoding::encode(&Self::resolve_template(&row.value, variables))
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("&");

                Ok(Some(body))
            }
        }
    }

    fn build_curl(request: &ApiRequestDraft, url: &Url, headers: &HeaderMap, body: Option<&str>) -> String {
        let mut parts = vec![format!("curl -X {}", Self::map_method(&request.method)), format!("\"{}\"", url)];

        for (key, value) in headers.iter() {
            if let Ok(value) = value.to_str() {
                parts.push(format!("-H \"{}: {}\"", key.as_str(), value.replace('"', "\\\"")));
            }
        }

        if let Some(body) = body {
            if !body.is_empty() && !matches!(request.method, ApiRequestMethod::Get | ApiRequestMethod::Head) {
                parts.push(format!("--data-raw \"{}\"", body.replace('"', "\\\"")));
            }
        }

        parts.join(" ")
    }

    fn normalize_reqwest_error(error: reqwest::Error) -> String {
        if error.is_timeout() {
            "请求超时".to_string()
        } else if error.is_connect() {
            format!("连接失败: {}", error)
        } else {
            error.to_string()
        }
    }
}
