import { Badge } from "@/components/ui/badge";
import { Feature } from "@/features/types";
import * as LucideIcons from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const iconMap = LucideIcons as unknown as Record<string, typeof LucideIcons.AppWindow>;

interface SearchResultProps {
  feature: Feature;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export function SearchResult({ feature, isHighlighted, onClick }: SearchResultProps) {
  const navigate = useNavigate();
  const IconComponent = iconMap[feature.icon] || LucideIcons.AppWindow;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }

    if (feature.implemented) {
      navigate(feature.route);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex w-full self-start flex-col overflow-hidden rounded-[1.75rem] border p-5 text-left transition duration-300",
        isHighlighted
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] dark:border-white dark:bg-white dark:text-slate-950"
          : "border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.75))] shadow-[0_20px_60px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_26px_90px_rgba(15,23,42,0.14)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.64))]"
      )}
      disabled={!feature.implemented}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(249,115,22,0.55),transparent)] opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-[1.25rem]",
            isHighlighted
              ? "bg-white/12 text-white dark:bg-slate-100 dark:text-slate-950"
              : "bg-[linear-gradient(135deg,rgba(249,115,22,0.92),rgba(14,165,233,0.76))] text-white shadow-[0_16px_32px_rgba(249,115,22,0.2)]"
          )}
        >
          <IconComponent className="h-6 w-6" />
        </div>
        <ArrowUpRight
          className={cn(
            "mt-1 h-4 w-4 transition",
            isHighlighted
              ? "text-white/55 dark:text-slate-500"
              : "text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          )}
        />
      </div>

      <div className="mt-6 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">{feature.name}</h3>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                isHighlighted
                  ? "border-white/14 bg-white/8 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-700"
                  : feature.implemented
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/60 text-muted-foreground"
              )}
            >
              {feature.implemented ? "Live" : "Queued"}
            </Badge>
          </div>
          <p
            className={cn(
              "line-clamp-2 text-sm leading-6",
              isHighlighted ? "text-white/72 dark:text-slate-600" : "text-muted-foreground"
            )}
          >
            {feature.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {feature.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                isHighlighted
                  ? "border-white/14 bg-white/8 text-white/72 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-600"
                  : "border-border/60 bg-background/75 text-muted-foreground"
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
