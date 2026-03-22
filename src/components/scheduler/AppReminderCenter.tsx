import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReminderEventPayload } from "@/types/scheduler";

interface ReminderToast extends ReminderEventPayload {
  toastId: string;
}

export function AppReminderCenter() {
  const [items, setItems] = useState<ReminderToast[]>([]);

  useEffect(() => {
    const unlistenPromise = listen<ReminderEventPayload>("scheduler://task-fired", (event) => {
      const payload = event.payload;
      if (!payload.showInAppAlert) {
        return;
      }

      setItems((current) =>
        [
          {
            ...payload,
            toastId: `${payload.taskId}-${payload.firedAt}`,
          },
          ...current,
        ].slice(0, 3)
      );
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setItems((current) => current.slice(0, -1));
    }, 12000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.toastId}
          className="pointer-events-auto rounded-[1.4rem] border border-border/60 bg-background/92 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(249,115,22,0.95),rgba(14,165,233,0.78))] text-white">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {item.taskName}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setItems((current) => current.filter((entry) => entry.toastId !== item.toastId))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
