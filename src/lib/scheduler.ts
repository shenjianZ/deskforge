import { invoke } from "@tauri-apps/api/core";
import type {
  SchedulerTask,
  SchedulerTaskInput,
  SchedulerTaskLog,
  SchedulerTaskUpdate,
} from "@/types/scheduler";

export function listSchedulerTasks() {
  return invoke<SchedulerTask[]>("list_scheduler_tasks");
}

export function createSchedulerTask(input: SchedulerTaskInput) {
  return invoke<SchedulerTask>("create_scheduler_task", { input });
}

export function updateSchedulerTask(input: SchedulerTaskUpdate) {
  return invoke<SchedulerTask>("update_scheduler_task", { input });
}

export function deleteSchedulerTask(taskId: string) {
  return invoke<void>("delete_scheduler_task", { taskId });
}

export function toggleSchedulerTask(taskId: string, enabled: boolean) {
  return invoke<SchedulerTask>("toggle_scheduler_task", { taskId, enabled });
}

export function runSchedulerTaskNow(taskId: string) {
  return invoke<SchedulerTask>("run_scheduler_task_now", { taskId });
}

export function listSchedulerLogs(taskId?: string, limit = 100) {
  return invoke<SchedulerTaskLog[]>("list_scheduler_logs", {
    taskId: taskId ?? null,
    limit,
  });
}

export function deleteSchedulerLog(logId: string) {
  return invoke<void>("delete_scheduler_log", { logId });
}

export function clearSchedulerLogs() {
  return invoke<void>("clear_scheduler_logs");
}
