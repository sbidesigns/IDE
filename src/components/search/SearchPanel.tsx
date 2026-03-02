'use client';

import { useState, useCallback } from 'react';
import { useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ExternalLink,
  Loader2,
  X,
  Globe,
  Plus,
  Check,
  Trash2,
} from 'lucide-react';
import type { Source } from '@/types';
import { toast } from 'sonner';

const MAX_CONTEXT_RESULTS = 50;

export function SearchPanel() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    contextResults,
    addToContext,
    removeFromContext,
    clearContext,
    isSearching,
    setSearching,
    clearSearchResults,
  } = useAgentStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = useCallback(async () => {
    if (!localQuery.trim() || isSearching) return;

    setSearchQuery(localQuery);
    setSearching(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: localQuery, num: 10 }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
        toast.success(`Found ${data.data.length} results`);
      } else {
        toast.error(data.error || 'Search failed');
      }
    } catch {
      toast.error('Search failed');
    }
    setSearching(false);
  }, [localQuery, isSearching, setSearchQuery, setSearchResults, setSearching]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const isResultInContext = (url: string) => {
    return contextResults.some(r => r.url === url);
  };

  const handleToggleContext = (result: Source) => {
    if (isResultInContext(result.url)) {
      removeFromContext(result.url);
    } else {
      if (contextResults.length >= MAX_CONTEXT_RESULTS) {
        toast.error(`Maximum ${MAX_CONTEXT_RESULTS} results in context`);
        return;
      }
      addToContext(result);
      toast.success('Added to context');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold mb-1">Manual Web Search</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Search the web, then add results to AI context
        </p>
        
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter search query..."
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching || !localQuery.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Context Results (Added to context) */}
      {contextResults.length > 0 && (
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="default" className="text-xs gap-1">
              <Check className="h-3 w-3" />
              {contextResults.length}/{MAX_CONTEXT_RESULTS} in context
            </Badge>
            <Button size="sm" variant="ghost" onClick={clearContext} className="h-6 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {contextResults.map((result) => (
              <div key={result.url} className="flex items-center gap-2 text-xs bg-background rounded p-1.5">
                <span className="truncate flex-1 text-muted-foreground">{result.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFromContext(result.url)}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-3">
        {searchResults.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Search the web</p>
            <p className="text-xs mt-1">Click + to add results to AI context</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {searchResults.length} results found
              </span>
              <Button size="sm" variant="ghost" onClick={clearSearchResults} className="h-6 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear results
              </Button>
            </div>
            
            {searchResults.map((result, idx) => (
              <SearchResultCard
                key={result.url}
                result={result}
                index={idx}
                isInContext={isResultInContext(result.url)}
                onToggleContext={() => handleToggleContext(result)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Results with AI responses use current web data, not outdated training data.
          Add relevant results to context for better accuracy.
        </p>
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  result: Source;
  index: number;
  isInContext: boolean;
  onToggleContext: () => void;
}

function SearchResultCard({ result, index, isInContext, onToggleContext }: SearchResultCardProps) {
  return (
    <div className={`p-3 border rounded-lg transition-colors ${
      isInContext 
        ? 'bg-primary/5 border-primary/30' 
        : 'bg-card border-border hover:border-primary/30'
    }`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm hover:text-primary line-clamp-2 flex items-start gap-1"
          >
            {result.title}
            <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
          </a>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {result.snippet}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {result.favicon && (
              <img
                src={result.favicon}
                alt=""
                className="w-4 h-4 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              {result.url}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant={isInContext ? "default" : "outline"}
          onClick={onToggleContext}
          className="h-7 w-7 p-0 flex-shrink-0"
          title={isInContext ? "Remove from context" : "Add to context"}
        >
          {isInContext ? (
            <Check className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
