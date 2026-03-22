//! 数据库基础设施

use std::path::PathBuf;

use rusqlite::Connection;

use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct Database {
    db_path: PathBuf,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Self {
        Self { db_path }
    }

    pub fn initialize(&self) -> AppResult<()> {
        let connection = self.open_connection()?;
        self.init_schema(&connection)?;
        Ok(())
    }

    pub fn open_connection(&self) -> AppResult<Connection> {
        let connection = Connection::open(&self.db_path)
            .map_err(|error| AppError::DatabaseError(error.to_string()))?;
        connection
            .execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
            .map_err(|error| AppError::DatabaseError(error.to_string()))?;
        Ok(connection)
    }

    fn init_schema(&self, connection: &Connection) -> AppResult<()> {
        connection
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    enabled INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    trigger_config TEXT NOT NULL,
                    action_config TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_run_at TEXT,
                    next_run_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_enabled_next_run_at
                    ON tasks(enabled, next_run_at);
                CREATE TABLE IF NOT EXISTS task_logs (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    task_name TEXT NOT NULL,
                    scheduled_at TEXT,
                    executed_at TEXT NOT NULL,
                    result TEXT NOT NULL,
                    error_message TEXT,
                    duration_ms INTEGER NOT NULL,
                    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_task_logs_task_executed
                    ON task_logs(task_id, executed_at DESC);",
            )
            .map_err(|error| AppError::DatabaseError(error.to_string()))?;
        Ok(())
    }
}
