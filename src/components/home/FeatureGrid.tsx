import { Search } from "lucide-react";
import { FeatureCard } from "./FeatureCard";
import { Feature } from "@/features/types";

interface FeatureGridProps {
  features: Feature[];
}

export function FeatureGrid({ features }: FeatureGridProps) {
  if (features.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/70 bg-background/55 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight">没有匹配模块</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          尝试更换搜索词，或者切回更宽泛的分类视图。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  );
}
