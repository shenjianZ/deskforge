import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Blocks, Search, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { features, type FeatureCategory } from "@/features/registry";
import { PageSection } from "@/components/layout/PageSection";
import { categories } from "@/features/data";

export function Home() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFeatures = useMemo(() => {
    let result = features;

    if (selectedCategory !== "all") {
      result = result.filter((feature) => feature.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (feature) =>
          feature.name.toLowerCase().includes(query) ||
          feature.description.toLowerCase().includes(query) ||
          feature.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [searchQuery, selectedCategory]);

  const categoryOverview = useMemo(
    () =>
      categories
        .filter((category) => category.id !== "all")
        .map((category) => ({
          ...category,
          count: features.filter((feature) => feature.category === category.id).length,
        }))
        .filter((category) => category.count > 0),
    []
  );

  const highlightedFeatures = useMemo(() => features.slice(0, 3), []);

  return (
    <PageSection className="max-w-[1600px] space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,244,236,0.86)_45%,rgba(236,246,255,0.82))] p-6 shadow-[0_30px_120px_rgba(15,23,42,0.12)] dark:border-white/8 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.84)_48%,rgba(17,24,39,0.92))] sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">DeskForge</h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  已实现模块的统一入口。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-slate-950/8 bg-white/70 p-4 dark:border-white/8 dark:bg-white/6">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">模块数</div>
                  <div className="mt-3 text-3xl font-semibold">{features.length}</div>
                  <div className="mt-1 text-sm text-muted-foreground">当前可用</div>
                </div>
                <div className="rounded-[1.4rem] border border-slate-950/8 bg-white/70 p-4 dark:border-white/8 dark:bg-white/6">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">搜索</div>
                  <div className="mt-3 text-xl font-semibold">命令入口</div>
                  <div className="mt-1 text-sm text-muted-foreground">快速定位模块</div>
                </div>
                <div className="rounded-[1.4rem] border border-slate-950/8 bg-white/70 p-4 dark:border-white/8 dark:bg-white/6">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">设置</div>
                  <div className="mt-3 text-xl font-semibold">偏好</div>
                  <div className="mt-1 text-sm text-muted-foreground">调整默认行为</div>
                </div>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
              <Button
                className="h-12 justify-between rounded-2xl bg-slate-950 px-5 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                onClick={() => navigate("/search")}
              >
                打开命令搜索
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-12 justify-between rounded-2xl border-border/60 bg-background/65 px-5 text-sm"
                onClick={() => navigate("/settings")}
              >
                调整工作台偏好
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-border/60 bg-background/72 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">入口</div>
              <div className="mt-1 text-xl font-semibold">常用模块</div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {highlightedFeatures.map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => navigate(feature.route)}
                className="w-full rounded-[1.4rem] border border-border/60 bg-background/70 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{feature.name}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[2rem] border border-border/60 bg-background/72 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 border-b border-border/60 pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">模块</h2>
              </div>
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="搜索工具、能力或标签"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 rounded-2xl border-border/60 bg-background/80 pl-11 shadow-inner"
                />
              </div>
            </div>
            <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Workspace Modules</div>
              <div className="text-sm text-muted-foreground">
                {filteredFeatures.length} / {features.length} 个模块显示中
              </div>
            </div>
          </div>

          <div className="mt-6">
            <FeatureGrid features={filteredFeatures} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-border/60 bg-background/72 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(234,179,8,0.14))] text-[rgb(234,88,12)] dark:text-[rgb(255,184,107)]">
                <Blocks className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-muted-foreground">分类</div>
                <div className="text-lg font-semibold">分类分布</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {categoryOverview.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-[1.2rem] border border-border/60 bg-background/70 px-4 py-3"
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">{category.count} 项</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </PageSection>
  );
}
