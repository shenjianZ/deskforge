import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Feature } from "@/features/types";
import * as LucideIcons from "lucide-react";
import { useNavigate } from "react-router-dom";

const iconMap = LucideIcons as unknown as Record<string, typeof LucideIcons.AppWindow>;

interface SearchResultProps {
  feature: Feature;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export function SearchResult({ feature, isHighlighted, onClick }: SearchResultProps) {
  const navigate = useNavigate();

  // 动态获取图标组件
  const IconComponent = iconMap[feature.icon] || LucideIcons.AppWindow;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (feature.implemented) {
      navigate(feature.route);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isHighlighted
          ? 'bg-primary/10 border-primary'
          : 'hover:bg-muted/50'
      } ${!feature.implemented ? 'opacity-60' : ''}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-white" />
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-base">{feature.name}</h3>
              <Badge variant={feature.implemented ? "default" : "secondary"}>
                {feature.implemented ? "可用" : "开发中"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {feature.description}
            </p>

            {/* 标签和快捷键 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {feature.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {feature.shortcut && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-shrink-0">
                  {feature.shortcut}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
