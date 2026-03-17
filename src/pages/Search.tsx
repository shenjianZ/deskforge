import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Keyboard, Search as SearchIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchResult } from "@/components/search/SearchResult";
import { features } from "@/features/registry";
import { PageSection } from "@/components/layout/PageSection";

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 使用 Fuse.js 进行模糊搜索
  const fuse = useMemo(() => {
    return new Fuse(features, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1.5 },
        { name: 'tags', weight: 1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, []);

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return features;
    }
    return fuse.search(query).map(result => result.item);
  }, [query, fuse]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected.implemented) {
          navigate(selected.route);
        }
      } else if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex, navigate]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleResultClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <PageSection className="space-y-6">
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">功能搜索</CardTitle>
          <CardDescription>搜索当前已实现功能，支持键盘导航与快速打开。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Keyboard className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="输入关键词搜索功能"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-14 rounded-2xl border-border/70 bg-background pl-12 text-lg"
              autoFocus
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {query.trim() ? (
              <>
                找到 <span className="font-semibold text-foreground">{searchResults.length}</span> 个匹配结果
              </>
            ) : (
              <>
                共 <span className="font-semibold text-foreground">{features.length}</span> 个功能
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
          {searchResults.length > 0 ? (
            searchResults.map((feature, index) => (
              <SearchResult
                key={feature.id}
                feature={feature}
                isHighlighted={index === selectedIndex}
                onClick={() => handleResultClick(index)}
              />
            ))
          ) : (
            <Card className="border-border/60 bg-card/85 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <SearchIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">没有找到匹配结果</h3>
                <p className="text-sm text-muted-foreground">尝试更换关键词或直接返回首页筛选。</p>
                <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
                  返回首页
                </Button>
              </CardContent>
            </Card>
          )}
      </div>

      {searchResults.length > 0 && (
          <Card className="border-border/60 bg-card/75 shadow-sm">
            <CardContent className="p-3">
              <p className="text-center text-xs text-muted-foreground">
              <span className="font-semibold">↑↓</span> 导航 •
              <span className="font-semibold ml-2">Enter</span> 打开 •
              <span className="font-semibold ml-2">Esc</span> 返回
              </p>
            </CardContent>
          </Card>
      )}
    </PageSection>
  );
}
