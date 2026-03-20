import { Button } from "@/components/ui/button";
import { categories, type FeatureCategory } from "@/features/data";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { interactiveSelectedClassName } from "@/lib/themeClasses";

const iconMap = LucideIcons as unknown as Record<string, typeof LucideIcons.AppWindow>;

interface CategoryFilterProps {
  selectedCategory: FeatureCategory | "all";
  onCategoryChange: (category: FeatureCategory | "all") => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="scrollbar-horizontal flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon] || LucideIcons.AppWindow;
        const isSelected = selectedCategory === category.id;

        return (
          <Button
            key={category.id}
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(category.id as FeatureCategory | "all")}
            className={cn(
              "h-10 flex-shrink-0 rounded-full border px-4 text-sm transition",
              isSelected
                ? interactiveSelectedClassName
                : "border-border/60 bg-background/75 text-muted-foreground hover:border-border hover:bg-accent/80 hover:text-foreground"
            )}
          >
            <IconComponent className="mr-2 h-4 w-4" />
            {category.name}
          </Button>
        );
      })}
    </div>
  );
}
