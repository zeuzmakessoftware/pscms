'use client'

import { useState, useEffect } from 'react'
import { marked } from 'marked'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { PostRecord } from '@/lib/supabase'

type Post = {
  id: string
  title: string
  slug: string
  content: string
  keywords: string[]
  createdAt: string
  wordCount: number
  keywordDensity: Record<string, number>
  systemPrompt?: string
}

const convertPostRecord = (record: PostRecord): Post => ({
  id: record.id,
  title: record.title,
  slug: record.slug,
  content: record.content,
  keywords: record.keywords,
  createdAt: record.created_at,
  wordCount: record.word_count,
  keywordDensity: record.keyword_density,
  systemPrompt: record.system_prompt
})

const generateAIContent = async (slug: string, prompt: string): Promise<{ title: string; content: string; keywords: string[] }> => {
  const response = await fetch('/api/generate-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug, prompt })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to generate content')
  }
  
  return response.json()
}

const markdownStyles = `
  /* Heading styles */
  .prose h1 { font-size: 2.25rem; margin-top: 2.5rem; margin-bottom: 1.5rem; }
  .prose h2 { font-size: 1.875rem; margin-top: 2rem; margin-bottom: 1.25rem; }
  .prose h3 { font-size: 1.5rem; margin-top: 1.75rem; margin-bottom: 1rem; }
  .prose h4 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
  .prose h5 { font-size: 1.125rem; margin-top: 1.25rem; margin-bottom: 0.5rem; }
  .prose h6 { font-size: 1rem; margin-top: 1rem; margin-bottom: 0.5rem; }
  
  .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
    position: relative;
    scroll-margin-top: 4rem;
    line-height: 1.3;
    font-weight: 700;
    letter-spacing: -0.025em;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(100, 116, 139, 0.2);
  }
  
  .prose h1::before, .prose h2::before, .prose h3::before,
  .prose h4::before, .prose h5::before, .prose h6::before {
    content: '';
    display: block;
    height: 4rem;
    margin-top: -4rem;
    visibility: hidden;
    pointer-events: none;
  }
  
  .prose h1 + p,
  .prose h2 + p,
  .prose h3 + p,
  .prose h4 + p,
  .prose h5 + p,
  .prose h6 + p {
    margin-top: 0.75rem;
  }
  
  /* Improve spacing between sections */
  .prose > * + * {
    margin-top: 1.25rem;
  }
  
  /* Better list styling */
  .prose ul, .prose ol {
    padding-left: 1.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  
  .prose li {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  /* Better blockquote styling */
  .prose blockquote {
    border-left: 3px solid #64748b;
    padding-left: 1rem;
    font-style: italic;
    color: #64748b;
    margin: 1.5rem 0;
  }
  
  /* Better code block styling */
  .prose pre {
    background-color: #1e293b;
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }
  
  .prose code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875em;
    padding: 0.2em 0.4em;
    border-radius: 0.25rem;
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .dark .prose code {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Better table styling */
  .prose table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
  }
  
  .prose th {
    background-color: rgba(0, 0, 0, 0.05);
    font-weight: 600;
    text-align: left;
    padding: 0.75rem;
  }
  
  .dark .prose th {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .prose td {
    padding: 0.75rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .dark .prose td {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export default function CMS() {
  const [posts, setPosts] = useState<Post[]>([])
  const [slug, setSlug] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [activeTab, setActiveTab] = useState('create')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<(Omit<Post, 'id' | 'createdAt'>) | null>(null)
  const [viewingPostId, setViewingPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingGeneratedContent, setIsEditingGeneratedContent] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/posts')
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        const data = await response.json()
        setPosts(data.map(convertPostRecord))
      } catch (error) {
        console.error('Error loading posts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPosts()
  }, [])

  const savePost = async (post: Omit<Post, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          slug: post.slug,
          content: post.content,
          keywords: post.keywords,
          word_count: post.wordCount,
          keyword_density: post.keywordDensity,
          system_prompt: post.systemPrompt
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save post')
      }
      
      const savedPost = await response.json()
      return convertPostRecord(savedPost)
    } catch (error) {
      console.error('Error saving post:', error)
      throw error
    }
  }

  const calculateStats = (text: string, keywordsList: string[]) => {
    const words = text.toLowerCase().split(/\s+/)
    const wordCount = words.length
    
    const keywordDensity: Record<string, number> = {}
    keywordsList.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      const count = words.filter(word => word === keywordLower).length
      keywordDensity[keyword] = (count / wordCount) * 100
    })

    return { wordCount, keywordDensity }
  }

  const handleGeneratePost = async () => {
    if (!slug || !systemPrompt) return

    setIsGenerating(true)
    try {
      const { title, content, keywords } = await generateAIContent(slug, systemPrompt)
      
      const { wordCount, keywordDensity } = calculateStats(content, keywords)

      setGeneratedPost({
        title,
        slug,
        content,
        keywords,
        wordCount,
        keywordDensity,
        systemPrompt
      })
    } catch (error) {
      console.error('Error generating post:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditGeneratedContent = () => {
    if (!generatedPost) return
    
    setIsEditingGeneratedContent(true)
    setEditContent(generatedPost.content)
  }

  const handleSaveGeneratedContent = () => {
    if (!generatedPost || !editContent) return
    
    const { wordCount, keywordDensity } = calculateStats(editContent, generatedPost.keywords)
    
    setGeneratedPost({
      ...generatedPost,
      content: editContent,
      wordCount,
      keywordDensity
    })
    
    setIsEditingGeneratedContent(false)
    setEditContent('')
  }

  const handleCancelGeneratedEdit = () => {
    setIsEditingGeneratedContent(false)
    setEditContent('')
  }

  const handleCreatePost = async () => {
    if (!generatedPost) return

    try {
      const newPost = await savePost(generatedPost)
      setPosts([newPost, ...posts])
      
      setSlug('')
      setSystemPrompt('')
      setGeneratedPost(null)
      setActiveTab('view')
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const handleDeletePost = async (id: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete post')
      }
      
      setPosts(posts.filter(post => post.id !== id))
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleUpdatePost = async (id: string) => {
    if (!editContent) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update post')
      }
      
      const updatedPost = await response.json()
      
      setPosts(posts.map(post => 
        post.id === id ? convertPostRecord(updatedPost) : post
      ))
      
      setEditingPostId(null)
      setEditContent('')
    } catch (error) {
      console.error('Error updating post:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEditing = (post: Post) => {
    setEditingPostId(post.id)
    setEditContent(post.content)
    setViewingPostId(null)
  }

  const handleCancelEdit = () => {
    setEditingPostId(null)
    setEditContent('')
  }

  return (
    <div className="container mx-auto py-8">
      <style jsx global>{markdownStyles}</style>
      <h1 className="text-3xl font-bold mb-8 tracking-tight">PSCMS Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="cursor-pointer">Create Post</TabsTrigger>
          <TabsTrigger value="view" className="cursor-pointer">View Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>PSCMS Example</CardTitle>
              <CardDescription>Provide a slug and instructions to generate SEO-optimized content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL-friendly)</Label>
                <Input
                  id="slug"
                  placeholder="e.g., nextjs-seo-guide"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">System Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., Write a comprehensive guide about SEO in Next.js covering metadata, sitemaps, and canonical URLs"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button 
                onClick={handleGeneratePost}
                disabled={!slug || !systemPrompt || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : 'Generate Post'}
              </Button>
              {generatedPost && (
                <Button 
                  variant="secondary" 
                  onClick={() => setGeneratedPost(null)}
                >
                  Clear
                </Button>
              )}
            </CardFooter>
          </Card>

          {generatedPost && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Generated Post Preview</CardTitle>
                <CardDescription>Review and edit before publishing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Title: {generatedPost.title}</h3>
                  <p className="text-sm text-muted-foreground">Slug: {generatedPost.slug}</p>
                </div>
                {isEditingGeneratedContent ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={15}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveGeneratedContent}>
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelGeneratedEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="prose dark:prose-invert max-w-none mb-6 group" 
                      dangerouslySetInnerHTML={{ __html: marked(generatedPost.content) }}
                    />
                    <div className="space-y-2">
                      <h3 className="font-medium">Keywords:</h3>
                      <div className="flex flex-wrap gap-2">
                        {generatedPost.keywords.map(keyword => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button onClick={handleCreatePost}>Publish Post</Button>
                {!isEditingGeneratedContent && (
                  <Button variant="outline" onClick={handleEditGeneratedContent}>Edit Content</Button>
                )}
                <Button 
                  variant="secondary" 
                  onClick={() => setGeneratedPost(null)}
                >
                  Clear
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="view">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <p>No posts yet. Generate your first post!</p>
          ) : (
            <div className="mt-4 space-y-6">
              {posts.map(post => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold">{post.title}</CardTitle>
                        <CardDescription>
                          {new Date(post.createdAt).toLocaleDateString()} • 
                          {post.wordCount} words • 
                          slug: {post.slug}
                        </CardDescription>
                        {post.systemPrompt && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">AI Prompt:</p>
                            <p className="text-muted-foreground">{post.systemPrompt}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleStartEditing(post)}
                          disabled={editingPostId === post.id}
                        >
                          Edit
                        </Button>
                        <Dialog open={!!deletingPostId} onOpenChange={(open) => !open && setDeletingPostId(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="cursor-pointer dark:bg-red-600 dark:hover:bg-red-700 dark:text-white"
                              onClick={() => setDeletingPostId(post.id)}
                              disabled={editingPostId === post.id}
                            >
                              Delete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Deletion</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete “{post.title}”? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="space-x-2">
                              <Button
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setDeletingPostId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={async () => {
                                  if (deletingPostId) {
                                    await handleDeletePost(deletingPostId)
                                    setDeletingPostId(null)
                                  }
                                }}
                              >
                                Yes, delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline" 
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => window.open(`/api/markdown/${post.id}?markdownOnly=true`, '_blank')}
                          disabled={editingPostId === post.id}
                        >
                          View Raw
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingPostId === post.id ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={15}
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleUpdatePost(post.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : 'Save Changes'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : viewingPostId === post.id ? (
                      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                        <pre className="whitespace-pre-wrap text-sm">{post.content}</pre>
                      </div>
                    ) : (
                      <div 
                        className="prose dark:prose-invert max-w-none group" 
                        dangerouslySetInnerHTML={{ __html: marked(post.content) }}
                      />
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col items-start gap-4">
                    <div className="w-full">
                      <h3 className="font-medium mb-2">Keyword Statistics:</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Density</TableHead>
                            <TableHead>Occurrences</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(post.keywordDensity).map(([keyword, density]) => (
                            <TableRow key={keyword}>
                              <TableCell>{keyword}</TableCell>
                              <TableCell>{density.toFixed(2)}%</TableCell>
                              <TableCell>
                                {Math.round((density / 100) * post.wordCount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}