import { Button } from "@/components/ui/button";
import { categories, type FeatureCategory } from "@/features/data";
import * as LucideIcons from "lucide-react";

const iconMap = LucideIcons as unknown as Record<string, typeof LucideIcons.AppWindow>;

interface CategoryFilterProps {
  selectedCategory: FeatureCategory | 'all';
  onCategoryChange: (category: FeatureCategory | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon] || LucideIcons.AppWindow;
        const isSelected = selectedCategory === category.id;

        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category.id as FeatureCategory | 'all')}
            className="flex-shrink-0"
          >
            <IconComponent className="w-4 h-4 mr-2" />
            {category.name}
          </Button>
        );
      })}
    </div>
  );
}
