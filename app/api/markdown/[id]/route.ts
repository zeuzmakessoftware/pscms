import { NextRequest, NextResponse } from 'next/server';
import { getPostById } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const searchParams = request.nextUrl.searchParams;
    const markdownOnly = searchParams.get('markdownOnly') === 'true';
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    const post = await getPostById(id);
    
    if (markdownOnly) {
      return new NextResponse(post.content, {
        headers: {
          'Content-Type': 'text/markdown',
        },
      });
    }
    
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching markdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markdown' },
      { status: 500 }
    );
  }
}
