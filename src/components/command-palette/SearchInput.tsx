import { Search } from 'lucide-react';
import { forwardRef, useEffect, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = '搜索...' }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={(node) => {
            inputRef.current = node;

            if (!ref) {
              return;
            }

            if (typeof ref === 'function') {
              ref(node);
              return;
            }

            ref.current = node;
          }}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          autoComplete="off"
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
