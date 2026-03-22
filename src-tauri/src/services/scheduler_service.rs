//! 定时中心服务

use std::{
    fs,
    sync::{Arc, Mutex},
    thread,
    time::Duration as StdDuration,
};

use chrono::{
    DateTime, Datelike, Duration, Local, LocalResult, NaiveDate, NaiveDateTime, NaiveTime,
    TimeZone, Utc, Weekday,
};
#[cfg(target_os = "windows")]
use notify_rust::Notification;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    infra::db::Database,
    models::scheduler::{
        ReminderEventPayload, SchedulerRunResult, SchedulerTask, SchedulerTaskInput,
        SchedulerTaskLog, SchedulerTaskStatus, SchedulerTaskUpdate, SchedulerTrigger,
    },
    repository::scheduler_repository::{SchedulerExecutionUpdate, SchedulerRepository},
};

const TASK_FIRED_EVENT: &str = "scheduler://task-fired";

#[derive(Clone)]
pub struct SchedulerState {
    pub database: Database,
    execution_lock: Arc<Mutex<()>>,
}

impl SchedulerState {
    pub fn new(database: Database) -> Self {
        Self {
            database,
            execution_lock: Arc::new(Mutex::new(())),
        }
    }
}

pub struct SchedulerService;

impl SchedulerService {
    pub fn initialize(app: &AppHandle) -> AppResult<SchedulerState> {
        let data_dir = app
            .path()
            .home_dir()
            .map_err(|error| AppError::IoError(format!("获取用户目录失败: {}", error)))?
            .join(".deskforge");
        fs::create_dir_all(&data_dir)
            .map_err(|error| AppError::IoError(format!("创建数据目录失败: {}", error)))?;

        let database = Database::new(data_dir.join("app.db"));
        database.initialize()?;

        let state = SchedulerState::new(database);
        Self::start_background_loop(app.clone(), state.clone());
        Ok(state)
    }

    pub fn list_tasks(state: &SchedulerState) -> AppResult<Vec<SchedulerTask>> {
        let connection = state.database.open_connection()?;
        SchedulerRepository::list_tasks(&connection)
    }

    pub fn create_task(
        state: &SchedulerState,
        input: SchedulerTaskInput,
    ) -> AppResult<SchedulerTask> {
        Self::validate_input(&input)?;

        let now = Utc::now();
        let task_id = Uuid::new_v4().to_string();
        let next_run_at = if input.enabled {
            Self::compute_initial_next_run(&input.trigger, now)?
        } else {
            None
        };
        let status = if input.enabled {
            SchedulerTaskStatus::Idle
        } else {
            SchedulerTaskStatus::Paused
        };

        let connection = state.database.open_connection()?;
        SchedulerRepository::create_task(
            &connection,
            &input,
            &task_id,
            &status,
            &now.to_rfc3339(),
            next_run_at,
        )?;

        Self::get_task_by_id(state, &task_id)?
            .ok_or_else(|| AppError::SchedulerError("新建任务后未找到任务记录".to_string()))
    }

    pub fn update_task(
        state: &SchedulerState,
        input: SchedulerTaskUpdate,
    ) -> AppResult<SchedulerTask> {
        let current = Self::get_task_by_id(state, &input.id)?
            .ok_or_else(|| AppError::InvalidData("任务不存在".to_string()))?;
        let normalized = SchedulerTaskInput {
            name: input.name,
            description: input.description,
            enabled: input.enabled,
            trigger: input.trigger,
            action: input.action,
        };
        Self::validate_input(&normalized)?;

        let now = Utc::now();
        let next_run_at = if normalized.enabled {
            Self::compute_initial_next_run(&normalized.trigger, now)?
        } else {
            None
        };
        let status = if normalized.enabled {
            match current.status {
                SchedulerTaskStatus::Running => SchedulerTaskStatus::Idle,
                _ => SchedulerTaskStatus::Idle,
            }
        } else {
            SchedulerTaskStatus::Paused
        };

        let connection = state.database.open_connection()?;
        SchedulerRepository::update_task(
            &connection,
            &input.id,
            &normalized,
            &status,
            &now.to_rfc3339(),
            next_run_at,
        )?;

        Self::get_task_by_id(state, &input.id)?
            .ok_or_else(|| AppError::SchedulerError("更新任务后未找到任务记录".to_string()))
    }

    pub fn delete_task(state: &SchedulerState, task_id: &str) -> AppResult<()> {
        let connection = state.database.open_connection()?;
        SchedulerRepository::delete_task(&connection, task_id)
    }

    pub fn toggle_task(
        state: &SchedulerState,
        task_id: &str,
        enabled: bool,
    ) -> AppResult<SchedulerTask> {
        let task = Self::get_task_by_id(state, task_id)?
            .ok_or_else(|| AppError::InvalidData("任务不存在".to_string()))?;
        let now = Utc::now();
        let next_run_at = if enabled {
            Self::compute_initial_next_run(&task.trigger, now)?
        } else {
            None
        };
        let status = if enabled {
            SchedulerTaskStatus::Idle
        } else {
            SchedulerTaskStatus::Paused
        };

        let connection = state.database.open_connection()?;
        SchedulerRepository::update_toggle_state(
            &connection,
            task_id,
            enabled,
            &status,
            &now.to_rfc3339(),
            next_run_at,
        )?;

        Self::get_task_by_id(state, task_id)?
            .ok_or_else(|| AppError::SchedulerError("切换任务状态后未找到任务记录".to_string()))
    }

    pub fn list_logs(
        state: &SchedulerState,
        task_id: Option<&str>,
        limit: Option<u32>,
    ) -> AppResult<Vec<SchedulerTaskLog>> {
        let connection = state.database.open_connection()?;
        SchedulerRepository::list_logs(&connection, task_id, i64::from(limit.unwrap_or(100)))
    }

    pub fn delete_log(state: &SchedulerState, log_id: &str) -> AppResult<()> {
        let connection = state.database.open_connection()?;
        SchedulerRepository::delete_log(&connection, log_id)
    }

    pub fn clear_logs(state: &SchedulerState) -> AppResult<()> {
        let connection = state.database.open_connection()?;
        SchedulerRepository::clear_logs(&connection)
    }

    pub fn run_task_now(
        app: &AppHandle,
        state: &SchedulerState,
        task_id: &str,
    ) -> AppResult<SchedulerTask> {
        let _guard = state
            .execution_lock
            .lock()
            .map_err(|_| AppError::SchedulerError("获取执行锁失败".to_string()))?;
        Self::execute_task(app, state, task_id, true)
    }

    fn start_background_loop(app: AppHandle, state: SchedulerState) {
        thread::spawn(move || loop {
            if let Err(error) = Self::process_due_tasks(&app, &state) {
                eprintln!("scheduler loop error: {}", error);
            }
            thread::sleep(StdDuration::from_secs(1));
        });
    }

    fn process_due_tasks(app: &AppHandle, state: &SchedulerState) -> AppResult<()> {
        let _guard = state
            .execution_lock
            .lock()
            .map_err(|_| AppError::SchedulerError("获取执行锁失败".to_string()))?;
        let connection = state.database.open_connection()?;
        let ids = SchedulerRepository::find_due_task_ids(&connection, &Utc::now().to_rfc3339())?;

        for task_id in ids {
            if let Err(error) = Self::execute_task(app, state, &task_id, false) {
                eprintln!("scheduler task execution error: {}", error);
            }
        }
        Ok(())
    }

    fn execute_task(
        app: &AppHandle,
        state: &SchedulerState,
        task_id: &str,
        manual: bool,
    ) -> AppResult<SchedulerTask> {
        let task = Self::get_task_by_id(state, task_id)?
            .ok_or_else(|| AppError::InvalidData("任务不存在".to_string()))?;
        let started_at = Utc::now();
        let scheduled_at = if manual {
            None
        } else {
            task.next_run_at.clone()
        };

        {
            let connection = state.database.open_connection()?;
            SchedulerRepository::mark_running(&connection, task_id, &started_at.to_rfc3339())?;
        }

        let action_result = Self::perform_action(app, &task);
        let finished_at = Utc::now();
        let duration_ms = (finished_at - started_at).num_milliseconds().max(0);
        let next_run_at = if task.enabled {
            Self::compute_next_run_after_execution(&task.trigger, started_at)?
        } else {
            None
        };

        let (enabled, status, result, error_message) = match action_result {
            Ok(()) => {
                let status = if next_run_at.is_some() {
                    SchedulerTaskStatus::Succeeded
                } else {
                    SchedulerTaskStatus::Completed
                };
                (
                    next_run_at.is_some(),
                    status,
                    SchedulerRunResult::Success,
                    None,
                )
            }
            Err(error) => {
                let status = if next_run_at.is_some() {
                    SchedulerTaskStatus::Failed
                } else {
                    SchedulerTaskStatus::Completed
                };
                (
                    next_run_at.is_some(),
                    status,
                    SchedulerRunResult::Failed,
                    Some(error.to_string()),
                )
            }
        };

        let connection = state.database.open_connection()?;
        SchedulerRepository::finish_execution(
            &connection,
            SchedulerExecutionUpdate {
                task_id,
                enabled,
                status,
                finished_at: &finished_at,
                next_run_at,
                result,
                error_message,
                scheduled_at,
                task_name: &task.name,
                duration_ms,
            },
        )?;

        Self::get_task_by_id(state, task_id)?
            .ok_or_else(|| AppError::SchedulerError("执行任务后未找到任务记录".to_string()))
    }

    fn perform_action(app: &AppHandle, task: &SchedulerTask) -> AppResult<()> {
        if task.action.enable_system_notification {
            Self::show_system_notification(app, task)?;
        }

        if task.action.enable_in_app_alert {
            app.emit(
                TASK_FIRED_EVENT,
                ReminderEventPayload {
                    task_id: task.id.clone(),
                    task_name: task.name.clone(),
                    title: task.action.title.clone(),
                    message: task.action.message.clone(),
                    fired_at: Utc::now().to_rfc3339(),
                    show_in_app_alert: task.action.enable_in_app_alert,
                    play_sound: false,
                },
            )
            .map_err(|error| AppError::SchedulerError(format!("发送应用内提醒失败: {}", error)))?;
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn show_system_notification(app: &AppHandle, task: &SchedulerTask) -> AppResult<()> {
        let mut notification = Notification::new();
        notification
            .summary(&task.action.title)
            .body(&task.action.message)
            .app_id(&app.config().identifier)
            .auto_icon();

        if task.action.enable_sound {
            notification.sound_name("Default");
        }

        notification.show().map_err(|error| {
            AppError::SchedulerError(format!("发送 Windows 原生通知失败: {}", error))
        })?;

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    fn show_system_notification(_app: &AppHandle, _task: &SchedulerTask) -> AppResult<()> {
        Ok(())
    }

    fn get_task_by_id(state: &SchedulerState, task_id: &str) -> AppResult<Option<SchedulerTask>> {
        let connection = state.database.open_connection()?;
        SchedulerRepository::get_task_by_id(&connection, task_id)
    }

    fn validate_input(input: &SchedulerTaskInput) -> AppResult<()> {
        if input.name.trim().is_empty() {
            return Err(AppError::InvalidData("任务名称不能为空".to_string()));
        }
        if input.action.title.trim().is_empty() {
            return Err(AppError::InvalidData("提醒标题不能为空".to_string()));
        }
        if input.action.message.trim().is_empty() {
            return Err(AppError::InvalidData("提醒内容不能为空".to_string()));
        }
        if !input.action.enable_system_notification
            && !input.action.enable_in_app_alert
            && !input.action.enable_sound
        {
            return Err(AppError::InvalidData("至少启用一种提醒动作".to_string()));
        }

        match &input.trigger {
            SchedulerTrigger::Once { run_at } => {
                let run_at = Self::parse_local_datetime(run_at)?;
                if run_at <= Utc::now() {
                    return Err(AppError::InvalidData(
                        "一次性提醒时间必须晚于当前时间".to_string(),
                    ));
                }
            }
            SchedulerTrigger::Daily { time } => {
                Self::parse_time(time)?;
            }
            SchedulerTrigger::Weekly { weekdays, time } => {
                Self::parse_time(time)?;
                if weekdays.is_empty() || weekdays.iter().any(|day| !matches!(day, 1..=7)) {
                    return Err(AppError::InvalidData(
                        "每周提醒至少选择一个有效的星期".to_string(),
                    ));
                }
            }
            SchedulerTrigger::Countdown { duration_seconds } => {
                if *duration_seconds <= 0 {
                    return Err(AppError::InvalidData("倒计时秒数必须大于 0".to_string()));
                }
            }
        }
        Ok(())
    }

    fn compute_initial_next_run(
        trigger: &SchedulerTrigger,
        reference_utc: DateTime<Utc>,
    ) -> AppResult<Option<DateTime<Utc>>> {
        match trigger {
            SchedulerTrigger::Once { run_at } => Ok(Some(Self::parse_local_datetime(run_at)?)),
            SchedulerTrigger::Daily { time } => {
                Ok(Some(Self::next_daily_run(time, reference_utc)?))
            }
            SchedulerTrigger::Weekly { weekdays, time } => {
                Ok(Some(Self::next_weekly_run(weekdays, time, reference_utc)?))
            }
            SchedulerTrigger::Countdown { duration_seconds } => {
                Ok(Some(reference_utc + Duration::seconds(*duration_seconds)))
            }
        }
    }

    fn compute_next_run_after_execution(
        trigger: &SchedulerTrigger,
        reference_utc: DateTime<Utc>,
    ) -> AppResult<Option<DateTime<Utc>>> {
        match trigger {
            SchedulerTrigger::Once { .. } | SchedulerTrigger::Countdown { .. } => Ok(None),
            SchedulerTrigger::Daily { time } => Ok(Some(Self::next_daily_run(
                time,
                reference_utc + Duration::seconds(1),
            )?)),
            SchedulerTrigger::Weekly { weekdays, time } => Ok(Some(Self::next_weekly_run(
                weekdays,
                time,
                reference_utc + Duration::seconds(1),
            )?)),
        }
    }

    fn next_daily_run(time: &str, reference_utc: DateTime<Utc>) -> AppResult<DateTime<Utc>> {
        let local_reference = reference_utc.with_timezone(&Local);
        let run_time = Self::parse_time(time)?;
        let today = local_reference.date_naive();
        let candidate = Self::local_datetime_from_parts(today, run_time)?;
        if candidate > local_reference {
            Ok(candidate.with_timezone(&Utc))
        } else {
            Ok(
                Self::local_datetime_from_parts(today + Duration::days(1), run_time)?
                    .with_timezone(&Utc),
            )
        }
    }

    fn next_weekly_run(
        weekdays: &[u8],
        time: &str,
        reference_utc: DateTime<Utc>,
    ) -> AppResult<DateTime<Utc>> {
        let local_reference = reference_utc.with_timezone(&Local);
        let run_time = Self::parse_time(time)?;
        let mut normalized_days = weekdays.to_vec();
        normalized_days.sort_unstable();
        normalized_days.dedup();

        for offset in 0..14 {
            let candidate_date = local_reference.date_naive() + Duration::days(offset);
            let weekday_number = Self::weekday_to_number(candidate_date.weekday());
            if normalized_days.contains(&weekday_number) {
                let candidate = Self::local_datetime_from_parts(candidate_date, run_time)?;
                if candidate > local_reference {
                    return Ok(candidate.with_timezone(&Utc));
                }
            }
        }

        Err(AppError::SchedulerError(
            "无法计算下一个每周执行时间".to_string(),
        ))
    }

    fn parse_local_datetime(value: &str) -> AppResult<DateTime<Utc>> {
        let naive = NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S")
            .or_else(|_| NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M"))
            .map_err(|error| AppError::InvalidData(format!("无效的日期时间格式: {}", error)))?;

        match Local.from_local_datetime(&naive) {
            LocalResult::Single(date_time) => Ok(date_time.with_timezone(&Utc)),
            LocalResult::Ambiguous(first, _) => Ok(first.with_timezone(&Utc)),
            LocalResult::None => Err(AppError::InvalidData(
                "当前时间无法映射到本地时区".to_string(),
            )),
        }
    }

    fn parse_time(value: &str) -> AppResult<NaiveTime> {
        NaiveTime::parse_from_str(value, "%H:%M")
            .map_err(|error| AppError::InvalidData(format!("无效的时间格式: {}", error)))
    }

    fn local_datetime_from_parts(date: NaiveDate, time: NaiveTime) -> AppResult<DateTime<Local>> {
        match Local.from_local_datetime(&date.and_time(time)) {
            LocalResult::Single(date_time) => Ok(date_time),
            LocalResult::Ambiguous(first, _) => Ok(first),
            LocalResult::None => Err(AppError::SchedulerError("无法构造本地执行时间".to_string())),
        }
    }

    fn weekday_to_number(weekday: Weekday) -> u8 {
        match weekday {
            Weekday::Mon => 1,
            Weekday::Tue => 2,
            Weekday::Wed => 3,
            Weekday::Thu => 4,
            Weekday::Fri => 5,
            Weekday::Sat => 6,
            Weekday::Sun => 7,
        }
    }
}
