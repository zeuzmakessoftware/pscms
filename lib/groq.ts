import { Groq } from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY environment variable');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export type GeneratedContent = {
  title: string;
  content: string;
  keywords: string[];
};

export async function generateContent(slug: string, prompt: string): Promise<GeneratedContent> {
  try {
    // Format the slug for better title generation
    const formattedSlug = slug.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const systemPrompt = `You are a professional content writer specializing in SEO-optimized articles.
      Create a comprehensive article about "${formattedSlug}" based on the following instructions: ${prompt}.
      
      Respond with a JSON object that strictly follows this format:
      {
        "title": "Your SEO-optimized title here",
        "content": "Your markdown-formatted content here with proper headings, paragraphs, and formatting",
        "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
      }
      
      The content should be well-structured with proper markdown headings, paragraphs, and formatting.
      The keywords should be relevant for SEO purposes and limited to exactly 5 items.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No content generated from Groq');
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(responseContent);
    
    return {
      title: parsedResponse.title || formattedSlug,
      content: parsedResponse.content || '',
      keywords: parsedResponse.keywords || []
    };
  } catch (error) {
    console.error('Error generating content with Groq:', error);
    throw error;
  }
}
