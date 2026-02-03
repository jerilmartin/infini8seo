'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookmarkCheck, 
  ArrowLeft, 
  Search, 
  Star, 
  Trash2, 
  Download,
  Copy,
  Check,
  FileText,
  Calendar,
  Hash
} from 'lucide-react';
import { api } from '@/utils/api';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface SavedBlog {
  id: string;
  content_id: string;
  tags: string[];
  notes: string;
  is_favorite: boolean;
  saved_at: string;
  contents: {
    id: string;
    blog_title: string;
    persona_archetype: string;
    keywords: string[];
    blog_content: string;
    word_count: number;
    meta_description: string;
    slug: string;
    blog_type: string;
    created_at: string;
  };
}

export default function LibraryPage() {
  const router = useRouter();
  const [savedBlogs, setSavedBlogs] = useState<SavedBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBlog, setSelectedBlog] = useState<SavedBlog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedBlogs();
  }, [filterFavorites]);

  const fetchSavedBlogs = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filterFavorites) params.isFavorite = 'true';
      
      const res = await api.get('/api/library', { params });
      setSavedBlogs(res.data.savedBlogs || []);
      
      if (res.data.savedBlogs?.length > 0 && !selectedBlog) {
        setSelectedBlog(res.data.savedBlogs[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (contentId: string) => {
    if (!confirm('Remove this blog from your library?')) return;
    
    setDeletingId(contentId);
    try {
      await api.delete(`/api/library/unsave/${contentId}`);
      setSavedBlogs(prev => prev.filter(b => b.content_id !== contentId));
      
      if (selectedBlog?.content_id === contentId) {
        setSelectedBlog(savedBlogs[0] || null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove blog');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleFavorite = async (blog: SavedBlog) => {
    try {
      await api.patch(`/api/library/update/${blog.content_id}`, {
        isFavorite: !blog.is_favorite
      });
      
      setSavedBlogs(prev => prev.map(b => 
        b.content_id === blog.content_id 
          ? { ...b, is_favorite: !b.is_favorite }
          : b
      ));
      
      if (selectedBlog?.content_id === blog.content_id) {
        setSelectedBlog({ ...selectedBlog, is_favorite: !selectedBlog.is_favorite });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update favorite');
    }
  };

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(selectedBlog?.content_id || null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadMarkdown = (blog: SavedBlog) => {
    const blob = new Blob([blog.contents.blog_content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${blog.contents.slug || 'blog'}.md`;
    a.click();
  };

  const filteredBlogs = savedBlogs.filter(blog => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      blog.contents.blog_title.toLowerCase().includes(query) ||
      blog.contents.keywords.some(k => k.toLowerCase().includes(query)) ||
      blog.tags.some(t => t.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-5 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-primary" />
              <h1 className="text-base font-medium text-foreground">Content Library</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {filteredBlogs.length} saved {filteredBlogs.length === 1 ? 'blog' : 'blogs'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[350px] shrink-0 border-r border-border flex flex-col bg-secondary overflow-hidden">
          {/* Search & Filter */}
          <div className="px-4 py-3 border-b border-border shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                filterFavorites
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-current' : ''}`} />
              Favorites Only
            </button>
          </div>

          {/* Blog List */}
          <div className="flex-1 overflow-y-auto">
            {filteredBlogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <BookmarkCheck className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No blogs match your search' : 'No saved blogs yet'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {!searchQuery && 'Save blogs from your results to see them here'}
                </p>
              </div>
            ) : (
              filteredBlogs.map((blog) => (
                <button
                  key={blog.id}
                  onClick={() => setSelectedBlog(blog)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-all ${
                    selectedBlog?.id === blog.id
                      ? 'bg-card border-l-2 border-l-primary'
                      : 'hover:bg-card/50 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(blog);
                      }}
                      className="shrink-0 mt-0.5"
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          blog.is_favorite
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-relaxed line-clamp-2 ${
                        selectedBlog?.id === blog.id ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                      }`}>
                        {blog.contents.blog_title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          {blog.contents.word_count.toLocaleString()} words
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(blog.saved_at).toLocaleDateString()}
                        </span>
                      </div>
                      {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {blog.tags.slice(0, 2).map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] text-secondary-foreground bg-secondary/50 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Reading Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-card">
          {selectedBlog ? (
            <>
              {/* Article Header */}
              <div className="shrink-0 border-b border-border px-10 py-5 bg-card">
                <div className="max-w-[950px]">
                  <h2 className="text-xl font-bold text-foreground leading-tight mb-2">
                    {selectedBlog.contents.blog_title}
                  </h2>
                  <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
                    {selectedBlog.contents.meta_description}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => copyToClipboard(selectedBlog.contents.blog_content)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-secondary-foreground transition-colors"
                    >
                      {copiedId === selectedBlog.content_id ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy</>
                      )}
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => downloadMarkdown(selectedBlog)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-secondary-foreground transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => handleUnsave(selectedBlog.content_id)}
                      disabled={deletingId === selectedBlog.content_id}
                      className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                    >
                      {deletingId === selectedBlog.content_id ? (
                        <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Removing...</>
                      ) : (
                        <><Trash2 className="w-3.5 h-3.5" /> Remove</>
                      )}
                    </button>
                    {selectedBlog.contents.keywords.length > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedBlog.contents.keywords.slice(0, 4).map((k, i) => (
                            <span key={i} className="text-[12px] text-secondary-foreground bg-secondary/30 border border-border/20 px-2.5 py-1 rounded-md font-medium">
                              {k}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Article Content */}
              <div className="flex-1 overflow-y-auto px-10 py-8">
                <article className="article-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {selectedBlog.contents.blog_content}
                  </ReactMarkdown>
                </article>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">Select a blog to preview</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
