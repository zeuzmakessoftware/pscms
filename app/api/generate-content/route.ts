import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { slug, prompt } = await request.json();
    
    if (!slug || !prompt) {
      return NextResponse.json(
        { error: 'Slug and prompt are required' },
        { status: 400 }
      );
    }
    
    const generatedContent = await generateContent(slug, prompt);
    
    return NextResponse.json(generatedContent);
  } catch (error) {
    console.error('Error in generate-content API:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
