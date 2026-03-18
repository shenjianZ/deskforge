import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { Command, CornerDownLeft, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchResult } from "@/components/search/SearchResult";
import { features } from "@/features/registry";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(features, {
        keys: [
          { name: "name", weight: 2 },
          { name: "description", weight: 1.5 },
          { name: "tags", weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    []
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return fuse.search(query).map((result) => result.item);
  }, [fuse, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((previous) => (previous < searchResults.length - 1 ? previous + 1 : previous));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((previous) => (previous > 0 ? previous - 1 : 0));
      } else if (event.key === "Enter" && searchResults.length > 0) {
        event.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected?.implemented) {
          navigate(selected.route);
        }
      } else if (event.key === "Escape") {
        navigate("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, searchResults, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleResultClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <PageSection className="max-w-[1480px] space-y-6">
      <PageHeader title="搜索" backTo="/" />

      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(248,250,252,0.7),rgba(236,246,255,0.72))] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.1)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.82),rgba(17,24,39,0.92))] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-1">
            <div className="text-sm text-muted-foreground">搜索模块名称、描述和标签</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full border border-border/60 bg-background/72 px-3 py-1.5">
              模块 {features.length}
            </div>
            <div className="rounded-full border border-border/60 bg-background/72 px-3 py-1.5">
              结果 {searchResults.length}
            </div>
            <div className="rounded-full border border-border/60 bg-background/72 px-3 py-1.5">
              键盘优先
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-background/72 p-3 shadow-inner">
          <div className="relative">
            <Command className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索模块、标签或未来动作"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 rounded-[1rem] border-0 bg-transparent pl-12 text-base shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid items-start grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {searchResults.length > 0 ? (
            searchResults.map((feature, index) => (
              <SearchResult
                key={feature.id}
                feature={feature}
                isHighlighted={index === selectedIndex}
                onClick={() => handleResultClick(index)}
              />
            ))
          ) : query.trim() ? (
            <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-border/70 bg-background/60 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70">
                <SearchIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">没有找到匹配结果</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                尝试更换关键词，或者返回首页从分类浏览开始。
              </p>
              <Button className="mt-5 rounded-full px-5" variant="outline" onClick={() => navigate("/")}>
                返回首页
              </Button>
            </div>
          ) : (
            <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-border/70 bg-background/60 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70">
                <Command className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">输入关键词开始搜索</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                当前不会默认展示模块列表，输入名称、描述或标签后再显示结果。
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.8rem] border border-border/60 bg-background/72 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Controls</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
                <span>上下切换</span>
                <Badge variant="outline">↑ ↓</Badge>
              </div>
              <div className="flex items-center justify-between rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
                <span>打开模块</span>
                <Badge variant="outline">
                  <CornerDownLeft className="mr-1 h-3 w-3" />
                  Enter
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
                <span>回到概览</span>
                <Badge variant="outline">Esc</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-border/60 bg-background/72 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Next</div>
            <div className="mt-3 text-lg font-semibold">未来会扩展为动作搜索</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              后续命令面板接入后，这里不仅搜索页面，还会搜索运行动作、文档转换和 AI 助手命令。
            </p>
          </div>
        </aside>
      </section>
    </PageSection>
  );
}
