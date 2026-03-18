import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppWindow, Copy, Minus, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";

type MainWindowState = {
  visible: boolean;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
};

const currentWindow = getCurrentWindow();

async function loadMainWindowState() {
  return invoke<MainWindowState>("get_main_window_state");
}

export function WindowChrome() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const refreshState = async () => {
      try {
        const state = await loadMainWindowState();

        if (mounted) {
          setMaximized(state.maximized);
        }
      } catch (error) {
        console.error("读取主窗口状态失败", error);
      }
    };

    void refreshState();

    const unlistenPromises = [
      currentWindow.onResized(() => {
        void refreshState();
      }),
      currentWindow.onMoved(() => {
        void refreshState();
      }),
    ];

    return () => {
      mounted = false;
      void Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, []);

  const hideToTray = async () => {
    await invoke("hide_window");
  };

  const toggleMaximize = async () => {
    await invoke("toggle_maximize_main_window");
    const state = await loadMainWindowState();
    setMaximized(state.maximized);
  };

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/92 backdrop-blur-xl">
      <div className="flex h-10 items-center">
        <div
          data-tauri-drag-region
          className="flex min-w-0 flex-1 items-center gap-3 px-3 text-sm text-foreground/90"
          onDoubleClick={() => {
            void toggleMaximize();
          }}
        >
          <div
            data-tauri-drag-region
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(14,165,233,0.12))]"
          >
            <AppWindow className="h-3.5 w-3.5" />
          </div>
          <div data-tauri-drag-region className="truncate text-xs font-semibold tracking-[0.18em]">
            DeskForge
          </div>
          <div data-tauri-drag-region className="min-w-0 flex-1" />
        </div>

        <div className="flex items-stretch">
          <button
            type="button"
            aria-label="隐藏到托盘"
            title="隐藏到托盘"
            className={controlButtonClassName}
            onClick={() => {
              void hideToTray();
            }}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={maximized ? "还原窗口" : "最大化窗口"}
            title={maximized ? "还原窗口" : "最大化窗口"}
            className={controlButtonClassName}
            onClick={() => {
              void toggleMaximize();
            }}
          >
            {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            aria-label="隐藏到托盘"
            title="隐藏到托盘"
            className={cn(controlButtonClassName, "hover:bg-red-500 hover:text-white")}
            onClick={() => {
              void hideToTray();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const controlButtonClassName =
  "flex h-10 w-12 items-center justify-center text-muted-foreground transition hover:bg-accent hover:text-foreground active:bg-accent/80";
