//! 定时中心命令

use tauri::{AppHandle, State};

use crate::{
    models::scheduler::{SchedulerTask, SchedulerTaskInput, SchedulerTaskLog, SchedulerTaskUpdate},
    services::scheduler_service::{SchedulerService, SchedulerState},
};

#[tauri::command]
pub fn list_scheduler_tasks(state: State<SchedulerState>) -> Result<Vec<SchedulerTask>, String> {
    SchedulerService::list_tasks(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_scheduler_task(
    state: State<SchedulerState>,
    input: SchedulerTaskInput,
) -> Result<SchedulerTask, String> {
    SchedulerService::create_task(&state, input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_scheduler_task(
    state: State<SchedulerState>,
    input: SchedulerTaskUpdate,
) -> Result<SchedulerTask, String> {
    SchedulerService::update_task(&state, input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_scheduler_task(state: State<SchedulerState>, task_id: String) -> Result<(), String> {
    SchedulerService::delete_task(&state, &task_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn toggle_scheduler_task(
    state: State<SchedulerState>,
    task_id: String,
    enabled: bool,
) -> Result<SchedulerTask, String> {
    SchedulerService::toggle_task(&state, &task_id, enabled).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_scheduler_logs(
    state: State<SchedulerState>,
    task_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<SchedulerTaskLog>, String> {
    SchedulerService::list_logs(&state, task_id.as_deref(), limit)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_scheduler_log(state: State<SchedulerState>, log_id: String) -> Result<(), String> {
    SchedulerService::delete_log(&state, &log_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_scheduler_logs(state: State<SchedulerState>) -> Result<(), String> {
    SchedulerService::clear_logs(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn run_scheduler_task_now(
    app: AppHandle,
    state: State<SchedulerState>,
    task_id: String,
) -> Result<SchedulerTask, String> {
    SchedulerService::run_task_now(&app, &state, &task_id).map_err(|error| error.to_string())
}
