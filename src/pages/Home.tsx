import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { features, type FeatureCategory } from "@/features/registry";
import { categories } from "@/features/data";
import { PageSection } from "@/components/layout/PageSection";

export function Home() {
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

  const moduleStats = useMemo(() => {
    const categoryCount = categories.filter((category) => category.id !== "all").length;

    return [
      { label: "总模块", value: features.length.toString() },
      { label: "当前显示", value: filteredFeatures.length.toString() },
      { label: "分类", value: categoryCount.toString() },
    ];
  }, [filteredFeatures.length]);

  return (
    <PageSection className="max-w-[1600px]">
      <section>
        <div className="rounded-[2rem] border border-border/60 bg-background/72 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 border-b border-border/60 pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight">模块</h2>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {moduleStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1rem] border border-border/60 bg-background/75 px-3 py-2.5 text-center"
                    >
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {stat.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>
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
      </section>
    </PageSection>
  );
}
