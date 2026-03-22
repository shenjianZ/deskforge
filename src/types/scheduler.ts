export type SchedulerTaskStatus =
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "paused"
  | "completed";

export type SchedulerRunResult = "success" | "failed";

export type SchedulerTrigger =
  | { type: "once"; runAt: string }
  | { type: "daily"; time: string }
  | { type: "weekly"; weekdays: number[]; time: string }
  | { type: "countdown"; durationSeconds: number };

export interface SchedulerAction {
  title: string;
  message: string;
  enableSystemNotification: boolean;
  enableInAppAlert: boolean;
  enableSound: boolean;
}

export interface SchedulerTask {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  status: SchedulerTaskStatus;
  trigger: SchedulerTrigger;
  action: SchedulerAction;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
}

export interface SchedulerTaskInput {
  name: string;
  description?: string | null;
  enabled: boolean;
  trigger: SchedulerTrigger;
  action: SchedulerAction;
}

export interface SchedulerTaskUpdate extends SchedulerTaskInput {
  id: string;
}

export interface SchedulerTaskLog {
  id: string;
  taskId: string;
  taskName: string;
  scheduledAt?: string | null;
  executedAt: string;
  result: SchedulerRunResult;
  errorMessage?: string | null;
  durationMs: number;
}

export interface ReminderEventPayload {
  taskId: string;
  taskName: string;
  title: string;
  message: string;
  firedAt: string;
  showInAppAlert: boolean;
  playSound: boolean;
}
