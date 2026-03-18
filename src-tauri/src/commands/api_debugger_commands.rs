//! API 调试相关命令

use crate::{
    models::api_debugger::{ApiEnvironment, ApiRequestDraft, ApiResponseSnapshot},
    services::api_debugger_service::ApiDebuggerService,
};

#[tauri::command]
pub async fn execute_api_request(
    request: ApiRequestDraft,
    environment: Option<ApiEnvironment>,
    timeout_ms: Option<u64>,
) -> Result<ApiResponseSnapshot, String> {
    ApiDebuggerService::execute(&request, environment.as_ref(), timeout_ms.unwrap_or(15_000))
        .await
        .map_err(|error| error.to_string())
}
