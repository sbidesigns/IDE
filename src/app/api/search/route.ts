import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { SearchResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, num = 5 } = body;
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }
    
    const zai = await ZAI.create();
    
    const searchResult = await zai.functions.invoke('web_search', {
      query,
      num
    });
    
    const results: SearchResult[] = (searchResult as SearchResult[]).map((item: SearchResult) => ({
      url: item.url,
      name: item.name,
      snippet: item.snippet,
      host_name: item.host_name,
      rank: item.rank,
      date: item.date,
      favicon: item.favicon
    }));
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
