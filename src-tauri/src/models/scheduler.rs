//! 定时中心数据模型

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerTask {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub status: SchedulerTaskStatus,
    pub trigger: SchedulerTrigger,
    pub action: SchedulerAction,
    pub created_at: String,
    pub updated_at: String,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerTaskInput {
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub trigger: SchedulerTrigger,
    pub action: SchedulerAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerTaskUpdate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub trigger: SchedulerTrigger,
    pub action: SchedulerAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerTaskLog {
    pub id: String,
    pub task_id: String,
    pub task_name: String,
    pub scheduled_at: Option<String>,
    pub executed_at: String,
    pub result: SchedulerRunResult,
    pub error_message: Option<String>,
    pub duration_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderEventPayload {
    pub task_id: String,
    pub task_name: String,
    pub title: String,
    pub message: String,
    pub fired_at: String,
    pub show_in_app_alert: bool,
    pub play_sound: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SchedulerTaskStatus {
    Idle,
    Running,
    Succeeded,
    Failed,
    Paused,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SchedulerRunResult {
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum SchedulerTrigger {
    Once { run_at: String },
    Daily { time: String },
    Weekly { weekdays: Vec<u8>, time: String },
    Countdown { duration_seconds: i64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerAction {
    pub title: String,
    pub message: String,
    pub enable_system_notification: bool,
    pub enable_in_app_alert: bool,
    pub enable_sound: bool,
}
