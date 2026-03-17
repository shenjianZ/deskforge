import { Link, useLocation } from 'react-router-dom';
import { Search, Settings, PanelLeft, AppWindow } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { implementedFeatures } from '@/features/data';
import { categories } from '@/features/registry';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

const iconMap = LucideIcons as unknown as Record<string, typeof AppWindow>;

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'DeskForge',
    description: '桌面工具工作台',
  },
  '/search': {
    title: '搜索',
    description: '快速定位已实现工具',
  },
  '/settings': {
    title: '设置',
    description: '主题、显示与格式化默认偏好',
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = useMemo(() => {
    const feature = implementedFeatures.find((item) => item.route === location.pathname);
    if (feature) {
      return {
        title: feature.name,
        description: feature.description,
      };
    }

    return pageMeta[location.pathname] ?? pageMeta['/'];
  }, [location.pathname]);

  const navGroups = categories
    .filter((category) => category.id !== 'all')
    .map((category) => ({
      ...category,
      items: implementedFeatures.filter((feature) => feature.category === category.id),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,transparent_40%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,#1f2937_0%,transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-border/60 bg-background/90 backdrop-blur-xl transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border/60 px-5 py-5">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <AppWindow className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide">DeskForge</div>
                <div className="text-xs text-muted-foreground">Professional Utility Suite</div>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-6 grid grid-cols-2 gap-2">
              <Link to="/search" onClick={() => setSidebarOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Search className="h-4 w-4" />
                  搜索
                </Button>
              </Link>
              <Link to="/settings" onClick={() => setSidebarOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  设置
                </Button>
              </Link>
            </div>

            <nav className="space-y-5">
              {navGroups.map((group) => {
                const Icon = iconMap[group.icon] ?? AppWindow;

                return (
                  <div key={group.id}>
                    <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {group.name}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const ItemIcon = iconMap[item.icon] ?? AppWindow;
                        const active = location.pathname === item.route;

                        return (
                          <Link
                            key={item.id}
                            to={item.route}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                              active
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <ItemIcon className="h-4 w-4" />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="关闭导航"
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border/50 bg-background/75 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="text-xl font-semibold tracking-tight">{meta.title}</div>
                <div className="text-sm text-muted-foreground">{meta.description}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/search">
                <Button variant="outline" size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">搜索</span>
                </Button>
              </Link>
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

