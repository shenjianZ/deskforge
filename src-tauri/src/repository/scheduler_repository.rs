//! 定时中心仓储

use chrono::{DateTime, Utc};
use rusqlite::{params, types::Value, Connection, OptionalExtension, Row};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::scheduler::{
        SchedulerAction, SchedulerRunResult, SchedulerTask, SchedulerTaskInput, SchedulerTaskLog,
        SchedulerTaskStatus, SchedulerTrigger,
    },
};

pub struct SchedulerRepository;

pub struct SchedulerExecutionUpdate<'a> {
    pub task_id: &'a str,
    pub enabled: bool,
    pub status: SchedulerTaskStatus,
    pub finished_at: &'a DateTime<Utc>,
    pub next_run_at: Option<DateTime<Utc>>,
    pub result: SchedulerRunResult,
    pub error_message: Option<String>,
    pub scheduled_at: Option<String>,
    pub task_name: &'a str,
    pub duration_ms: i64,
}

impl SchedulerRepository {
    pub fn list_tasks(connection: &Connection) -> AppResult<Vec<SchedulerTask>> {
        let mut statement = connection
            .prepare(
                "SELECT id, name, description, enabled, status, trigger_config, action_config, created_at, updated_at, last_run_at, next_run_at
                 FROM tasks
                 ORDER BY enabled DESC, COALESCE(next_run_at, updated_at) ASC, created_at DESC",
            )
            .map_err(Self::map_database_error)?;
        let rows = statement
            .query_map([], Self::map_task_row)
            .map_err(Self::map_database_error)?;

        let mut tasks = Vec::new();
        for row in rows {
            tasks.push(row.map_err(Self::map_database_error)?);
        }
        Ok(tasks)
    }

    pub fn create_task(
        connection: &Connection,
        input: &SchedulerTaskInput,
        task_id: &str,
        status: &SchedulerTaskStatus,
        timestamp: &str,
        next_run_at: Option<DateTime<Utc>>,
    ) -> AppResult<()> {
        connection
            .execute(
                "INSERT INTO tasks (id, name, description, enabled, status, trigger_config, action_config, created_at, updated_at, last_run_at, next_run_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10)",
                params![
                    task_id,
                    input.name,
                    input.description,
                    Self::bool_to_db(input.enabled),
                    Self::status_to_str(status),
                    Self::serialize_trigger(&input.trigger)?,
                    Self::serialize_action(&input.action)?,
                    timestamp,
                    timestamp,
                    next_run_at.as_ref().map(DateTime::<Utc>::to_rfc3339),
                ],
            )
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn update_task(
        connection: &Connection,
        task_id: &str,
        input: &SchedulerTaskInput,
        status: &SchedulerTaskStatus,
        updated_at: &str,
        next_run_at: Option<DateTime<Utc>>,
    ) -> AppResult<()> {
        connection
            .execute(
                "UPDATE tasks
                 SET name = ?2, description = ?3, enabled = ?4, status = ?5, trigger_config = ?6, action_config = ?7, updated_at = ?8, next_run_at = ?9
                 WHERE id = ?1",
                params![
                    task_id,
                    input.name,
                    input.description,
                    Self::bool_to_db(input.enabled),
                    Self::status_to_str(status),
                    Self::serialize_trigger(&input.trigger)?,
                    Self::serialize_action(&input.action)?,
                    updated_at,
                    next_run_at.as_ref().map(DateTime::<Utc>::to_rfc3339),
                ],
            )
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn delete_task(connection: &Connection, task_id: &str) -> AppResult<()> {
        connection
            .execute("DELETE FROM task_logs WHERE task_id = ?1", params![task_id])
            .map_err(Self::map_database_error)?;
        connection
            .execute("DELETE FROM tasks WHERE id = ?1", params![task_id])
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn update_toggle_state(
        connection: &Connection,
        task_id: &str,
        enabled: bool,
        status: &SchedulerTaskStatus,
        updated_at: &str,
        next_run_at: Option<DateTime<Utc>>,
    ) -> AppResult<()> {
        connection
            .execute(
                "UPDATE tasks SET enabled = ?2, status = ?3, updated_at = ?4, next_run_at = ?5 WHERE id = ?1",
                params![
                    task_id,
                    Self::bool_to_db(enabled),
                    Self::status_to_str(status),
                    updated_at,
                    next_run_at.as_ref().map(DateTime::<Utc>::to_rfc3339),
                ],
            )
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn list_logs(
        connection: &Connection,
        task_id: Option<&str>,
        limit: i64,
    ) -> AppResult<Vec<SchedulerTaskLog>> {
        let mut logs = Vec::new();
        let (sql, params_vec) = if let Some(task_id) = task_id {
            (
                "SELECT id, task_id, task_name, scheduled_at, executed_at, result, error_message, duration_ms
                 FROM task_logs WHERE task_id = ?1 ORDER BY executed_at DESC LIMIT ?2",
                vec![Value::from(task_id.to_string()), Value::from(limit)],
            )
        } else {
            (
                "SELECT id, task_id, task_name, scheduled_at, executed_at, result, error_message, duration_ms
                 FROM task_logs ORDER BY executed_at DESC LIMIT ?1",
                vec![Value::from(limit)],
            )
        };

        let mut statement = connection.prepare(sql).map_err(Self::map_database_error)?;
        let rows = statement
            .query_map(rusqlite::params_from_iter(params_vec), Self::map_log_row)
            .map_err(Self::map_database_error)?;
        for row in rows {
            logs.push(row.map_err(Self::map_database_error)?);
        }
        Ok(logs)
    }

    pub fn delete_log(connection: &Connection, log_id: &str) -> AppResult<()> {
        connection
            .execute("DELETE FROM task_logs WHERE id = ?1", params![log_id])
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn clear_logs(connection: &Connection) -> AppResult<()> {
        connection
            .execute("DELETE FROM task_logs", [])
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn find_due_task_ids(connection: &Connection, now: &str) -> AppResult<Vec<String>> {
        let mut statement = connection
            .prepare(
                "SELECT id FROM tasks
                 WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?1
                 ORDER BY next_run_at ASC
                 LIMIT 16",
            )
            .map_err(Self::map_database_error)?;
        let rows = statement
            .query_map(params![now], |row| row.get::<_, String>(0))
            .map_err(Self::map_database_error)?;

        let mut ids = Vec::new();
        for row in rows {
            ids.push(row.map_err(Self::map_database_error)?);
        }
        Ok(ids)
    }

    pub fn mark_running(connection: &Connection, task_id: &str, updated_at: &str) -> AppResult<()> {
        connection
            .execute(
                "UPDATE tasks SET status = ?2, updated_at = ?3 WHERE id = ?1",
                params![
                    task_id,
                    Self::status_to_str(&SchedulerTaskStatus::Running),
                    updated_at
                ],
            )
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn finish_execution(
        connection: &Connection,
        update: SchedulerExecutionUpdate<'_>,
    ) -> AppResult<()> {
        connection
            .execute(
                "UPDATE tasks
                 SET enabled = ?2, status = ?3, updated_at = ?4, last_run_at = ?5, next_run_at = ?6
                 WHERE id = ?1",
                params![
                    update.task_id,
                    Self::bool_to_db(update.enabled),
                    Self::status_to_str(&update.status),
                    update.finished_at.to_rfc3339(),
                    update.finished_at.to_rfc3339(),
                    update.next_run_at.as_ref().map(DateTime::<Utc>::to_rfc3339),
                ],
            )
            .map_err(Self::map_database_error)?;
        connection
            .execute(
                "INSERT INTO task_logs (id, task_id, task_name, scheduled_at, executed_at, result, error_message, duration_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    Uuid::new_v4().to_string(),
                    update.task_id,
                    update.task_name,
                    update.scheduled_at,
                    update.finished_at.to_rfc3339(),
                    Self::run_result_to_str(&update.result),
                    update.error_message,
                    update.duration_ms,
                ],
            )
            .map_err(Self::map_database_error)?;
        Ok(())
    }

    pub fn get_task_by_id(
        connection: &Connection,
        task_id: &str,
    ) -> AppResult<Option<SchedulerTask>> {
        connection
            .query_row(
                "SELECT id, name, description, enabled, status, trigger_config, action_config, created_at, updated_at, last_run_at, next_run_at
                 FROM tasks WHERE id = ?1",
                params![task_id],
                Self::map_task_row,
            )
            .optional()
            .map_err(Self::map_database_error)
    }

    fn map_task_row(row: &Row<'_>) -> rusqlite::Result<SchedulerTask> {
        let trigger_config: String = row.get(5)?;
        let action_config: String = row.get(6)?;
        let trigger =
            serde_json::from_str::<SchedulerTrigger>(&trigger_config).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    5,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
        let action = serde_json::from_str::<SchedulerAction>(&action_config).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                6,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })?;

        Ok(SchedulerTask {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            enabled: row.get::<_, i64>(3)? == 1,
            status: Self::status_from_str(&row.get::<_, String>(4)?),
            trigger,
            action,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            last_run_at: row.get(9)?,
            next_run_at: row.get(10)?,
        })
    }

    fn map_log_row(row: &Row<'_>) -> rusqlite::Result<SchedulerTaskLog> {
        Ok(SchedulerTaskLog {
            id: row.get(0)?,
            task_id: row.get(1)?,
            task_name: row.get(2)?,
            scheduled_at: row.get(3)?,
            executed_at: row.get(4)?,
            result: Self::run_result_from_str(&row.get::<_, String>(5)?),
            error_message: row.get(6)?,
            duration_ms: row.get(7)?,
        })
    }

    fn serialize_trigger(trigger: &SchedulerTrigger) -> AppResult<String> {
        serde_json::to_string(trigger)
            .map_err(|error| AppError::InvalidData(format!("序列化触发器失败: {}", error)))
    }

    fn serialize_action(action: &SchedulerAction) -> AppResult<String> {
        serde_json::to_string(action)
            .map_err(|error| AppError::InvalidData(format!("序列化动作失败: {}", error)))
    }

    fn map_database_error(error: rusqlite::Error) -> AppError {
        AppError::DatabaseError(error.to_string())
    }

    fn bool_to_db(value: bool) -> i64 {
        if value {
            1
        } else {
            0
        }
    }

    fn status_to_str(status: &SchedulerTaskStatus) -> &'static str {
        match status {
            SchedulerTaskStatus::Idle => "idle",
            SchedulerTaskStatus::Running => "running",
            SchedulerTaskStatus::Succeeded => "succeeded",
            SchedulerTaskStatus::Failed => "failed",
            SchedulerTaskStatus::Paused => "paused",
            SchedulerTaskStatus::Completed => "completed",
        }
    }

    fn status_from_str(value: &str) -> SchedulerTaskStatus {
        match value {
            "running" => SchedulerTaskStatus::Running,
            "succeeded" => SchedulerTaskStatus::Succeeded,
            "failed" => SchedulerTaskStatus::Failed,
            "paused" => SchedulerTaskStatus::Paused,
            "completed" => SchedulerTaskStatus::Completed,
            _ => SchedulerTaskStatus::Idle,
        }
    }

    fn run_result_to_str(result: &SchedulerRunResult) -> &'static str {
        match result {
            SchedulerRunResult::Success => "success",
            SchedulerRunResult::Failed => "failed",
        }
    }

    fn run_result_from_str(value: &str) -> SchedulerRunResult {
        match value {
            "failed" => SchedulerRunResult::Failed,
            _ => SchedulerRunResult::Success,
        }
    }
}
