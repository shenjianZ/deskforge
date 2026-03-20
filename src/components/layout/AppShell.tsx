import { Link, useLocation } from "react-router-dom";
import { AppWindow, ChevronDown, Command, Search, Settings } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { implementedFeatures } from "@/features/data";
import { categories } from "@/features/registry";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { WindowChrome } from "@/components/layout/WindowChrome";
import {
  interactiveSelectedClassName,
  interactiveSelectedMutedTextClassName,
  interactiveSelectedSoftSurfaceClassName,
} from "@/lib/themeClasses";

const iconMap = LucideIcons as unknown as Record<string, typeof AppWindow>;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [trayOpen, setTrayOpen] = useState(false);

  const navGroups = useMemo(
    () =>
      categories
        .filter((category) => category.id !== "all")
        .map((category) => ({
          ...category,
          items: implementedFeatures.filter((feature) => feature.category === category.id),
        }))
        .filter((category) => category.items.length > 0),
    []
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-[-18rem] h-[32rem] bg-[radial-gradient(circle_at_top,rgba(255,132,64,0.28),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,153,92,0.16),transparent_58%)]" />
        <div className="absolute right-[-8rem] top-40 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.14),transparent_68%)]" />
        <div className="absolute bottom-[-10rem] left-[-8rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14),transparent_72%)]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <WindowChrome />

        <header className="sticky top-10 z-30 border-b border-border/50 bg-background/78 backdrop-blur-2xl">
          <div className="relative mx-auto flex w-full max-w-[1600px] items-center justify-end gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex-1" />

            <div className="absolute left-1/2 hidden -translate-x-1/2 xl:flex xl:items-center xl:gap-2">
              <Link to="/" className={cn("rounded-full px-4 py-2 text-sm transition", location.pathname === "/" ? interactiveSelectedClassName : "text-muted-foreground hover:bg-accent/70 hover:text-foreground")}>
                首页
              </Link>
              <Link to="/search" className={cn("rounded-full px-4 py-2 text-sm transition", location.pathname === "/search" ? interactiveSelectedClassName : "text-muted-foreground hover:bg-accent/70 hover:text-foreground")}>
                搜索
              </Link>
              <Link to="/settings" className={cn("rounded-full px-4 py-2 text-sm transition", location.pathname === "/settings" ? interactiveSelectedClassName : "text-muted-foreground hover:bg-accent/70 hover:text-foreground")}>
                设置
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden h-10 rounded-2xl border-border/60 bg-background/70 px-4 text-sm shadow-sm lg:inline-flex"
                onClick={() => setTrayOpen((prev) => !prev)}
              >
                浏览模块
                <ChevronDown className={cn("h-4 w-4 transition", trayOpen && "rotate-180")} />
              </Button>
              <Link to="/search">
                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-border/60 bg-background/70 px-4 text-sm shadow-sm"
                >
                  <Command className="h-4 w-4" />
                  <span className="hidden sm:inline">命令搜索</span>
                  <span className="rounded-lg border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Ctrl K
                  </span>
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline" size="icon" className="rounded-2xl border-border/60 bg-background/70">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <ModeToggle />
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden bg-background/82 transition-[max-height,opacity] duration-300",
              trayOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:grid-cols-3 lg:px-8">
              {navGroups.map((group) => {
                const Icon = iconMap[group.icon] ?? AppWindow;

                return (
                  <section key={group.id} className="flex max-h-[360px] flex-col rounded-[1.5rem] border border-border/60 bg-background/78 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {group.name}
                    </div>
                    <div className="mt-4 space-y-2 overflow-y-auto pr-1">
                      {group.items.map((item) => {
                        const ItemIcon = iconMap[item.icon] ?? AppWindow;
                        const active = location.pathname === item.route;

                        return (
                          <Link
                            key={item.id}
                            to={item.route}
                            onClick={() => setTrayOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition",
                              active
                                ? interactiveSelectedClassName
                                : "bg-background/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                            )}
                          >
                            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", active ? interactiveSelectedSoftSurfaceClassName : "border-border/60 bg-background")}>
                              <ItemIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{item.name}</div>
                              <div className={cn("truncate text-xs", active ? interactiveSelectedMutedTextClassName : "text-muted-foreground")}>
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <div className="pointer-events-none fixed bottom-6 right-6 hidden xl:block">
          <Link
            to="/search"
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/60 bg-background/82 px-4 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(249,115,22,0.92),rgba(14,165,233,0.75))] text-white">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">Open command search</div>
              <div className="text-xs text-muted-foreground">未来动作、模块与工作流入口</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
