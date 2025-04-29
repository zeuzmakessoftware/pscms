import { NextRequest, NextResponse } from 'next/server';
import { getPosts } from '@/lib/supabase';

export async function GET() {
  try {
    const posts = await getPosts();
    
    const postsMetadata = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      created_at: post.created_at,
      word_count: post.word_count,
      keywords: post.keywords,
      markdown_url: `/api/markdown/${post.id}`
    }));
    
    return NextResponse.json(postsMetadata);
  } catch (error) {
    console.error('Error fetching posts metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts metadata' },
      { status: 500 }
    );
  }
}
