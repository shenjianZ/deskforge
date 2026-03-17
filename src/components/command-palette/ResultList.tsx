import { ResultItem } from './ResultItem';
import type { SearchResult } from './CommandPalette';

interface ResultListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ResultList({ results, selectedIndex, onSelect }: ResultListProps) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>输入搜索内容开始...</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {results.map((result, index) => (
        <ResultItem
          key={result.id}
          result={result}
          isSelected={index === selectedIndex}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
