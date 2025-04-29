import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export type PostRecord = {
  id: string;
  title: string;
  slug: string;
  content: string;
  keywords: string[];
  created_at: string;
  word_count: number;
  keyword_density: Record<string, number>;
  system_prompt?: string;
};

export async function getPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
  
  return data as PostRecord[];
}

export async function createPost(post: Omit<PostRecord, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('posts')
    .insert([
      {
        title: post.title,
        slug: post.slug,
        content: post.content,
        keywords: post.keywords,
        word_count: post.word_count,
        keyword_density: post.keyword_density,
        system_prompt: post.system_prompt
      }
    ])
    .select();
  
  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }
  
  return data[0] as PostRecord;
}

export async function deletePost(id: string) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
  
  return true;
}

export async function getPostById(id: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
  
  return data as PostRecord;
}

export async function updatePost(id: string, updates: Partial<Omit<PostRecord, 'id' | 'created_at'>>) {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error updating post:', error);
    throw error;
  }
  
  return data[0] as PostRecord;
}
