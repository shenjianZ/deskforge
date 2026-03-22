import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Clock3, Play, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  clearSchedulerLogs,
  createSchedulerTask,
  deleteSchedulerLog,
  deleteSchedulerTask,
  listSchedulerLogs,
  listSchedulerTasks,
  runSchedulerTaskNow,
  toggleSchedulerTask,
  updateSchedulerTask,
} from "@/lib/scheduler";
import type {
  SchedulerTask,
  SchedulerTaskInput,
  SchedulerTaskLog,
  SchedulerTrigger,
} from "@/types/scheduler";

type TriggerMode = SchedulerTrigger["type"];

interface FormState {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerType: TriggerMode;
  runAt: string;
  dailyTime: string;
  weeklyTime: string;
  weekdays: number[];
  countdownMinutes: number;
  title: string;
  message: string;
  enableSystemNotification: boolean;
  enableInAppAlert: boolean;
  enableSound: boolean;
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  enabled: true,
  triggerType: "once",
  runAt: currentDateTimeValue(),
  dailyTime: "09:00",
  weeklyTime: "09:00",
  weekdays: [1, 2, 3, 4, 5],
  countdownMinutes: 25,
  title: "DeskForge 提醒",
  message: "",
  enableSystemNotification: true,
  enableInAppAlert: false,
  enableSound: true,
};

function currentDateTimeValue() {
  const now = new Date();
  now.setSeconds(0, 0);
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "未设置";
  }
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function summarizeTrigger(trigger: SchedulerTrigger) {
  switch (trigger.type) {
    case "once":
      return `一次性 · ${trigger.runAt}`;
    case "daily":
      return `每日 · ${trigger.time}`;
    case "weekly":
      return `每周 ${trigger.weekdays.map((day) => WEEKDAY_OPTIONS.find((item) => item.value === day)?.label ?? day).join(" / ")} · ${trigger.time}`;
    case "countdown":
      return `倒计时 · ${Math.max(1, Math.round(trigger.durationSeconds / 60))} 分钟`;
    default:
      return "未知规则";
  }
}

function statusLabel(status: SchedulerTask["status"]) {
  switch (status) {
    case "running":
      return "执行中";
    case "succeeded":
      return "成功";
    case "failed":
      return "失败";
    case "paused":
      return "已暂停";
    case "completed":
      return "已完成";
    default:
      return "待执行";
  }
}

function statusClassName(status: SchedulerTask["status"]) {
  switch (status) {
    case "failed":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    case "completed":
    case "succeeded":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "paused":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "running":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    default:
      return "border-border/60 text-muted-foreground";
  }
}

function taskToForm(task: SchedulerTask): FormState {
  return {
    id: task.id,
    name: task.name,
    description: task.description ?? "",
    enabled: task.enabled,
    triggerType: task.trigger.type,
    runAt: task.trigger.type === "once" ? task.trigger.runAt : currentDateTimeValue(),
    dailyTime: task.trigger.type === "daily" ? task.trigger.time : "09:00",
    weeklyTime: task.trigger.type === "weekly" ? task.trigger.time : "09:00",
    weekdays: task.trigger.type === "weekly" ? task.trigger.weekdays : [1, 2, 3, 4, 5],
    countdownMinutes: task.trigger.type === "countdown" ? Math.max(1, Math.round(task.trigger.durationSeconds / 60)) : 25,
    title: task.action.title,
    message: task.action.message,
    enableSystemNotification: task.action.enableSystemNotification,
    enableInAppAlert: task.action.enableInAppAlert,
    enableSound: task.action.enableSound,
  };
}

function formToInput(form: FormState): SchedulerTaskInput {
  let trigger: SchedulerTrigger;

  switch (form.triggerType) {
    case "daily":
      trigger = { type: "daily", time: form.dailyTime };
      break;
    case "weekly":
      trigger = { type: "weekly", time: form.weeklyTime, weekdays: form.weekdays };
      break;
    case "countdown":
      trigger = { type: "countdown", durationSeconds: Math.max(1, form.countdownMinutes) * 60 };
      break;
    default:
      trigger = { type: "once", runAt: form.runAt };
      break;
  }

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    enabled: form.enabled,
    trigger,
    action: {
      title: form.title.trim(),
      message: form.message.trim(),
      enableSystemNotification: form.enableSystemNotification,
      enableInAppAlert: form.enableInAppAlert,
      enableSound: form.enableSound,
    },
  };
}

function TriggerEditor({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { value: "once", label: "一次性" },
          { value: "daily", label: "每日" },
          { value: "weekly", label: "每周" },
          { value: "countdown", label: "倒计时" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setForm((current) => ({ ...current, triggerType: item.value as TriggerMode }))}
            className={cn(
              "rounded-[1rem] border px-4 py-3 text-sm transition",
              form.triggerType === item.value
                ? "border-orange-400/50 bg-orange-500/10 text-foreground"
                : "border-border/60 bg-background/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {form.triggerType === "once" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium">执行时间</span>
          <input
            type="datetime-local"
            value={form.runAt}
            onChange={(event) => setForm((current) => ({ ...current, runAt: event.target.value }))}
            className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 outline-none"
          />
        </label>
      ) : null}

      {form.triggerType === "daily" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium">每日时间</span>
          <input
            type="time"
            value={form.dailyTime}
            onChange={(event) => setForm((current) => ({ ...current, dailyTime: event.target.value }))}
            className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 outline-none"
          />
        </label>
      ) : null}

      {form.triggerType === "weekly" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">每周时间</span>
            <input
              type="time"
              value={form.weeklyTime}
              onChange={(event) => setForm((current) => ({ ...current, weeklyTime: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 outline-none"
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">执行星期</span>
            <div className="grid gap-2 sm:grid-cols-4">
              {WEEKDAY_OPTIONS.map((item) => {
                const active = form.weekdays.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => {
                        const weekdays = current.weekdays.includes(item.value)
                          ? current.weekdays.filter((day) => day !== item.value)
                          : [...current.weekdays, item.value].sort((left, right) => left - right);
                        return { ...current, weekdays };
                      })
                    }
                    className={cn(
                      "rounded-[1rem] border px-3 py-3 text-sm transition",
                      active
                        ? "border-sky-400/50 bg-sky-500/10 text-foreground"
                        : "border-border/60 bg-background/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {form.triggerType === "countdown" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium">倒计时分钟</span>
          <input
            type="number"
            min={1}
            value={form.countdownMinutes}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                countdownMinutes: Number.isFinite(event.target.valueAsNumber) ? Math.max(1, event.target.valueAsNumber) : 1,
              }))
            }
            className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 outline-none"
          />
        </label>
      ) : null}
    </div>
  );
}

export function SchedulerCenterPage() {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [logs, setLogs] = useState<SchedulerTaskLog[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [rightColumnHeight, setRightColumnHeight] = useState<number | null>(null);
  const leftCardRef = useRef<HTMLDivElement | null>(null);

  const metrics = useMemo(() => {
    const enabledCount = tasks.filter((task) => task.enabled).length;
    const failedCount = tasks.filter((task) => task.status === "failed").length;
    return [
      { label: "任务总数", value: tasks.length.toString() },
      { label: "启用中", value: enabledCount.toString() },
      { label: "最近失败", value: failedCount.toString() },
    ];
  }, [tasks]);

  const loadData = async () => {
    setError(null);
    try {
      const [taskList, logList] = await Promise.all([listSchedulerTasks(), listSchedulerLogs(undefined, 50)]);
      setTasks(taskList);
      setLogs(logList);
    } catch (loadError) {
      setError(extractErrorMessage(loadError, "加载定时中心数据失败"));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const element = leftCardRef.current;
    if (!element) {
      return;
    }

    const syncHeight = () => {
      if (window.innerWidth < 1280) {
        setRightColumnHeight(null);
        return;
      }
      setRightColumnHeight(element.getBoundingClientRect().height);
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(element);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [form, error]);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const input = formToInput(form);
      if (form.id) {
        await updateSchedulerTask({ id: form.id, ...input });
      } else {
        await createSchedulerTask(input);
      }
      setForm({ ...DEFAULT_FORM, runAt: currentDateTimeValue() });
      await loadData();
    } catch (submitError) {
      setError(extractErrorMessage(submitError, "保存任务失败"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageSection className="space-y-6">
      <PageHeader
        title="定时中心"
        description="面向 Windows 托盘驻留场景的本地提醒与时间触发中心。当前支持一次性、每日、每周和倒计时提醒。"
        backTo="/"
        actions={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setForm({ ...DEFAULT_FORM, runAt: currentDateTimeValue() });
              setError(null);
            }}
          >
            <Plus className="h-4 w-4" />
            新建任务
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.7fr] xl:items-stretch">
        <div className="space-y-6">
          <div
            ref={leftCardRef}
            className="rounded-[1.9rem] border border-border/60 bg-background/72 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(14,165,233,0.14))] text-orange-600 dark:text-orange-300">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Task Composer</div>
                <div className="text-lg font-semibold">{form.id ? "编辑提醒任务" : "创建提醒任务"}</div>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">任务名称</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例如：喝水提醒"
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">任务描述</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="可选，描述提醒上下文"
                  className="min-h-24 w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 outline-none"
                />
              </label>

              <TriggerEditor form={form} setForm={setForm} />

              <div className="grid gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">提醒标题</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-4 outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">提醒内容</span>
                  <textarea
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="例如：起身活动一下，顺便喝一杯水。"
                    className="min-h-28 w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["enableSystemNotification", "系统通知"],
                  ["enableInAppAlert", "应用内提醒"],
                  ["enableSound", "提示音"],
                  ["enabled", "保存后立即启用"],
                ].map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        [field]: !current[field as keyof FormState],
                      }))
                    }
                    className={cn(
                      "flex items-center justify-between rounded-[1rem] border px-4 py-3 text-left text-sm transition",
                      form[field as keyof FormState]
                        ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                        : "border-border/60 bg-background/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                    )}
                  >
                    <span>{label}</span>
                    <span>{form[field as keyof FormState] ? "On" : "Off"}</span>
                  </button>
                ))}
              </div>

              {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-full" onClick={() => void handleSubmit()} disabled={busy}>
                  {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {form.id ? "保存修改" : "创建任务"}
                </Button>
                {form.id ? (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setForm({ ...DEFAULT_FORM, runAt: currentDateTimeValue() })}
                  >
                    取消编辑
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className="space-y-6 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden"
          style={rightColumnHeight ? { height: `${rightColumnHeight}px` } : undefined}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.6rem] border border-border/60 bg-background/72 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.label}</div>
                <div className="mt-3 text-2xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[1.9rem] border border-border/60 bg-background/72 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:flex-1 xl:min-h-0 xl:overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Operations</div>
                  <div className="mt-2 text-lg font-semibold">任务与执行日志</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {activeTab === "logs" ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        void clearSchedulerLogs()
                          .then(loadData)
                          .catch((clearError) => setError(extractErrorMessage(clearError, "清空日志失败")))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      清空日志
                    </Button>
                  ) : null}
                  <TabsList className="rounded-full bg-background/80 p-1">
                    <TabsTrigger value="tasks" className="rounded-full px-4">任务列表</TabsTrigger>
                    <TabsTrigger value="logs" className="rounded-full px-4">执行日志</TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent
                value="tasks"
                className="mt-6 xl:flex-1 xl:overflow-hidden xl:data-[state=active]:flex xl:data-[state=active]:h-full xl:data-[state=active]:flex-col"
              >
                <div className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1">
                  {tasks.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                      还没有任务。先创建一个提醒，保持应用托盘常驻即可按计划触发。
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-[1.4rem] border border-border/60 bg-background/78 p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-lg font-semibold">{task.name}</div>
                              <Badge variant="outline" className={cn("rounded-full px-3 py-1", statusClassName(task.status))}>
                                {statusLabel(task.status)}
                              </Badge>
                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                {task.enabled ? "启用中" : "已禁用"}
                              </Badge>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">{task.description || "未填写任务描述"}</p>
                            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                              <div>触发规则：{summarizeTrigger(task.trigger)}</div>
                              <div>下次执行：{formatDateTime(task.nextRunAt)}</div>
                              <div>上次执行：{formatDateTime(task.lastRunAt)}</div>
                              <div>提醒标题：{task.action.title}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              className="rounded-full"
                              onClick={() => setForm(taskToForm(task))}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-full"
                              onClick={() =>
                                void runSchedulerTaskNow(task.id)
                                  .then(loadData)
                                  .catch((runError) => setError(extractErrorMessage(runError, "立即执行失败")))
                              }
                            >
                              <Play className="h-4 w-4" />
                              立即执行
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-full"
                              onClick={() =>
                                void toggleSchedulerTask(task.id, !task.enabled)
                                  .then(loadData)
                                  .catch((toggleError) => setError(extractErrorMessage(toggleError, "切换状态失败")))
                              }
                            >
                              {task.enabled ? "暂停" : "启用"}
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-full text-red-600 hover:text-red-700"
                              onClick={() =>
                                void deleteSchedulerTask(task.id)
                                  .then(loadData)
                                  .catch((deleteError) => setError(extractErrorMessage(deleteError, "删除失败")))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="logs"
                className="mt-6 xl:flex-1 xl:overflow-hidden xl:data-[state=active]:flex xl:data-[state=active]:h-full xl:data-[state=active]:flex-col"
              >
                <div className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1">
                  {logs.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                      暂无执行日志。任务首次触发后会在这里记录结果和错误信息。
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="rounded-[1.4rem] border border-border/60 bg-background/78 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="font-medium">{log.taskName}</div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-3 py-1",
                                  log.result === "success"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                                )}
                              >
                                {log.result === "success" ? "成功" : "失败"}
                              </Badge>
                            </div>
                            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                              <div>计划时间：{formatDateTime(log.scheduledAt)}</div>
                              <div>实际执行：{formatDateTime(log.executedAt)}</div>
                              <div>耗时：{log.durationMs} ms</div>
                              <div>结果：{log.errorMessage ? log.errorMessage : "执行完成"}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() =>
                                void deleteSchedulerLog(log.id)
                                  .then(loadData)
                                  .catch((deleteError) => setError(extractErrorMessage(deleteError, "删除日志失败")))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/80">
                              <Clock3 className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </PageSection>
  );
}
