import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Feature } from "@/features/types";
import * as LucideIcons from "lucide-react";
import { useNavigate } from "react-router-dom";

const iconMap = LucideIcons as unknown as Record<string, typeof LucideIcons.AppWindow>;

interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const navigate = useNavigate();

  // 动态获取图标组件
  const IconComponent = iconMap[feature.icon] || LucideIcons.AppWindow;

  const handleClick = () => {
    if (feature.implemented) {
      navigate(feature.route);
    }
  };

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 cursor-pointer ${
        !feature.implemented ? 'opacity-60' : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          {feature.name}
        </CardTitle>
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <IconComponent className="w-5 h-5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm mb-3 line-clamp-2">
          {feature.description}
        </CardDescription>
        <div className="flex items-center justify-between">
          <Badge variant={feature.implemented ? "default" : "secondary"}>
            {feature.implemented ? "已实现" : "开发中"}
          </Badge>
          {feature.shortcut && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {feature.shortcut}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
