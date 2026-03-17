import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { features, type FeatureCategory } from "@/features/registry";
import { PageSection } from "@/components/layout/PageSection";

export function Home() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤和搜索功能
  const filteredFeatures = useMemo(() => {
    let result = features;

    // 分类过滤
    if (selectedCategory !== 'all') {
      result = result.filter(f => f.category === selectedCategory);
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  return (
    <PageSection className="space-y-6">
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit gap-2 px-3 py-1 text-xs tracking-[0.18em] uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Workspace
              </Badge>
              <div>
                <CardTitle className="text-3xl tracking-tight">高频工具，统一工作台</CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                  聚焦已实现的核心桌面工具，统一搜索、统一交互密度、统一结果面板，减少在功能之间切换的认知成本。
                </CardDescription>
              </div>
            </div>

            <Button variant="outline" className="gap-2" onClick={() => navigate('/search')}>
              打开全局搜索
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索已实现工具、能力或标签"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-border/70 bg-background pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>当前可用工具 {features.length}</span>
            <span>搜索结果 {filteredFeatures.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="pt-6">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </CardContent>
      </Card>

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">已实现功能</h2>
            <p className="text-sm text-muted-foreground">只保留当前可直接使用的工具入口。</p>
          </div>
          <Badge variant="secondary">{filteredFeatures.length} 项</Badge>
        </div>
        <FeatureGrid features={filteredFeatures} />
      </div>
    </PageSection>
  );
}
