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
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
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
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: theme === 'dark' ? '#000000' : '#FFFEF9' }}
      >
        {/* Dark mode golden blur */}
        {theme === 'dark' && (
          <div 
            className="absolute pointer-events-none z-0"
            style={{
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'linear-gradient(to bottom right, transparent 0%, transparent 20%, rgba(255, 192, 4, 0.15) 35%, rgba(255, 192, 4, 0.25) 50%, rgba(255, 192, 4, 0.15) 65%, transparent 80%, transparent 100%)',
              filter: 'blur(500px)'
            }}
          />
        )}
        {/* Light mode golden blur */}
        {theme === 'light' && (
          <div 
            className="absolute pointer-events-none z-0"
            style={{
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'linear-gradient(to bottom right, transparent 0%, transparent 25%, rgba(171, 128, 0, 0.08) 40%, rgba(171, 128, 0, 0.12) 50%, rgba(171, 128, 0, 0.08) 60%, transparent 75%, transparent 100%)',
              filter: 'blur(350px)'
            }}
          />
        )}
        
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#FFC004]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#FFC004] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
            Loading library...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen text-foreground flex flex-col overflow-hidden relative" style={{
      background: theme === 'dark' ? '#000000' : '#FFFEF9',
      color: theme === 'dark' ? '#ffffff' : '#000000'
    }}>
      {/* Dark mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'dark' && (
        <div 
          className="absolute pointer-events-none z-0"
          style={{
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(to bottom right, transparent 0%, transparent 20%, rgba(255, 192, 4, 0.15) 35%, rgba(255, 192, 4, 0.25) 50%, rgba(255, 192, 4, 0.15) 65%, transparent 80%, transparent 100%)',
            filter: 'blur(500px)'
          }}
        />
      )}
      {/* Light mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'light' && (
        <div 
          className="absolute pointer-events-none z-0"
          style={{
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(to bottom right, transparent 0%, transparent 25%, rgba(171, 128, 0, 0.08) 40%, rgba(171, 128, 0, 0.12) 50%, rgba(171, 128, 0, 0.08) 60%, transparent 75%, transparent 100%)',
            filter: 'blur(350px)'
          }}
        />
      )}
      
      {/* Header */}
      <header className="shrink-0 bg-transparent relative z-10">
        <div className="flex items-center justify-between px-3 sm:px-5 py-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-medium">
                <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>infini8 </span>
                <span style={{ color: '#FFC004' }}>SEO</span>
              </h1>
              <button
                onClick={toggleTheme}
                className="hover:opacity-80 transition-opacity"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <img 
                  src={theme === 'dark' ? '/assets/button.svg' : '/assets/button1.svg'} 
                  alt="Theme toggle"
                  className="w-8 h-4"
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Sidebar - Article List */}
        <aside className="w-full md:w-[350px] shrink-0 md:border-r border-border flex flex-col bg-transparent overflow-hidden max-h-[40vh] md:max-h-none">
          {/* Search & Filter */}
          <div className="px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  filterFavorites
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                }`}
                title="Favorites Only"
              >
                <Star className={`w-4 h-4 ${filterFavorites ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Saved Blogs Count */}
          <div className="px-4 sm:px-5 py-3 shrink-0 border-b border-border">
            <span className="text-sm font-normal" style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>
              {filteredBlogs.length} Saved {filteredBlogs.length === 1 ? 'Blog' : 'Blogs'}
            </span>
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
                  className={`w-full text-left px-5 py-4 transition-all relative ${
                    selectedBlog?.id === blog.id
                      ? 'border-l-2 border-l-[#FFC004]'
                      : 'hover:bg-white/5 border-l-2 border-l-transparent'
                  }`}
                  style={selectedBlog?.id === blog.id && theme === 'light' ? {
                    background: 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)'
                  } : selectedBlog?.id === blog.id ? {
                    background: 'linear-gradient(to right, rgb(41, 32, 5) 0%, rgb(0, 0, 0) 100%)'
                  } : undefined}
                >
                  <div className="flex items-start gap-4">
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
                      <p className={`text-[14px] leading-relaxed line-clamp-2 ${
                        selectedBlog?.id === blog.id ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                      }`}>
                        {blog.contents.blog_title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                        {blog.contents.word_count.toLocaleString()} words
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Reading Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {/* Content Library Header */}
          <div className="shrink-0 px-4 sm:px-10 py-3 border-b border-border flex items-center justify-end gap-2">
            <BookmarkCheck className="w-4 h-4" style={{ color: theme === 'dark' ? '#888888' : '#666666' }} />
            <h2 className="text-sm font-normal" style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>
              Content Library
            </h2>
          </div>
          
          {selectedBlog ? (
            <>
              {/* Article Header */}
              <div className="shrink-0 px-4 sm:px-10 py-4 bg-transparent">
                <div className="w-full">
                  <h2 className="text-xl font-bold text-foreground leading-tight mb-2">
                    {selectedBlog.contents.blog_title}
                  </h2>
                  <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
                    {selectedBlog.contents.meta_description}
                  </p>
                  <div className="flex items-start justify-between gap-4 w-full">
                    <div className="flex items-center gap-4 flex-wrap">
                      <button
                        onClick={() => copyToClipboard(selectedBlog.contents.blog_content)}
                        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-all px-3 py-1.5 rounded-lg"
                        style={theme === 'light' ? {
                          background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                          color: '#000000'
                        } : {
                          background: '#241A06',
                          color: '#FFFFFF'
                        }}
                      >
                        {copiedId === selectedBlog.content_id ? (
                          <><Check className="w-3.5 h-3.5" /> Copied</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Copy</>
                        )}
                      </button>
                      <button
                        onClick={() => downloadMarkdown(selectedBlog)}
                        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-all px-3 py-1.5 rounded-lg"
                        style={theme === 'light' ? {
                          background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                          color: '#000000'
                        } : {
                          background: '#241A06',
                          color: '#FFFFFF'
                        }}
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={() => handleUnsave(selectedBlog.content_id)}
                        disabled={deletingId === selectedBlog.content_id}
                        className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 px-3 py-1.5"
                      >
                        {deletingId === selectedBlog.content_id ? (
                          <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Removing...</>
                        ) : (
                          <><Trash2 className="w-3.5 h-3.5" /> Remove</>
                        )}
                      </button>
                    </div>
                    {selectedBlog.contents.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end ml-auto">
                        {selectedBlog.contents.keywords.slice(0, 4).map((k, i) => (
                          <span 
                            key={i} 
                            className="text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={theme === 'light' ? {
                              background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                              color: '#000000'
                            } : {
                              background: '#241A06',
                              color: '#FFFFFF'
                            }}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Article Content */}
              <div 
                className="flex-1 overflow-y-auto px-4 sm:px-10 py-8"
                style={{ width: '100%', height: '100%' }}
              >
                <article className="article-content" style={{ width: '100%', maxWidth: 'none' }}>
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
